import { CoachingContext, CoachingResponseDTO } from "../types/aiCoaching.types";
import { AIProvider } from "./aiProvider.service";
import { aiAnalysisCacheRepository } from "../repositories/aiAnalysisCache.repository";
import { userRepository } from "../repositories/user.repository";
import { workoutSessionRepository } from "../repositories/workoutSession.repository";
import { analyticsService } from "./analytics.service";
import { nutritionService } from "./nutrition.service";
import { nutritionTargetService } from "./nutritionTarget.service";
import { progressService } from "./progress.service";
import { hashContext } from "../utils/hashContext";
import { env } from "../config/env";
import logger from "../utils/logger";

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

class AICoachingService {
  public async getCoaching(userId: string, date: string): Promise<CoachingResponseDTO> {
    const user: any = await userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // 1. Gather deterministic domain data
    const [
      readiness,
      recentWorkoutsRaw,
      nutritionSummary,
      activeWorkout,
      progressHistory
    ] = await Promise.all([
      analyticsService.getTrainingReadiness(userId).catch(() => null),
      workoutSessionRepository.getRecentCompletedSessions(userId, 3).catch(() => []),
      nutritionService.getSummary(userId, date).catch(() => null),
      workoutSessionRepository.findActiveSession(userId).catch(() => null),
      progressService.getProgressHistory(userId).catch(() => [])
    ]);

    const nutritionTargets = nutritionTargetService.calculateTargets(user);

    let progressData = null;
    if (progressHistory && progressHistory.length > 0) {
      const current = progressHistory[0];
      const previous = progressHistory.length > 1 ? progressHistory[1] : null;
      let trend = "stable";
      if (previous && current.weight && previous.weight) {
        if (current.weight > previous.weight) trend = "increasing";
        if (current.weight < previous.weight) trend = "decreasing";
      }
      progressData = {
        currentWeight: current.weight || null,
        trend
      };
    }

    let nutritionStatus = null;
    if (nutritionSummary && nutritionTargets?.calories) {
      if (nutritionSummary.totalCalories >= nutritionTargets.calories) {
        nutritionStatus = "target_reached";
      } else if (nutritionSummary.totalCalories >= nutritionTargets.calories * 0.85) {
        nutritionStatus = "on_track";
      } else {
        nutritionStatus = "below_target";
      }
    }

    // 2. Build Bounded Context
    const context: CoachingContext = {
      date,
      userProfile: {
        fitnessGoal: user.fitnessGoal || null,
        experienceLevel: user.experienceLevel || null,
        gender: user.gender || null
      },
      readiness: readiness ? {
        overallScore: readiness.overallScore,
        status: readiness.status,
        fatiguedMuscles: readiness.muscleGroups.filter(m => m.status === 'recent' || m.status === 'light').map(m => m.muscle),
        freshMuscles: readiness.muscleGroups.filter(m => m.status === 'ready').map(m => m.muscle)
      } : null,
      recentWorkouts: recentWorkoutsRaw.map(w => ({
        name: w.workoutName,
        volume: w.totalVolume,
        exerciseCount: w.exerciseCount,
        date: w.completedAt
      })),
      nutrition: nutritionSummary ? {
        caloriesConsumed: nutritionSummary.totalCalories,
        calorieTarget: nutritionTargets?.calories || null,
        proteinConsumed: nutritionSummary.totalProtein,
        proteinTarget: nutritionTargets?.protein || null,
        status: nutritionStatus
      } : null,
      progress: progressData,
      activeWorkoutId: activeWorkout ? activeWorkout._id.toString() : null
    };

    // 3. Cache Check
    const inputHash = hashContext(context);
    const cached = await aiAnalysisCacheRepository.findValid({
      userId,
      date,
      type: "coaching",
      inputHash,
    });

    if (cached) {
      logger.info("Returning cached AI coaching", { userId, date });
      return cached.result as CoachingResponseDTO;
    }

    // 4. Provider Call
    try {
      const coachingResponse = await AIProvider.generateCoaching(userId, context);

      // Cache only successful responses
      await aiAnalysisCacheRepository.save({
        userId,
        date,
        type: "coaching",
        inputHash,
        result: coachingResponse,
        model: env.aiModel,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      });

      return coachingResponse;
    } catch (error: any) {
      logger.error("AICoachingService failed", { error: error.message, userId, date });
      throw new Error("AI Coach is currently resting.");
    }
  }
}

export const aiCoachingService = new AICoachingService();
