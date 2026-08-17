import { workoutSessionRepository } from "../repositories/workoutSession.repository";
import { progressionService, ProgressionResponse } from "./progression.service";

export interface AnalyticsSummary {
  totalWorkouts: number;
  workoutsThisWeek: number;
  currentStreak: number;
  totalVolume: number;
  totalExercises: number;
}

export interface RecentWorkout {
  id: string;
  workoutName: string | null;
  completedAt: Date;
  exerciseCount: number;
  totalVolume: number;
}

export interface DashboardAnalytics {
  summary: AnalyticsSummary;
  recentWorkouts: RecentWorkout[];
  progressionRecommendation: ProgressionResponse | null;
}

export interface ExerciseProgressPoint {
  date: Date;
  weight: number;
  totalReps: number;
  volume: number;
}

export interface ExerciseProgress {
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  totalVolume: number;
  sessions: ExerciseProgressPoint[];
}

export class AnalyticsService {
  private calculateStreak(dates: Date[]): number {
    if (dates.length === 0) return 0;

    // Remove time component to compare calendar days
    const normalizeDate = (d: Date) => {
      const copy = new Date(d);
      copy.setHours(0, 0, 0, 0);
      return copy.getTime();
    };

    // Sort descending
    const sortedTimes = dates.map(normalizeDate).sort((a, b) => b - a);

    // Get unique days
    const uniqueDays = Array.from(new Set(sortedTimes));

    const today = normalizeDate(new Date());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTime = yesterday.getTime();

    let currentStreak = 0;
    let expectedNextDay = today;

    // Check if streak is active (worked out today or yesterday)
    if (uniqueDays[0] !== today && uniqueDays[0] !== yesterdayTime) {
      return 0; // Streak broken
    }

    // If latest workout was yesterday, the streak logic starts expecting yesterday
    if (uniqueDays[0] === yesterdayTime) {
      expectedNextDay = yesterdayTime;
    }

    for (const day of uniqueDays) {
      if (day === expectedNextDay) {
        currentStreak++;
        // Calculate the previous day for the next iteration
        const prevDay = new Date(expectedNextDay);
        prevDay.setDate(prevDay.getDate() - 1);
        expectedNextDay = prevDay.getTime();
      } else {
        break; // Gap found, streak ends
      }
    }

    return currentStreak;
  }

  public async getDashboardAnalytics(userId: string): Promise<DashboardAnalytics> {
    const today = new Date();
    // Calculate start of current week (assuming Monday is the first day)
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(today.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);

    const [aggregations, workoutDates, recentRaw] = await Promise.all([
      workoutSessionRepository.getDashboardAggregations(userId, weekStart),
      workoutSessionRepository.getUserWorkoutDates(userId),
      workoutSessionRepository.getRecentCompletedSessions(userId, 5),
    ]);

    const currentStreak = this.calculateStreak(workoutDates);

    const recentWorkouts: RecentWorkout[] = recentRaw.map((raw) => ({
      id: raw._id.toString(),
      workoutName: raw.workoutName || "Custom Workout",
      completedAt: raw.completedAt,
      exerciseCount: raw.exerciseCount,
      totalVolume: raw.totalVolume,
    }));

    let progressionRecommendation: ProgressionResponse | null = null;
    if (recentRaw.length > 0) {
      // Find the last completed exercise from the most recent workout
      const latestSession = await workoutSessionRepository.findByIdAndUser(recentRaw[0]._id.toString(), userId);
      if (latestSession && latestSession.exercises.length > 0) {
        const lastExercise = latestSession.exercises[latestSession.exercises.length - 1];
        if (lastExercise) {
          progressionRecommendation = await progressionService.getRecommendation(
            userId,
            lastExercise.exerciseName,
            lastExercise.plannedSets,
            lastExercise.plannedReps
          );
        }
      }
    }

    return {
      summary: {
        totalWorkouts: aggregations.totalWorkouts,
        workoutsThisWeek: aggregations.workoutsThisWeek,
        currentStreak,
        totalVolume: aggregations.totalVolume,
        totalExercises: aggregations.totalExercises,
      },
      recentWorkouts,
      progressionRecommendation,
    };
  }

  public async getExerciseProgress(userId: string, exerciseName: string): Promise<ExerciseProgress> {
    const normalizedName = exerciseName.trim().toLowerCase();
    const sessions = await workoutSessionRepository.findCompletedSessionsByExercise(userId, normalizedName, 10);

    let bestWeight = 0;
    let bestReps = 0;
    let totalVolume = 0;

    const progressPoints: ExerciseProgressPoint[] = [];

    // Reverse sessions so older comes first for chronological charting
    const chronologicalSessions = [...sessions].reverse();

    for (const session of chronologicalSessions) {
      const exercise = session.exercises.find(
        (ex) => ex.exerciseName.trim().toLowerCase() === normalizedName
      );

      if (!exercise || !session.completedAt) continue;

      const completedSets = exercise.sets.filter((s) => s.completed);
      if (completedSets.length === 0) continue;

      let sessionVolume = 0;
      let sessionTotalReps = 0;
      let maxWeightInSession = 0;

      for (const set of completedSets) {
        sessionTotalReps += set.reps;
        sessionVolume += set.weight * set.reps;
        
        if (set.weight > bestWeight) {
          bestWeight = set.weight;
        }
        if (set.weight > maxWeightInSession) {
            maxWeightInSession = set.weight;
        }
        if (set.reps > bestReps) {
          bestReps = set.reps;
        }
      }

      totalVolume += sessionVolume;

      progressPoints.push({
        date: session.completedAt,
        weight: maxWeightInSession, // Representative weight for the session
        totalReps: sessionTotalReps,
        volume: sessionVolume,
      });
    }

    return {
      exerciseName,
      bestWeight,
      bestReps,
      totalVolume,
      sessions: progressPoints,
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
