import { WorkoutAnalysisContext, WorkoutAnalysisDTO } from "../types/workoutAnalysis.types";
import { AIProvider } from "./aiProvider.service";
import { analyticsService } from "./analytics.service";
import { workoutRecommendationService } from "./workoutRecommendation.service";
import { userRepository } from "../repositories/user.repository";
import { aiAnalysisCacheRepository } from "../repositories/aiAnalysisCache.repository";
import { hashContext } from "../utils/hashContext";
import { env } from "../config/env";
import logger from "../utils/logger";

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export class WorkoutAnalysisService {
  public async getWorkoutAnalysis(userId: string, date: string): Promise<WorkoutAnalysisDTO> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const readiness = await analyticsService.getTrainingReadiness(userId);
    const recommendation = await workoutRecommendationService.getTodayRecommendation(userId, date);
    const recentInsights = await analyticsService.getPersonalRecordsAndInsights(userId);

    // Deterministic fallback for brand new users
    if (
      !readiness &&
      (!recentInsights || recentInsights.insights.length === 0) &&
      !recommendation?.recommendation
    ) {
      return {
        summary: "No workout history available yet.",
        positives: [],
        attention: [],
        nextAction: "Complete your first workout to start receiving AI analysis.",
      };
    }

    let recentWorkoutCount7Days = 0;
    let recentWorkoutCount14Days = 0;

    if (readiness?.muscleGroups) {
      readiness.muscleGroups.forEach((m) => {
        if (m.sessionsLast7Days > recentWorkoutCount7Days)
          recentWorkoutCount7Days = m.sessionsLast7Days;
        if (m.sessionsLast14Days > recentWorkoutCount14Days)
          recentWorkoutCount14Days = m.sessionsLast14Days;
      });
    }

    const context: WorkoutAnalysisContext = {
      date,
      overallReadinessScore: readiness?.overallScore ?? null,
      overallReadinessStatus: readiness?.status ?? null,
      readinessRecommendationReason: readiness?.recommendation?.reason ?? null,
      readyMuscleGroups:
        readiness?.status === "ready" || readiness?.status === "moderate"
          ? readiness.muscleGroups.filter((m) => m.status === "ready").map((m) => m.muscle)
          : [],

      todayWorkoutRecommendationName: recommendation?.recommendation?.workoutName ?? null,
      todayWorkoutRecommendationReason: recommendation?.recommendation?.reason ?? null,

      recentWorkoutCount7Days,
      recentWorkoutCount14Days,

      recentPRs:
        recentInsights?.personalRecords?.slice(0, 3).map((pr: any) => ({
          exerciseName: pr.exerciseName,
          heaviestWeight: pr.heaviestWeight,
          bestReps: pr.bestReps,
          lastPerformedAt: pr.lastPerformedAt,
        })) || null,
    };

    // --- Cache check ---
    const inputHash = hashContext(context);
    const cached = await aiAnalysisCacheRepository.findValid({
      userId,
      date,
      type: "workout",
      inputHash,
    });
    if (cached) {
      logger.info("Returning cached workout analysis", { userId, date });
      return cached.result as WorkoutAnalysisDTO;
    }

    // --- Gemini call ---
    try {
      const aiResponse = await AIProvider.generateWorkoutAnalysis(context);

      await aiAnalysisCacheRepository.save({
        userId,
        date,
        type: "workout",
        inputHash,
        result: aiResponse,
        model: env.aiModel,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      });

      return aiResponse;
    } catch (error) {
      logger.error("AI Workout Analysis failed", { userId, date });
      throw new Error("AI analysis is temporarily unavailable.");
    }
  }
}

export const workoutAnalysisService = new WorkoutAnalysisService();
