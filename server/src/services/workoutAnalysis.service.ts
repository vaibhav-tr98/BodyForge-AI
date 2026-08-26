import { WorkoutAnalysisContext, WorkoutAnalysisDTO } from "../types/workoutAnalysis.types";
import { AIProvider } from "./aiProvider.service";
import { analyticsService } from "./analytics.service";
import { workoutRecommendationService } from "./workoutRecommendation.service";
import { userRepository } from "../repositories/user.repository";

export class WorkoutAnalysisService {
  public async getWorkoutAnalysis(userId: string, date: string): Promise<WorkoutAnalysisDTO> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const readiness = await analyticsService.getTrainingReadiness(userId);
    const recommendation = await workoutRecommendationService.getTodayRecommendation(userId, date);
    const recentInsights = await analyticsService.getPersonalRecordsAndInsights(userId);

    // If no readiness and no recent insights and no recommendation (e.g. brand new user)
    if (!readiness && (!recentInsights || recentInsights.insights.length === 0) && !recommendation?.recommendation) {
      return {
        summary: "No workout history available yet.",
        positives: [],
        attention: [],
        nextAction: "Complete your first workout to start receiving AI analysis."
      };
    }

    let recentWorkoutCount7Days = 0;
    let recentWorkoutCount14Days = 0;

    if (readiness?.muscleGroups) {
      const uniqueSessions7Days = new Set<string>();
      const uniqueSessions14Days = new Set<string>();
      // muscleGroups readiness computes sessions per muscle, but actually it tracks sets of session IDs.
      // Wait, we don't have direct access to session IDs from readiness here.
      // We can just estimate or use total readiness if we can't extract the exact number of workouts easily.
      // Let's omit exact workout count if we can't get it cheaply, or fetch it.
      // Wait, getTrainingReadiness returns overallScore, status, recommendation, muscleGroups.
      // muscleGroups has sessionsLast7Days and sessionsLast14Days counts.
      // Taking the max across muscles gives a rough count of workouts.
      readiness.muscleGroups.forEach(m => {
        if (m.sessionsLast7Days > recentWorkoutCount7Days) recentWorkoutCount7Days = m.sessionsLast7Days;
        if (m.sessionsLast14Days > recentWorkoutCount14Days) recentWorkoutCount14Days = m.sessionsLast14Days;
      });
    }

    const context: WorkoutAnalysisContext = {
      date,
      overallReadinessScore: readiness?.overallScore ?? null,
      overallReadinessStatus: readiness?.status ?? null,
      readinessRecommendationReason: readiness?.recommendation?.reason ?? null,
      readyMuscleGroups: readiness?.status === "ready" || readiness?.status === "moderate" 
        ? readiness.muscleGroups.filter(m => m.status === "ready").map(m => m.muscle) 
        : [],
      
      todayWorkoutRecommendationName: recommendation?.recommendation?.workoutName ?? null,
      todayWorkoutRecommendationReason: recommendation?.recommendation?.reason ?? null,
      
      recentWorkoutCount7Days,
      recentWorkoutCount14Days,
      
      recentPRs: recentInsights?.personalRecords?.slice(0, 3).map((pr: any) => ({
        exerciseName: pr.exerciseName,
        bestWeight: pr.bestWeight,
        bestReps: pr.bestReps,
        achievedAt: pr.achievedAt
      })) || null,
    };

    try {
      return await AIProvider.generateWorkoutAnalysis(context);
    } catch (error) {
      console.error("AI Workout Analysis failed:", error);
      throw new Error("AI analysis is temporarily unavailable.");
    }
  }
}

export const workoutAnalysisService = new WorkoutAnalysisService();
