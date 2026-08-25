import { api } from "./api";
import type { ApiResponse, DashboardAnalytics, ExerciseProgress } from "../types";

class AnalyticsService {
  public async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    const response = await api.get<ApiResponse<DashboardAnalytics>>("/api/analytics/dashboard");
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch dashboard analytics");
    }
    return response.data.data;
  }

  public async getExerciseProgress(exerciseName: string): Promise<ExerciseProgress> {
    const response = await api.get<ApiResponse<ExerciseProgress>>(`/api/analytics/exercise/${encodeURIComponent(exerciseName)}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch exercise progress");
    }
    return response.data.data;
  }

  public async getPersonalRecords(): Promise<import("../types").PRAndInsightsResponse> {
    const response = await api.get<ApiResponse<import("../types").PRAndInsightsResponse>>("/api/analytics/personal-records");
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch personal records");
    }
    return response.data.data;
  }

  public async getExercisePersonalRecord(exerciseName: string): Promise<import("../types").PersonalRecord> {
    const response = await api.get<ApiResponse<import("../types").PersonalRecord>>(`/api/analytics/personal-records/${encodeURIComponent(exerciseName)}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch exercise personal record");
    }
    return response.data.data;
  }

  public async getTrainingReadiness(): Promise<import("../types").TrainingReadiness | null> {
    const response = await api.get<ApiResponse<import("../types").TrainingReadiness | null>>("/api/analytics/readiness");
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to fetch training readiness");
    }
    return response.data.data || null;
  }
  public async getInsight(date: string): Promise<import("../types/insight.types").BodyForgeInsightDTO> {
    const response = await api.get<ApiResponse<import("../types/insight.types").BodyForgeInsightDTO>>(`/api/analytics/insight?date=${encodeURIComponent(date)}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch bodyforge insight");
    }
    return response.data.data;
  }

  public async getProgressInsight(date: string): Promise<import("../types/progressInsight.types").ProgressInsightDTO> {
    const response = await api.get<ApiResponse<import("../types/progressInsight.types").ProgressInsightDTO>>(`/api/analytics/progress-insight?date=${encodeURIComponent(date)}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch progress insight");
    }
    return response.data.data;
  }

  public async getProgressAnalysis(date: string): Promise<import("../types/progressAnalysis.types").ProgressAnalysisDTO> {
    const response = await api.get<ApiResponse<import("../types/progressAnalysis.types").ProgressAnalysisDTO>>(`/api/analytics/progress-analysis?date=${encodeURIComponent(date)}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch progress analysis");
    }
    return response.data.data;
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
