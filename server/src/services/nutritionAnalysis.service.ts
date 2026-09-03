import { NutritionAnalysisContext, NutritionAnalysisDTO } from "../types/nutritionAnalysis.types";
import { AIProvider } from "./aiProvider.service";
import { nutritionService } from "./nutrition.service";
import { nutritionTargetService } from "./nutritionTarget.service";
import { workoutRecommendationService } from "./workoutRecommendation.service";
import { userRepository } from "../repositories/user.repository";
import { aiAnalysisCacheRepository } from "../repositories/aiAnalysisCache.repository";
import { hashContext } from "../utils/hashContext";
import { env } from "../config/env";
import logger from "../utils/logger";

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export class NutritionAnalysisService {
  public async getNutritionAnalysis(userId: string, date: string): Promise<NutritionAnalysisDTO> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const summary = await nutritionService.getSummary(userId, date);

    // Check if any nutrition entries exist for this day
    if (
      summary.totalCalories === 0 &&
      summary.totalProtein === 0 &&
      summary.totalCarbs === 0 &&
      summary.totalFat === 0
    ) {
      return {
        summary: "No nutrition logged for today.",
        positives: [],
        attention: [],
        nextAction: "Log your meals to receive AI nutrition analysis.",
      };
    }

    const targets = nutritionTargetService.calculateTargets(user as any);

    let caloriePercentage = null;
    let proteinPercentage = null;
    let nutritionStatus: string | null = null;

    if (targets && targets.calories > 0) {
      caloriePercentage = Math.round((summary.totalCalories / targets.calories) * 100);
      proteinPercentage =
        targets.protein > 0
          ? Math.round((summary.totalProtein / targets.protein) * 100)
          : null;

      if (summary.totalCalories >= targets.calories) {
        nutritionStatus = "target_reached";
      } else if (summary.totalCalories >= targets.calories * 0.85) {
        nutritionStatus = "on_track";
      } else {
        nutritionStatus = "below_target";
      }
    }

    const workoutRec = await workoutRecommendationService.getTodayRecommendation(userId, date);

    const context: NutritionAnalysisContext = {
      date,
      caloriesConsumed: summary.totalCalories,
      calorieTarget: targets?.calories ?? null,
      caloriePercentage,
      proteinConsumed: summary.totalProtein,
      proteinTarget: targets?.protein ?? null,
      proteinPercentage,
      carbsConsumed: summary.totalCarbs,
      fatConsumed: summary.totalFat,
      fitnessGoal: user.fitnessGoal ?? null,
      nutritionStatus,
      workoutRecommendationName: workoutRec.recommendation?.workoutName ?? null,
    };

    // --- Cache check ---
    const inputHash = hashContext(context);
    const cached = await aiAnalysisCacheRepository.findValid({
      userId,
      date,
      type: "nutrition",
      inputHash,
    });
    if (cached) {
      logger.info("Returning cached nutrition analysis", { userId, date });
      return cached.result as NutritionAnalysisDTO;
    }

    // --- Gemini call ---
    try {
      const aiResponse = await AIProvider.generateNutritionAnalysis(context);

      // Save to cache only on success
      await aiAnalysisCacheRepository.save({
        userId,
        date,
        type: "nutrition",
        inputHash,
        result: aiResponse,
        model: env.aiModel,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      });

      return aiResponse;
    } catch (error) {
      logger.error("AI Nutrition Analysis failed", { userId, date });
      throw new Error("AI analysis is temporarily unavailable.");
    }
  }
}

export const nutritionAnalysisService = new NutritionAnalysisService();
