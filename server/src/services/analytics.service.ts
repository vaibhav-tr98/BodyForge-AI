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

export interface PersonalRecord {
  exerciseName: string;
  heaviestWeight: number;
  bestReps: number;
  bestSessionVolume: number;
  firstRecordedWeight: number | null;
  weightImprovementPercent: number | null;
  lastPerformedAt: Date;
  totalSessions: number;
}

export interface TrainingInsight {
  type: "strongest" | "improvement" | "most_trained" | "newest_pr";
  title: string;
  exerciseName: string;
  value: string;
}

export interface PRAndInsightsResponse {
  personalRecords: PersonalRecord[];
  insights: TrainingInsight[];
}

export interface PRResult {
  type: "weight" | "reps" | "volume";
  exerciseName: string;
  value: number;
  previousValue: number;
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

  public async getPersonalRecordsAndInsights(userId: string): Promise<PRAndInsightsResponse> {
    const rawData = await workoutSessionRepository.getPersonalRecords(userId);

    const personalRecords: PersonalRecord[] = [];
    const insights: TrainingInsight[] = [];

    let strongestExercise: PersonalRecord | null = null;
    let biggestImprovement: PersonalRecord | null = null;
    let mostTrained: PersonalRecord | null = null;

    let newestPrEvent: { exerciseName: string; type: string; value: number; previous: number; date: Date } | null = null;

    for (const raw of rawData) {
      const isBodyweight = raw.history.every((h: any) => h.weight === 0);
      let firstRecordedWeight: number | null = null;
      let weightImprovementPercent: number | null = null;

      if (!isBodyweight) {
        const firstWeighted = raw.history.find((h: any) => h.weight > 0);
        if (firstWeighted) {
          firstRecordedWeight = firstWeighted.weight;
          if (firstRecordedWeight !== null && firstRecordedWeight > 0 && raw.heaviestWeight > firstRecordedWeight) {
            weightImprovementPercent = ((raw.heaviestWeight - firstRecordedWeight) / firstRecordedWeight) * 100;
          } else {
            weightImprovementPercent = 0;
          }
        }
      }

      const pr: PersonalRecord = {
        exerciseName: raw.originalExerciseName,
        heaviestWeight: raw.heaviestWeight,
        bestReps: raw.bestReps,
        bestSessionVolume: raw.bestSessionVolume,
        firstRecordedWeight,
        weightImprovementPercent,
        lastPerformedAt: raw.lastPerformedAt,
        totalSessions: raw.totalSessions,
      };

      personalRecords.push(pr);

      // Track insights
      if (!isBodyweight) {
        if (!strongestExercise || pr.heaviestWeight > strongestExercise.heaviestWeight) {
          strongestExercise = pr;
        }
        if (pr.weightImprovementPercent !== null) {
          if (!biggestImprovement || (biggestImprovement.weightImprovementPercent !== null && pr.weightImprovementPercent > biggestImprovement.weightImprovementPercent)) {
            biggestImprovement = pr;
          }
        }
      }

      if (!mostTrained || pr.totalSessions > mostTrained.totalSessions) {
        mostTrained = pr;
      }

      // Detect if the latest session was a PR
      if (raw.history.length > 1) {
        const lastSession = raw.history[raw.history.length - 1];
        const previousHistory = raw.history.slice(0, raw.history.length - 1);

        const prevMaxWeight = Math.max(...previousHistory.map((h: any) => h.weight));
        const prevMaxReps = Math.max(...previousHistory.map((h: any) => h.reps));
        const prevMaxVol = Math.max(...previousHistory.map((h: any) => h.volume));

        let currentPrEvent = null;

        if (!isBodyweight && lastSession.weight > prevMaxWeight) {
          currentPrEvent = { type: "Heaviest Weight", value: lastSession.weight, previous: prevMaxWeight, date: lastSession.date };
        } else if (lastSession.reps > prevMaxReps) {
          currentPrEvent = { type: "Best Reps", value: lastSession.reps, previous: prevMaxReps, date: lastSession.date };
        } else if (lastSession.volume > prevMaxVol) {
          currentPrEvent = { type: "Best Volume", value: lastSession.volume, previous: prevMaxVol, date: lastSession.date };
        }

        if (currentPrEvent) {
          if (!newestPrEvent || new Date(currentPrEvent.date) > new Date(newestPrEvent.date)) {
            newestPrEvent = { exerciseName: pr.exerciseName, ...currentPrEvent };
          }
        }
      } else if (raw.history.length === 1) {
          // First time doing the exercise could technically be a PR, but usually we only notify if it exceeds a PREVIOUS best.
          // We will ignore first-session PRs for the insight.
      }
    }

    if (strongestExercise) {
      insights.push({
        type: "strongest",
        title: "🔥 Strongest Exercise",
        exerciseName: strongestExercise.exerciseName,
        value: `${strongestExercise.heaviestWeight} kg`,
      });
    }

    if (biggestImprovement && biggestImprovement.weightImprovementPercent !== null && biggestImprovement.weightImprovementPercent > 0) {
      insights.push({
        type: "improvement",
        title: "📈 Biggest Improvement",
        exerciseName: biggestImprovement.exerciseName,
        value: `+${biggestImprovement.weightImprovementPercent.toFixed(1)}%`,
      });
    }

    if (mostTrained) {
      insights.push({
        type: "most_trained",
        title: "💪 Most Trained",
        exerciseName: mostTrained.exerciseName,
        value: `${mostTrained.totalSessions} sessions`,
      });
    }

    if (newestPrEvent) {
      insights.push({
        type: "newest_pr",
        title: "🏆 New Personal Record",
        exerciseName: newestPrEvent.exerciseName,
        value: `${newestPrEvent.type}: ${newestPrEvent.value} (was ${newestPrEvent.previous})`,
      });
    }

    return { personalRecords, insights };
  }

  public async getRecentPRsForSession(userId: string, sessionId: string): Promise<PRResult[]> {
     const rawData = await workoutSessionRepository.getPersonalRecords(userId);
     const session = await workoutSessionRepository.findByIdAndUser(sessionId, userId);
     if (!session || !session.completedAt) return [];

     const sessionTime = new Date(session.completedAt).getTime();
     const results: PRResult[] = [];

     for (const raw of rawData) {
       const isBodyweight = raw.history.every((h: any) => h.weight === 0);
       // Find the session in history matching this exact session time
       const historyIndex = raw.history.findIndex((h: any) => new Date(h.date).getTime() === sessionTime);
       
       if (historyIndex > 0) {
         const current = raw.history[historyIndex];
         const previousHistory = raw.history.slice(0, historyIndex);

         const prevMaxWeight = Math.max(...previousHistory.map((h: any) => h.weight));
         const prevMaxReps = Math.max(...previousHistory.map((h: any) => h.reps));
         const prevMaxVol = Math.max(...previousHistory.map((h: any) => h.volume));

         if (!isBodyweight && current.weight > prevMaxWeight) {
           results.push({ type: "weight", exerciseName: raw.originalExerciseName, value: current.weight, previousValue: prevMaxWeight });
         } else if (current.reps > prevMaxReps) {
           results.push({ type: "reps", exerciseName: raw.originalExerciseName, value: current.reps, previousValue: prevMaxReps });
         } else if (current.volume > prevMaxVol) {
           results.push({ type: "volume", exerciseName: raw.originalExerciseName, value: current.volume, previousValue: prevMaxVol });
         }
       }
     }
     
     return results;
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
