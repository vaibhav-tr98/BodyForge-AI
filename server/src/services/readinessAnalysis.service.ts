import { AIProvider } from "./aiProvider.service";
import { analyticsService } from "./analytics.service";
import { ReadinessAnalysisContext, ReadinessAnalysisDTO } from "../types/readinessAnalysis.types";
import { aiAnalysisCacheRepository } from "../repositories/aiAnalysisCache.repository";
import { hashContext } from "../utils/hashContext";
import { env } from "../config/env";
import logger from "../utils/logger";

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours — readiness changes faster than other analyses

export class ReadinessAnalysisService {
  public async getReadinessAnalysis(userId: string): Promise<ReadinessAnalysisDTO> {
    const trainingReadiness = await analyticsService.getTrainingReadiness(userId);

    // Deterministic fallback — no AI call if no training history
    if (!trainingReadiness || trainingReadiness.status === "no_history") {
      return {
        summary: "You don't have enough training history for a personalized readiness analysis.",
        positives: ["You are ready to begin your fitness journey!"],
        attention: ["Build up your training history to get personalized insights."],
        nextAction: "Complete a few workouts so we can establish your readiness baseline.",
      };
    }

    const context: ReadinessAnalysisContext = {
      overallScore: trainingReadiness.overallScore,
      status: trainingReadiness.status,
      recommendationReason: trainingReadiness.recommendation.reason,
      muscleGroups: trainingReadiness.muscleGroups.map((m) => ({
        muscle: m.muscle,
        readinessScore: m.readinessScore,
        status: m.status,
        daysSinceLastTrained: m.daysSinceLastTrained,
      })),
    };

    // --- Cache check (readiness has no specific date → use empty string) ---
    const date = "";
    const inputHash = hashContext(context);
    const cached = await aiAnalysisCacheRepository.findValid({
      userId,
      date,
      type: "readiness",
      inputHash,
    });
    if (cached) {
      logger.info("Returning cached readiness analysis", { userId });
      return cached.result as ReadinessAnalysisDTO;
    }

    // --- Gemini call ---
    try {
      const aiResponse = await AIProvider.generateReadinessAnalysis(context);

      await aiAnalysisCacheRepository.save({
        userId,
        date,
        type: "readiness",
        inputHash,
        result: aiResponse,
        model: env.aiModel,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      });

      return aiResponse;
    } catch (error) {
      logger.error("AI Readiness Analysis failed:", error);
      throw new Error("AI analysis is temporarily unavailable.");
    }
  }
}

export const readinessAnalysisService = new ReadinessAnalysisService();
