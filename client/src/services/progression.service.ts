import { api } from "./api";
import type { ApiResponse, ProgressionResponse } from "../types";

export const getExerciseRecommendation = async (
  exerciseName: string,
  plannedSets: number,
  plannedReps: number
): Promise<ProgressionResponse> => {
  const response = await api.get<ApiResponse<ProgressionResponse>>(
    `/api/progression/${encodeURIComponent(exerciseName)}`,
    {
      params: {
        plannedSets,
        plannedReps,
      },
    }
  );
  return response.data.data as ProgressionResponse;
};
