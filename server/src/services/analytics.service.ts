import { workoutSessionRepository } from "../repositories/workoutSession.repository";
import { progressionService, ProgressionResponse } from "./progression.service";
import WorkoutSession from "../models/WorkoutSession";
import Exercise from "../models/Exercise";
import logger from "../utils/logger";



export const MUSCLE_GROUP_MAP: Record<string, string> = {
  abdominals: "Core",
  hamstrings: "Legs",
  adductors: "Legs",
  quadriceps: "Legs",
  biceps: "Biceps",
  shoulders: "Shoulders",
  chest: "Chest",
  "middle back": "Back",
  glutes: "Legs",
  lats: "Back",
  "lower back": "Back",
  triceps: "Triceps",
  traps: "Back",
  forearms: "Forearms",
  neck: "Neck",
  abductors: "Legs",
  calves: "Legs"
};

export interface MuscleReadiness {
  muscle: string;
  readinessScore: number;
  status: "ready" | "moderate" | "light" | "recent" | "no_history";
  lastTrainedAt: string | null;
  daysSinceLastTrained: number | null;
  sessionsLast7Days: number;
  sessionsLast14Days: number;
}

export interface TrainingReadiness {
  overallScore: number;
  status: "ready" | "moderate" | "light" | "recent" | "no_history";
  recommendation: {
    muscleGroups: string[];
    reason: string;
  };
  muscleGroups: MuscleReadiness[];
}

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
          try {
            progressionRecommendation = await progressionService.getRecommendation(
              userId,
              lastExercise.exerciseName,
              lastExercise.plannedSets,
              lastExercise.plannedReps
            );
          } catch (error) {
            logger.warn("Failed to generate progression recommendation", {
              userId,
              exerciseName: lastExercise.exerciseName,
              error: error instanceof Error ? error.message : String(error)
            });
            // Non-fatal error, continue without recommendation
          }
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
      const isBodyweight = raw.history.every((h: { weight: number; reps: number; volume: number; date: Date }) => h.weight === 0);
      let firstRecordedWeight: number | null = null;
      let weightImprovementPercent: number | null = null;

      if (!isBodyweight) {
        const firstWeighted = raw.history.find((h: { weight: number; reps: number; volume: number; date: Date }) => h.weight > 0);
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

        const prevMaxWeight = Math.max(...previousHistory.map((h: { weight: number; reps: number; volume: number; date: Date }) => h.weight));
        const prevMaxReps = Math.max(...previousHistory.map((h: { weight: number; reps: number; volume: number; date: Date }) => h.reps));
        const prevMaxVol = Math.max(...previousHistory.map((h: { weight: number; reps: number; volume: number; date: Date }) => h.volume));

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
       const isBodyweight = raw.history.every((h: { weight: number; reps: number; volume: number; date: Date }) => h.weight === 0);
       // Find the session in history matching this exact session time
       const historyIndex = raw.history.findIndex((h: { weight: number; reps: number; volume: number; date: Date }) => new Date(h.date).getTime() === sessionTime);
       
       if (historyIndex > 0) {
         const current = raw.history[historyIndex];
         const previousHistory = raw.history.slice(0, historyIndex);

         const prevMaxWeight = Math.max(...previousHistory.map((h: { weight: number; reps: number; volume: number; date: Date }) => h.weight));
         const prevMaxReps = Math.max(...previousHistory.map((h: { weight: number; reps: number; volume: number; date: Date }) => h.reps));
         const prevMaxVol = Math.max(...previousHistory.map((h: { weight: number; reps: number; volume: number; date: Date }) => h.volume));

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

  public async getTrainingReadiness(userId: string): Promise<TrainingReadiness | null> {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const sessions = await WorkoutSession.find({
      user: userId,
      status: "completed"
    }).sort({ completedAt: 1 }).lean();

    const uniqueExerciseNames = new Set<string>();
    for (const session of sessions) {
      for (const ex of session.exercises) {
        uniqueExerciseNames.add(ex.exerciseName.toLowerCase());
      }
    }

    const exerciseDocs = await Exercise.find({
       name: { $in: Array.from(uniqueExerciseNames).map(n => new RegExp(`^${n}$`, "i")) }
    }).lean();

    const exMap = new Map<string, { primary: string[], secondary: string[] }>();
    for (const doc of exerciseDocs) {
       const primaryMuscles = doc.primaryMuscles ?? [];
       const secondaryMuscles = doc.secondaryMuscles ?? [];
       exMap.set(doc.name.toLowerCase(), {
         primary: primaryMuscles.map(m => MUSCLE_GROUP_MAP[m.toLowerCase()] || (m.charAt(0).toUpperCase() + m.slice(1))),
         secondary: secondaryMuscles.map(m => MUSCLE_GROUP_MAP[m.toLowerCase()] || (m.charAt(0).toUpperCase() + m.slice(1)))
       });
    }

    const muscleStats: Record<string, {
      lastTrainedAt: Date | null;
      sessionsLast7Days: Set<string>;
      sessionsLast14Days: Set<string>;
      loadScore: number;
    }> = {};

    const STANDARD_MUSCLES = ["Chest", "Back", "Legs", "Shoulders", "Biceps", "Triceps", "Core"];
    for (const m of STANDARD_MUSCLES) {
      muscleStats[m] = {
        lastTrainedAt: null,
        sessionsLast7Days: new Set(),
        sessionsLast14Days: new Set(),
        loadScore: 0
      };
    }

    for (const session of sessions) {
      if (!session.completedAt) continue;
      const sessionDate = new Date(session.completedAt);
      const isLast7 = sessionDate >= sevenDaysAgo;
      const isLast14 = sessionDate >= fourteenDaysAgo;
      const sessionId = session._id.toString();

      const hitMusclesThisSession = new Map<string, { isPrimary: boolean, sets: number }>();

      for (const ex of session.exercises) {
        const exInfo = exMap.get(ex.exerciseName.toLowerCase());
        if (!exInfo) continue;

        const completedSets = ex.sets.filter((s: { completed: boolean }) => s.completed).length;
        if (completedSets === 0) continue;

        for (const m of exInfo.primary) {
          if (!hitMusclesThisSession.has(m) || hitMusclesThisSession.get(m)!.isPrimary === false) {
            hitMusclesThisSession.set(m, { isPrimary: true, sets: completedSets });
          } else {
            hitMusclesThisSession.get(m)!.sets += completedSets;
          }
        }

        for (const m of exInfo.secondary) {
          if (!hitMusclesThisSession.has(m)) {
            hitMusclesThisSession.set(m, { isPrimary: false, sets: completedSets });
          } else if (hitMusclesThisSession.get(m)!.isPrimary === false) {
            hitMusclesThisSession.get(m)!.sets += completedSets;
          }
        }
      }

      for (const [muscle, data] of hitMusclesThisSession.entries()) {
        if (!muscleStats[muscle]) {
          muscleStats[muscle] = {
            lastTrainedAt: null,
            sessionsLast7Days: new Set(),
            sessionsLast14Days: new Set(),
            loadScore: 0
          };
        }

        const stat = muscleStats[muscle];
        if (!stat.lastTrainedAt || sessionDate > stat.lastTrainedAt) {
          stat.lastTrainedAt = sessionDate;
        }

        if (isLast14) stat.sessionsLast14Days.add(sessionId);
        if (isLast7) {
          stat.sessionsLast7Days.add(sessionId);
        }

        const daysAgo = Math.max(0, Math.floor((now.getTime() - sessionDate.getTime()) / 86400000));
        let recencyMultiplier = 0;
        if (daysAgo === 0) recencyMultiplier = 100;
        else if (daysAgo === 1) recencyMultiplier = 70;
        else if (daysAgo === 2) recencyMultiplier = 40;
        else if (daysAgo === 3) recencyMultiplier = 20;
        else if (daysAgo === 4) recencyMultiplier = 10;
        else recencyMultiplier = 0;

        const muscleWeight = data.isPrimary ? 1.0 : 0.5;
        const volumeWeight = Math.min(2.0, Math.max(0.5, data.sets / 4.0));

        stat.loadScore += recencyMultiplier * muscleWeight * volumeWeight;
      }
    }

    const readinessList: MuscleReadiness[] = [];
    for (const [muscle, stat] of Object.entries(muscleStats)) {
      const score = Math.max(0, 100 - Math.round(stat.loadScore));
      let status: "ready" | "moderate" | "light" | "recent" | "no_history";
      if (!stat.lastTrainedAt) status = "no_history";
      else if (score >= 80) status = "ready";
      else if (score >= 60) status = "moderate";
      else if (score >= 40) status = "light";
      else status = "recent";

      const daysSince = stat.lastTrainedAt 
        ? Math.max(0, Math.floor((now.getTime() - stat.lastTrainedAt.getTime()) / 86400000))
        : null;

      readinessList.push({
        muscle,
        readinessScore: score,
        status: status as "ready" | "moderate" | "light" | "recent" | "no_history",
        lastTrainedAt: stat.lastTrainedAt ? stat.lastTrainedAt.toISOString() : null,
        daysSinceLastTrained: daysSince,
        sessionsLast7Days: stat.sessionsLast7Days.size,
        sessionsLast14Days: stat.sessionsLast14Days.size
      });
    }

    if (readinessList.length === 0) return null;

    let totalScore = 0;
    readinessList.forEach(r => totalScore += r.readinessScore);
    const overallScore = Math.round(totalScore / readinessList.length);

    let overallStatus: "ready" | "moderate" | "light" | "recent" | "no_history";
    const allNoHistory = readinessList.every(r => r.status === "no_history");
    if (allNoHistory) overallStatus = "no_history";
    else if (overallScore >= 80) overallStatus = "ready";
    else if (overallScore >= 60) overallStatus = "moderate";
    else if (overallScore >= 40) overallStatus = "light";
    else overallStatus = "recent";

    const readyMuscles = readinessList.filter(r => r.status === "ready");
    const musclesWithHistory = readinessList.filter(r => r.status !== "no_history");
    const recommendation = {
      muscleGroups: [] as string[],
      reason: ""
    };

    if (musclesWithHistory.length === 0) {
      recommendation.reason = "Build more training history to establish your readiness baseline.";
    } else if (readyMuscles.length === 0) {
      recommendation.reason = "Most muscle groups were trained recently. Consider a rest day or a lighter session.";
    } else {
      readyMuscles.sort((a, b) => {
        if (b.readinessScore !== a.readinessScore) return b.readinessScore - a.readinessScore;
        const daysA = a.daysSinceLastTrained === null ? 999 : a.daysSinceLastTrained;
        const daysB = b.daysSinceLastTrained === null ? 999 : b.daysSinceLastTrained;
        return daysB - daysA;
      });
      
      const selected = readyMuscles.slice(0, 2).map(r => r.muscle);
      recommendation.muscleGroups = selected;
      recommendation.reason = `Based on your recent training, ${selected.join(" and ").toLowerCase()} have had more time since their last recorded session.`;
    }

    return {
      overallScore,
      status: overallStatus,
      recommendation,
      muscleGroups: readinessList.sort((a, b) => a.muscle.localeCompare(b.muscle))
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;







