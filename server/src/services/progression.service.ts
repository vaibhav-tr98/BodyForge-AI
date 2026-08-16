import { workoutSessionRepository } from "../repositories/workoutSession.repository";
import { IWorkoutSession, IWorkoutSessionExercise } from "../models/WorkoutSession";

export interface ProgressionRecommendation {
  weight: number;
  sets: number;
  minReps: number;
  maxReps: number;
}

export interface LatestPerformance {
  weight: number;
  setsCompleted: number;
  totalReps: number;
}

export interface ProgressionResponse {
  exerciseName: string;
  recommendation: ProgressionRecommendation | null;
  reason: string;
  confidence: "low" | "medium" | "high";
  basedOnSessions: number;
  latestPerformance: LatestPerformance | null;
}

class ProgressionService {
  /**
   * Derives target rep range based on the planned reps.
   */
  private getTargetRepRange(plannedReps: number): { min: number; max: number } {
    if (plannedReps <= 8) {
      return { min: Math.max(1, plannedReps - 2), max: plannedReps + 2 };
    }
    if (plannedReps <= 10) {
      return { min: plannedReps - 2, max: plannedReps + 2 };
    }
    return { min: plannedReps - 2, max: plannedReps + 3 };
  }

  /**
   * Applies the weight increment logic.
   * Approx 2.5% increase, rounded to nearest 0.5kg.
   */
  private getIncreasedWeight(currentWeight: number): number {
    if (currentWeight === 0) return 0;
    const increment = currentWeight * 0.025;
    // We want a minimum increment of 0.5kg if weight > 0, or just round to nearest 0.5
    let newWeight = currentWeight + increment;
    newWeight = Math.round(newWeight * 2) / 2;
    if (newWeight === currentWeight) {
      newWeight += 0.5;
    }
    return newWeight;
  }

  public async getRecommendation(
    userId: string,
    exerciseName: string,
    plannedSets: number,
    plannedReps: number
  ): Promise<ProgressionResponse> {
    const normalizedName = exerciseName.trim().toLowerCase();
    
    // 1. Fetch relevant completed sessions
    const sessions = await workoutSessionRepository.findCompletedSessionsByExercise(userId, exerciseName, 5);
    
    if (sessions.length === 0) {
      return {
        exerciseName,
        recommendation: null,
        reason: "No previous performance data for this exercise yet.",
        confidence: "low",
        basedOnSessions: 0,
        latestPerformance: null,
      };
    }

    // Process sessions to extract relevant exercise data
    const exerciseHistory = sessions
      .map((session) => {
        return session.exercises.find(
          (ex) => ex.exerciseName.trim().toLowerCase() === normalizedName
        );
      })
      .filter((ex): ex is IWorkoutSessionExercise => ex !== undefined);

    if (exerciseHistory.length === 0) {
      return {
        exerciseName,
        recommendation: null,
        reason: "No previous performance data for this exercise yet.",
        confidence: "low",
        basedOnSessions: 0,
        latestPerformance: null,
      };
    }

    // Determine confidence
    let confidence: "low" | "medium" | "high" = "low";
    if (exerciseHistory.length >= 4) {
      confidence = "high";
    } else if (exerciseHistory.length >= 2) {
      confidence = "medium";
    }

    const latestEx = exerciseHistory[0]; // 0 is most recent due to sort
    const latestSets = latestEx.sets.filter((s) => s.completed);
    
    const latestPerformance: LatestPerformance = {
      weight: latestSets.length > 0 ? latestSets[0].weight : 0,
      setsCompleted: latestSets.length,
      totalReps: latestSets.reduce((sum, s) => sum + s.reps, 0),
    };

    const targetRange = this.getTargetRepRange(plannedReps);

    // Rule: First Session
    if (exerciseHistory.length === 1) {
      return {
        exerciseName,
        recommendation: {
          weight: latestPerformance.weight,
          sets: plannedSets,
          minReps: targetRange.min,
          maxReps: targetRange.max,
        },
        reason: "This is your first recorded session for this exercise. Repeat the weight and build a performance baseline.",
        confidence: "low",
        basedOnSessions: 1,
        latestPerformance,
      };
    }

    // Analyze trend
    // Look at the latest performance compared to the previous
    const prevEx = exerciseHistory[1];
    const prevSets = prevEx.sets.filter((s) => s.completed);
    const prevTotalReps = prevSets.reduce((sum, s) => sum + s.reps, 0);
    const prevWeight = prevSets.length > 0 ? prevSets[0].weight : 0;

    // Rule: Performance Drop
    // If weight is the same but reps dropped significantly (e.g. > 15% drop in total reps)
    if (latestPerformance.weight >= prevWeight && latestPerformance.totalReps < prevTotalReps * 0.85) {
      return {
        exerciseName,
        recommendation: {
          weight: latestPerformance.weight,
          sets: plannedSets,
          minReps: targetRange.min,
          maxReps: targetRange.max,
        },
        reason: "Your recent performance dropped. Maintain the current weight and rebuild consistency.",
        confidence,
        basedOnSessions: exerciseHistory.length,
        latestPerformance,
      };
    }

    // Check if user hit the top of the rep range consistently in the latest session
    // e.g. all sets hit targetRange.max or higher
    const allSetsHitMax = latestSets.length >= plannedSets && latestSets.every(s => s.reps >= targetRange.max);

    if (allSetsHitMax) {
      // Bodyweight vs Weighted
      if (latestPerformance.weight === 0) {
        return {
          exerciseName,
          recommendation: {
            weight: 0,
            sets: plannedSets,
            minReps: targetRange.min + 2, // progress reps
            maxReps: targetRange.max + 2,
          },
          reason: `You completed the top of your rep range. Increase the rep target and rebuild reps.`,
          confidence,
          basedOnSessions: exerciseHistory.length,
          latestPerformance,
        };
      } else {
        const newWeight = this.getIncreasedWeight(latestPerformance.weight);
        return {
          exerciseName,
          recommendation: {
            weight: newWeight,
            sets: plannedSets,
            minReps: targetRange.min,
            maxReps: targetRange.max,
          },
          reason: `You completed the top of your rep range at ${latestPerformance.weight} kg. Increase the load and rebuild reps.`,
          confidence,
          basedOnSessions: exerciseHistory.length,
          latestPerformance,
        };
      }
    }

    // Rule: Maintain
    return {
      exerciseName,
      recommendation: {
        weight: latestPerformance.weight,
        sets: plannedSets,
        minReps: targetRange.min,
        maxReps: targetRange.max,
      },
      reason: `Maintain ${latestPerformance.weight} kg and aim to increase your total reps before adding weight.`,
      confidence,
      basedOnSessions: exerciseHistory.length,
      latestPerformance,
    };
  }
}

export const progressionService = new ProgressionService();
export default progressionService;
