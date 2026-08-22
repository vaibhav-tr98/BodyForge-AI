import { workoutRepository } from "../repositories/workout.repository";
import { analyticsService, MUSCLE_GROUP_MAP } from "./analytics.service";
import Exercise from "../models/Exercise";
import logger from "../utils/logger";

export interface TodayWorkoutRecommendation {
  workoutId: string;
  workoutName: string;
  reason: string;
  readinessScore: number;
  confidence: "high" | "medium" | "low";
}

export interface WorkoutRecommendationResponse {
  recommendation: TodayWorkoutRecommendation | null;
  reason?: string;
}

class WorkoutRecommendationService {
  public async getTodayRecommendation(userId: string, date?: string): Promise<WorkoutRecommendationResponse> {
    try {
      const workouts = await workoutRepository.findByUserId(userId);
      if (workouts.length === 0) {
        return {
          recommendation: null,
          reason: "Create a workout to receive a recommendation.",
        };
      }

      const readiness = await analyticsService.getTrainingReadiness(userId);

      if (!readiness) {
        // Rule 1 � No workout history
        return {
          recommendation: {
            workoutId: workouts[0]._id.toString(),
            workoutName: workouts[0].name,
            reason: "Start with this workout to begin building your training history.",
            readinessScore: 100,
            confidence: "high",
          },
        };
      }

      const exerciseNames = new Set<string>();
      for (const workout of workouts) {
        for (const ex of workout.exercises) {
          exerciseNames.add(ex.name.toLowerCase());
        }
      }

      const exerciseDocs = await Exercise.find({
        name: { $in: Array.from(exerciseNames).map(n => new RegExp(`^${n}$`, "i")) }
      }).lean();

      const exerciseMuscleMap = new Map<string, string[]>();
      for (const doc of exerciseDocs) {
        exerciseMuscleMap.set(doc.name.toLowerCase(), doc.primaryMuscles || []);
      }

      let bestWorkout = null;
      let highestScore = -1;
      let bestConfidence: "high" | "medium" | "low" = "low";
      let bestReason = "";

      for (const workout of workouts) {
        let totalScore = 0;
        let muscleCount = 0;
        let hasConflict = false;
        let hasHistory = false;
        
        const targetedMuscles = new Set<string>();

        for (const ex of workout.exercises) {
          const muscles = exerciseMuscleMap.get(ex.name.toLowerCase()) || [];
          for (const m of muscles) {
            const mapped = MUSCLE_GROUP_MAP[m.toLowerCase()] || (m.charAt(0).toUpperCase() + m.slice(1));
            targetedMuscles.add(mapped);
          }
        }

        if (targetedMuscles.size === 0) {
          totalScore = 50;
          muscleCount = 1;
        } else {
          for (const muscle of targetedMuscles) {
            const muscleReadiness = readiness.muscleGroups.find(m => m.muscle.toLowerCase() === muscle.toLowerCase());
            if (muscleReadiness) {
              totalScore += muscleReadiness.readinessScore;
              if (muscleReadiness.status === "recent" || muscleReadiness.readinessScore < 30) {
                hasConflict = true;
              }
              if (muscleReadiness.status !== "no_history") {
                hasHistory = true;
              }
            } else {
              totalScore += 100;
            }
            muscleCount++;
          }
        }

        let avgScore = totalScore / muscleCount;

        // Rule 2 - Recovery conflict
        if (hasConflict) {
          avgScore *= 0.5; // Heavily penalize
        }

        if (avgScore > highestScore) {
          highestScore = avgScore;
          bestWorkout = workout;
          
          if (avgScore >= 80 && !hasConflict) {
            bestConfidence = "high";
            const musclesArr = Array.from(targetedMuscles).slice(0, 2);
            if (musclesArr.length > 0) {
              if (hasHistory) {
                bestReason = `Your ${musclesArr.join(" and ")} are recovered and ready for training.`;
              } else {
                bestReason = `Your ${musclesArr.join(" and ")} ${musclesArr.length > 1 ? "have" : "has"} no recorded training history.`;
              }
            } else {
              bestReason = hasHistory ? "Your body is recovered and ready for training." : "You have no recorded training history.";
            }
          } else if (avgScore >= 50 && !hasConflict) {
            bestConfidence = "medium";
            bestReason = hasHistory ? "These muscle groups have recovered well." : "These muscle groups have no recorded training history.";
          } else {
            bestConfidence = "low";
            bestReason = hasHistory ? "Your recent training history suggests taking a lighter day. This workout is your best available option." : "This workout is your best available option.";
          }
        }
      }

      if (bestWorkout) {
        return {
          recommendation: {
            workoutId: bestWorkout._id.toString(),
            workoutName: bestWorkout.name,
            reason: bestReason,
            readinessScore: Math.round(highestScore),
            confidence: bestConfidence,
          }
        };
      }

      return {
        recommendation: null,
        reason: "No suitable workouts found."
      };
    } catch (error) {
      logger.error("Failed to generate workout recommendation:", error);
      throw error;
    }
  }
}

export const workoutRecommendationService = new WorkoutRecommendationService();
