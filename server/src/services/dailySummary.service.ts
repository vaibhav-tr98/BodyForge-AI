import { DailySummaryContext, DailySummaryDTO } from "../types/dailySummary.types";
import { AIProvider } from "./aiProvider.service";
import { progressAnalysisService } from "./progressAnalysis.service";
import { nutritionAnalysisService } from "./nutritionAnalysis.service";
import { workoutAnalysisService } from "./workoutAnalysis.service";
import { readinessAnalysisService } from "./readinessAnalysis.service";
import logger from "../utils/logger";

class DailySummaryService {
  public async getDailySummary(userId: string, date: string): Promise<DailySummaryDTO> {
    let progressAnalysis = null;
    let nutritionAnalysis = null;
    let workoutAnalysis = null;
    let readinessAnalysis = null;

    try {
      progressAnalysis = await progressAnalysisService.getProgressAnalysis(userId, date);
    } catch (error) {
      logger.warn("Failed to get progress analysis for daily summary", { userId, date, error });
    }

    try {
      nutritionAnalysis = await nutritionAnalysisService.getNutritionAnalysis(userId, date);
    } catch (error) {
      logger.warn("Failed to get nutrition analysis for daily summary", { userId, date, error });
    }

    try {
      workoutAnalysis = await workoutAnalysisService.getWorkoutAnalysis(userId, date);
    } catch (error) {
      logger.warn("Failed to get workout analysis for daily summary", { userId, date, error });
    }

    try {
      readinessAnalysis = await readinessAnalysisService.getReadinessAnalysis(userId);
    } catch (error) {
      logger.warn("Failed to get readiness analysis for daily summary", { userId, date, error });
    }

    const context: DailySummaryContext = {
      date,
      progressAnalysis,
      nutritionAnalysis,
      workoutAnalysis,
      readinessAnalysis,
    };

    const isProgressEmpty = !progressAnalysis || progressAnalysis.summary.startsWith("Add more progress");
    const isNutritionEmpty = !nutritionAnalysis || nutritionAnalysis.summary.startsWith("No nutrition logged");
    const isWorkoutEmpty = !workoutAnalysis || workoutAnalysis.summary.startsWith("No workout history");
    const isReadinessEmpty = !readinessAnalysis || readinessAnalysis.summary.startsWith("You don't have enough");

    if (isProgressEmpty && isNutritionEmpty && isWorkoutEmpty && isReadinessEmpty) {
      return {
        summary: "Not enough data available to generate a daily summary.",
        topPositive: "Start logging your workouts and nutrition to get personalized insights.",
        mainAttention: "Missing data",
        nextAction: "Complete your profile and start logging today's activities."
      };
    }

    try {
      const summary = await AIProvider.generateDailySummary(context);
      return summary;
    } catch (error: any) {
      logger.error("AI Provider failed to generate daily summary", { error: error.message });
      throw new Error("AI analysis is temporarily unavailable.");
    }
  }
}

export const dailySummaryService = new DailySummaryService();
