import { analyticsService } from "./analytics.service";
import { workoutRecommendationService } from "./workoutRecommendation.service";
import { nutritionService } from "./nutrition.service";
import { BodyForgeInsightDTO, InsightType, InsightPriority } from "../types/insight.types";
import logger from "../utils/logger";

class InsightService {
  public async getInsight(userId: string, date: string): Promise<BodyForgeInsightDTO> {
    try {
      // Fetch data from existing domain services
      const readiness = await analyticsService.getTrainingReadiness(userId);
      const workoutRec = await workoutRecommendationService.getTodayRecommendation(userId, date);
      const nutritionOverview = await nutritionService.getTodayOverview(userId, date);

      // Priority 1: readinessStatus === "no_history"
      const hasNoHistory = !readiness || readiness.status === "no_history";

      if (hasNoHistory) {
        return {
          type: "history_needed",
          priority: "high",
          title: "More Data Needed",
          message: "Build more training history to establish your readiness baseline.",
          context: {
            readinessScore: readiness?.overallScore,
            workoutName: workoutRec.recommendation?.workoutName,
          }
        };
      }

      // Priority 2: nutrition.targets === null
      if (nutritionOverview.targets === null) {
        return {
          type: "nutrition_config_needed",
          priority: "high",
          title: "Nutrition Target Missing",
          message: "Your nutrition target is not set yet. Add your weight/profile information to unlock nutrition targets.",
          context: {
            readinessScore: readiness?.overallScore,
            workoutName: workoutRec.recommendation?.workoutName,
          }
        };
      }

      // Priority 3: nutrition.status === "below_target"
      if (nutritionOverview.status.protein === "below_target" || nutritionOverview.status.calories === "below_target") {
        const isProteinBelow = nutritionOverview.status.protein === "below_target";
        
        let message = "Your nutrition is currently below today's target.";
        let title = "Nutrition needs attention";
        if (isProteinBelow && workoutRec.recommendation !== null) {
          message = "Your workout is ready, but your protein intake is currently below today's target.";
          title = "Protein needs attention";
        } else if (isProteinBelow) {
           message = "Your protein intake is currently below today's target.";
           title = "Protein needs attention";
        }

        return {
          type: "nutrition_gap",
          priority: "medium",
          title: title,
          message: message,
          context: {
            readinessScore: readiness?.overallScore,
            workoutName: workoutRec.recommendation?.workoutName,
            nutritionStatus: isProteinBelow ? nutritionOverview.status.protein : nutritionOverview.status.calories,
            proteinPercent: nutritionOverview.progress?.proteinPercent,
          }
        };
      }

      // Priority 4: workout available + nutrition on track
      const isNutritionOnTrack = (nutritionOverview.status.protein === "on_track" || nutritionOverview.status.protein === "target_reached") &&
                                 (nutritionOverview.status.calories === "on_track" || nutritionOverview.status.calories === "target_reached");

      if (workoutRec.recommendation !== null && isNutritionOnTrack) {
        return {
          type: "on_track",
          priority: "low",
          title: "Ready to Train",
          message: "Your nutrition is on track for today's training.",
          context: {
            readinessScore: readiness?.overallScore,
            workoutName: workoutRec.recommendation?.workoutName,
            nutritionStatus: nutritionOverview.status.protein,
            proteinPercent: nutritionOverview.progress?.proteinPercent,
          }
        };
      }

      // Priority 5: no workout recommendation
      if (workoutRec.recommendation === null) {
        return {
          type: "no_workout",
          priority: "low",
          title: "No Workout Scheduled",
          message: "No workout recommendation is available yet. Create a workout to get started.",
          context: {
            readinessScore: readiness?.overallScore,
          }
        };
      }

      // Fallback
      return {
        type: "on_track",
        priority: "low",
        title: "All Good",
        message: "You're on track for today.",
        context: {
           readinessScore: readiness?.overallScore,
           workoutName: workoutRec.recommendation?.workoutName,
        }
      };

    } catch (error) {
      logger.error(`Error generating bodyforge insight for user ${userId}:`, error);
      throw error;
    }
  }
}

export const insightService = new InsightService();
