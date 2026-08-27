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
