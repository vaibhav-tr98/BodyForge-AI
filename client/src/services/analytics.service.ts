import { api } from "./api";
import type { ApiResponse, DashboardAnalytics, ExerciseProgress } from "../types";

class AnalyticsService {
  public async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    const response = await api.get<ApiResponse<DashboardAnalytics>>("/analytics/dashboard");
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch dashboard analytics");
    }
    return response.data.data;
  }

  public async getExerciseProgress(exerciseName: string): Promise<ExerciseProgress> {
    const response = await api.get<ApiResponse<ExerciseProgress>>(`/analytics/exercise/${encodeURIComponent(exerciseName)}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch exercise progress");
    }
    return response.data.data;
  }

  public async getPersonalRecords(): Promise<import("../types").PRAndInsightsResponse> {
    const response = await api.get<ApiResponse<import("../types").PRAndInsightsResponse>>("/analytics/personal-records");
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch personal records");
    }
    return response.data.data;
  }

  public async getExercisePersonalRecord(exerciseName: string): Promise<import("../types").PersonalRecord> {
    const response = await api.get<ApiResponse<import("../types").PersonalRecord>>(`/analytics/personal-records/${encodeURIComponent(exerciseName)}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch exercise personal record");
    }
    return response.data.data;
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
