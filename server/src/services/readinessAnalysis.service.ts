import { AIProvider } from "./aiProvider.service";
import { analyticsService } from "./analytics.service";
import { ReadinessAnalysisContext, ReadinessAnalysisDTO } from "../types/readinessAnalysis.types";
import logger from "../utils/logger";

export class ReadinessAnalysisService {
  public async getReadinessAnalysis(userId: string): Promise<ReadinessAnalysisDTO> {
    const trainingReadiness = await analyticsService.getTrainingReadiness(userId);

    // If there is no training history, return deterministic default without invoking AI.
    if (!trainingReadiness || trainingReadiness.status === "no_history") {
      return {
        summary: "You don't have enough training history for a personalized readiness analysis.",
        positives: ["You are ready to begin your fitness journey!"],
        attention: ["Build up your training history to get personalized insights."],
        nextAction: "Complete a few workouts so we can establish your readiness baseline."
      };
    }

    const context: ReadinessAnalysisContext = {
      overallScore: trainingReadiness.overallScore,
      status: trainingReadiness.status,
      recommendationReason: trainingReadiness.recommendation.reason,
      muscleGroups: trainingReadiness.muscleGroups.map(m => ({
        muscle: m.muscle,
        readinessScore: m.readinessScore,
        status: m.status,
        daysSinceLastTrained: m.daysSinceLastTrained
      }))
    };

    try {
      const aiResponse = await AIProvider.generateReadinessAnalysis(context);
      return aiResponse;
    } catch (error) {
      logger.error("AI Readiness Analysis failed:", error);
      throw new Error("AI analysis is temporarily unavailable.");
    }
  }
}

export const readinessAnalysisService = new ReadinessAnalysisService();
