import { DailySummaryContext, DailySummaryDTO } from "../types/dailySummary.types";
import { AIProvider } from "./aiProvider.service";
import { progressAnalysisService } from "./progressAnalysis.service";
import { nutritionAnalysisService } from "./nutritionAnalysis.service";
import { workoutAnalysisService } from "./workoutAnalysis.service";
import { readinessAnalysisService } from "./readinessAnalysis.service";
import { aiAnalysisCacheRepository } from "../repositories/aiAnalysisCache.repository";
import { hashContext } from "../utils/hashContext";
import { env } from "../config/env";
import logger from "../utils/logger";

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

class DailySummaryService {
  public async getDailySummary(userId: string, date: string): Promise<DailySummaryDTO> {
    // --- Step 1: Gather sub-analyses (each is already cache-first) ---
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

    // --- Step 2: Build context from whatever sub-analyses returned ---
    const context: DailySummaryContext = {
      date,
      progressAnalysis,
      nutritionAnalysis,
      workoutAnalysis,
      readinessAnalysis,
    };

    const isProgressEmpty =
      !progressAnalysis || progressAnalysis.summary.startsWith("Add more progress");
    const isNutritionEmpty =
      !nutritionAnalysis || nutritionAnalysis.summary.startsWith("No nutrition logged");
    const isWorkoutEmpty =
      !workoutAnalysis || workoutAnalysis.summary.startsWith("No workout history");
    const isReadinessEmpty =
      !readinessAnalysis || readinessAnalysis.summary.startsWith("You don't have enough");

    if (isProgressEmpty && isNutritionEmpty && isWorkoutEmpty && isReadinessEmpty) {
      return {
        summary: "Not enough data available to generate a daily summary.",
        topPositive: "Start logging your workouts and nutrition to get personalized insights.",
        mainAttention: "Missing data",
        nextAction: "Complete your profile and start logging today's activities.",
      };
    }

    // --- Step 3: Cache check keyed on the composed context ---
    const inputHash = hashContext(context);
    const cached = await aiAnalysisCacheRepository.findValid({
      userId,
      date,
      type: "daily-summary",
      inputHash,
    });
    if (cached) {
      logger.info("Returning cached daily summary", { userId, date });
      return cached.result as DailySummaryDTO;
    }

    // --- Step 4: Gemini call ---
    try {
      const summary = await AIProvider.generateDailySummary(context);

      await aiAnalysisCacheRepository.save({
        userId,
        date,
        type: "daily-summary",
        inputHash,
        result: summary,
        model: env.aiModel,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      });

      return summary;
    } catch (error: any) {
      logger.error("AI Provider failed to generate daily summary", { error: error.message });
      throw new Error("AI analysis is temporarily unavailable.");
    }
  }
}

export const dailySummaryService = new DailySummaryService();
