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

export interface SessionPerformance {
  date: Date;
  e1rm: number;
  maxWeight: number;
  totalReps: number;
  maxReps: number;
  setsCompleted: number;
  isBodyweight: boolean;
}

class ProgressionService {
  private getTargetRepRange(plannedReps: number): { min: number; max: number } {
    if (plannedReps <= 8) return { min: Math.max(1, plannedReps - 2), max: plannedReps + 2 };
    if (plannedReps <= 10) return { min: plannedReps - 2, max: plannedReps + 2 };
    return { min: Math.max(1, plannedReps - 2), max: plannedReps + 3 };
  }

  private roundWeight(weight: number): number {
    return Math.max(0, Math.round(weight * 2) / 2);
  }

  private getIncreasedWeight(currentWeight: number): number {
    if (currentWeight === 0) return 0;
    const increment = currentWeight * 0.025;
    let newWeight = currentWeight + increment;
    newWeight = this.roundWeight(newWeight);
    if (newWeight === currentWeight) {
      newWeight += 0.5;
    }
    return newWeight;
  }

  private calculateE1RM(weight: number, reps: number): number {
    if (weight <= 0 || reps <= 0) return 0;
    const effectiveReps = Math.min(reps, 15);
    return weight * (1 + effectiveReps / 30);
  }

  private reverseE1RM(e1rm: number, targetReps: number): number {
    if (e1rm <= 0) return 0;
    const effectiveReps = Math.min(targetReps, 15);
    return e1rm / (1 + effectiveReps / 30);
  }

  private extractPerformance(session: IWorkoutSession, normalizedName: string): SessionPerformance | null {
    const ex = session.exercises.find(
      (e) => e && e.exerciseName && e.exerciseName.trim().toLowerCase() === normalizedName
    );
    if (!ex) return null;

    const validSets = ex.sets.filter(s => s.completed && s.reps > 0);
    if (validSets.length === 0) return null;

    const isBodyweight = validSets.every(s => s.weight === 0);
    const maxWeight = Math.max(...validSets.map(s => s.weight));
    const totalReps = validSets.reduce((sum, s) => sum + s.reps, 0);
    const maxReps = Math.max(...validSets.map(s => s.reps));

    let maxE1rm = 0;
    if (!isBodyweight) {
      // Exclude warmups (< 60% of max weight)
      const workingSets = validSets.filter(s => s.weight >= maxWeight * 0.6);
      for (const s of workingSets) {
        const setE1rm = this.calculateE1RM(s.weight, s.reps);
        if (setE1rm > maxE1rm) maxE1rm = setE1rm;
      }
    }

    return {
      date: session.startedAt,
      e1rm: maxE1rm,
      maxWeight: isBodyweight ? 0 : maxWeight,
      totalReps,
      maxReps,
      setsCompleted: validSets.length,
      isBodyweight,
    };
  }

  private isPlateau(history: SessionPerformance[]): boolean {
    if (history.length < 3) return false;

    // Check last 3 sessions for stability
    const latest3 = history.slice(0, 3);

    if (latest3[0].isBodyweight) {
      const minReps = Math.min(...latest3.map(h => h.totalReps));
      const maxReps = Math.max(...latest3.map(h => h.totalReps));
      return (maxReps > 0 && ((maxReps - minReps) / maxReps) <= 0.05);
    }

    const minE1rm = Math.min(...latest3.map(h => h.e1rm));
    const maxE1rm = Math.max(...latest3.map(h => h.e1rm));

    if (maxE1rm === 0) return false;
    return ((maxE1rm - minE1rm) / maxE1rm) <= 0.02;
  }

  public async getRecommendation(
    userId: string,
    exerciseName: string,
    plannedSets: number,
    plannedReps: number
  ): Promise<ProgressionResponse> {
    if (!exerciseName || typeof exerciseName !== 'string') {
      return {
        exerciseName: exerciseName || "Unknown",
        recommendation: null,
        reason: "Invalid exercise data.",
        confidence: "low",
        basedOnSessions: 0,
        latestPerformance: null,
      };
    }

    const normalizedName = exerciseName.trim().toLowerCase();

    // Fetch 5 sessions to have enough history for plateau and post-deload checks
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

    // Process history chronologically (index 0 is latest)
    const history: SessionPerformance[] = [];
    for (const session of sessions) {
      const perf = this.extractPerformance(session, normalizedName);
      if (perf) history.push(perf);
    }

    if (history.length === 0) {
      return {
        exerciseName,
        recommendation: null,
        reason: "No previous performance data for this exercise yet.",
        confidence: "low",
        basedOnSessions: 0,
        latestPerformance: null,
      };
    }

    let confidence: "low" | "medium" | "high" = "low";
    if (history.length >= 4) confidence = "high";
    else if (history.length >= 2) confidence = "medium";

    const latest = history[0];
    const latestPerformance: LatestPerformance = {
      weight: latest.maxWeight,
      setsCompleted: latest.setsCompleted,
      totalReps: latest.totalReps,
    };
    const targetRange = this.getTargetRepRange(plannedReps);

    const safeResponse = (recWeight: number, recSets: number, recMinReps: number, recMaxReps: number, reason: string): ProgressionResponse => {
      let finalWeight = this.roundWeight(recWeight);
      if (isNaN(finalWeight) || !isFinite(finalWeight) || finalWeight < 0) finalWeight = latest.maxWeight;

      let finalSets = Math.max(1, Math.round(recSets));
      if (isNaN(finalSets) || !isFinite(finalSets) || finalSets <= 0) finalSets = plannedSets;

      return {
        exerciseName,
        recommendation: { weight: finalWeight, sets: finalSets, minReps: Math.max(1, recMinReps), maxReps: Math.max(1, recMaxReps) },
        reason,
        confidence,
        basedOnSessions: history.length,
        latestPerformance
      };
    };

    // Rule: Long Gap (> 14 days)
    const daysSinceLast = (Date.now() - latest.date.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLast > 14) {
      const targetWeight = latest.isBodyweight ? 0 : latest.maxWeight * 0.90;
      return safeResponse(
        targetWeight,
        plannedSets,
        targetRange.min,
        targetRange.max,
        "It's been over 2 weeks since you last trained this exercise. Using a conservative restart load."
      );
    }

    // Rule: First Session (only 1 history)
    if (history.length === 1) {
      return safeResponse(
        latest.maxWeight,
        plannedSets,
        targetRange.min,
        targetRange.max,
        "This is your first recorded session for this exercise. Repeat the weight and build a performance baseline."
      );
    }

    // Check for Post-Deload Recovery
    // A deload is when history[0] (latest) was significantly lighter/less volume than history[1], AND history[1..3] was a plateau.
    if (history.length >= 4) {
      const prevHistory = history.slice(1);
      if (this.isPlateau(prevHistory)) {
        const plateauPerf = history[1];
        const latestWasDeload = latest.isBodyweight
          ? (latest.totalReps < plateauPerf.totalReps * 0.90)
          : (latest.e1rm < plateauPerf.e1rm * 0.90);

        if (latestWasDeload) {
          let targetWeight = 0;
          if (!latest.isBodyweight) {
            const recoveryE1RM = plateauPerf.e1rm * 0.925;
            const targetReps = Math.round((targetRange.min + targetRange.max) / 2);
            targetWeight = this.reverseE1RM(recoveryE1RM, targetReps);
          }
          return safeResponse(
            targetWeight,
            plannedSets,
            targetRange.max,
            targetRange.max,
            "Resuming normal progression after your deload. Using a running start slightly below your previous plateau."
          );
        }
      }
    }

    // Check for Plateau
    if (this.isPlateau(history)) {
      if (latest.isBodyweight) {
        return safeResponse(
          0,
          Math.max(1, plannedSets - 1),
          targetRange.min,
          targetRange.max,
          "You've plateaued over the last 3 sessions. Let's drop a set to shed fatigue."
        );
      } else {
        const deloadE1RM = latest.e1rm * 0.85;
        // Cap single session drop at 25%
        const minDeloadE1RM = latest.e1rm * 0.75;
        const targetE1RM = Math.max(deloadE1RM, minDeloadE1RM);

        const targetReps = Math.round((targetRange.min + targetRange.max) / 2);
        const deloadWeight = this.reverseE1RM(targetE1RM, targetReps);

        return safeResponse(
          deloadWeight,
          Math.max(1, plannedSets - 1),
          targetRange.min,
          targetRange.max,
          "You've plateaued over 3 sessions. Let's drop the weight by 15% and shed fatigue."
        );
      }
    }

    // Analyze normal trend between latest[0] and previous[1]
    const prev = history[1];

    if (latest.isBodyweight) {
      if (latest.totalReps > prev.totalReps) {
        return safeResponse(0, plannedSets, targetRange.min + 2, targetRange.max + 2, "Great progress on reps. Let's increase the rep target.");
      } else if (latest.totalReps < prev.totalReps * 0.85) {
        return safeResponse(0, plannedSets, targetRange.min, targetRange.max, "Your recent performance dropped. Maintain volume and rebuild consistency.");
      }
      return safeResponse(0, plannedSets, targetRange.min, targetRange.max, "Maintain bodyweight and aim to increase your total reps.");
    } else {
      const e1rmChange = (latest.e1rm - prev.e1rm) / (prev.e1rm || 1);

      if (e1rmChange < -0.05) {
        return safeResponse(latest.maxWeight, plannedSets, targetRange.min, targetRange.max, "Your recent performance dropped. Maintain the current weight and rebuild consistency.");
      }

      const hitTopRange = latest.maxReps >= targetRange.max;
      if (e1rmChange > 0.02 || hitTopRange) {
        const newWeight = this.getIncreasedWeight(latest.maxWeight);
        return safeResponse(newWeight, plannedSets, targetRange.min, targetRange.max, `You're progressing well. Increase the load and rebuild reps.`);
      }

      return safeResponse(latest.maxWeight, plannedSets, targetRange.min, targetRange.max, `Maintain ${latest.maxWeight} kg and aim to increase your total reps before adding weight.`);
    }
  }
}

export const progressionService = new ProgressionService();
export default progressionService;
