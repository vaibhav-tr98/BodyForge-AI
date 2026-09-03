import { ProgressAnalysisContext, ProgressAnalysisDTO } from "../types/progressAnalysis.types";
import { AIProvider } from "./aiProvider.service";
import { progressService } from "./progress.service";
import { analyticsService } from "./analytics.service";
import { workoutRecommendationService } from "./workoutRecommendation.service";
import { nutritionService } from "./nutrition.service";
import { nutritionTargetService } from "./nutritionTarget.service";
import { progressInsightService } from "./progressInsight.service";
import { userRepository } from "../repositories/user.repository";
import { aiAnalysisCacheRepository } from "../repositories/aiAnalysisCache.repository";
import { hashContext } from "../utils/hashContext";
import { env } from "../config/env";
import logger from "../utils/logger";

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export class ProgressAnalysisService {
  public async getProgressAnalysis(userId: string, date: string): Promise<ProgressAnalysisDTO> {
    const historyDesc = await progressService.getProgressHistory(userId);

    if (!historyDesc || historyDesc.length < 2) {
      return {
        summary: "Add more progress measurements to unlock AI progress analysis.",
        positives: [],
        attention: [],
        nextAction: "Record another progress measurement so BodyForge can identify a meaningful trend."
      };
    }

    const current = historyDesc[0];
    const previous = historyDesc[1];

    const currentWeight = current.weight || null;
    const previousWeight = previous.weight || null;
    const weightChange = currentWeight !== null && previousWeight !== null ? Number((currentWeight - previousWeight).toFixed(2)) : null;

    const currentBodyFat = current.bodyFatPercentage ?? null;
    const previousBodyFat = previous.bodyFatPercentage ?? null;
    const bodyFatChange = currentBodyFat !== null && previousBodyFat !== null ? Number((currentBodyFat - previousBodyFat).toFixed(2)) : null;

    const currentWaist = current.waist || null;
    const previousWaist = previous.waist || null;
    const waistChange = currentWaist !== null && previousWaist !== null ? Number((currentWaist - previousWaist).toFixed(2)) : null;

    const readiness = await analyticsService.getTrainingReadiness(userId);
    const readinessScore = readiness?.overallScore ?? null;
    const readinessStatus = readiness?.status ?? null;

    const workoutRecommendationRes = await workoutRecommendationService.getTodayRecommendation(userId, date);
    const workoutName = workoutRecommendationRes.recommendation?.workoutName ?? null;

    const user = await userRepository.findById(userId);
    const targets = user ? nutritionTargetService.calculateTargets(user as any) : null;
    const nutritionSummary = await nutritionService.getSummary(userId, date);

    const deterministicInsight = await progressInsightService.getProgressInsight(userId);

    const context: ProgressAnalysisContext = {
      currentWeight,
      previousWeight,
      weightChange,
      currentBodyFat,
      previousBodyFat,
      bodyFatChange,
      currentWaist,
      previousWaist,
      waistChange,
      daysTracked: historyDesc.length,
      readinessScore,
      readinessStatus,
      workoutName,
      caloriesTarget: targets ? targets.calories : null,
      caloriesConsumed: nutritionSummary.totalCalories,
      proteinTarget: targets ? targets.protein : null,
      proteinConsumed: nutritionSummary.totalProtein,
      deterministicProgressInsight: deterministicInsight.message
    };

    // --- Cache check ---
    const inputHash = hashContext(context);
    const cached = await aiAnalysisCacheRepository.findValid({
      userId,
      date,
      type: "progress",
      inputHash,
    });
    if (cached) {
      logger.info("Returning cached progress analysis", { userId, date });
      return cached.result as ProgressAnalysisDTO;
    }

    // --- Gemini call ---
    try {
      const aiResponse = await AIProvider.generateStructuredAnalysis(context);

      // Save to cache only on success
      await aiAnalysisCacheRepository.save({
        userId,
        date,
        type: "progress",
        inputHash,
        result: aiResponse,
        model: env.aiModel,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      });

      return aiResponse;
    } catch (error) {
      logger.error("AI Progress Analysis failed", { userId, date, error });
      throw new Error("AI analysis is temporarily unavailable.");
    }
  }
}

export const progressAnalysisService = new ProgressAnalysisService();
