import { api } from "./api";
import type {
  ApiResponse,
  CreateWorkoutRequest,
  UpdateWorkoutRequest,
  Workout,
} from "../types";

import type { WorkoutRecommendationResponse } from "../types";

export async function getTodayRecommendation(): Promise<WorkoutRecommendationResponse> {
  const { data } = await api.get<ApiResponse<WorkoutRecommendationResponse>>("/api/workouts/recommendation/today");
  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to retrieve workout recommendation");
  }
  return data.data;
}

export async function getWorkouts(): Promise<Workout[]> {
  const { data } = await api.get<ApiResponse<{ workouts: Workout[] }>>(
    "/api/workouts",
  );
  if (!data.data) {
    throw new Error(data.message ?? "Failed to retrieve workouts");
  }
  return data.data.workouts;
}

export async function getWorkoutById(id: string): Promise<Workout> {
  const { data } = await api.get<ApiResponse<{ workout: Workout }>>(
    `/api/workouts/${id}`,
  );
  if (!data.data) {
    throw new Error(data.message ?? "Failed to retrieve workout");
  }
  return data.data.workout;
}

export async function createWorkout(
  workoutData: CreateWorkoutRequest,
): Promise<Workout> {
  const { data } = await api.post<ApiResponse<{ workout: Workout }>>(
    "/api/workouts",
    workoutData,
  );
  if (!data.data) {
    throw new Error(data.message ?? "Failed to create workout");
  }
  return data.data.workout;
}

export async function updateWorkout(
  id: string,
  workoutData: UpdateWorkoutRequest,
): Promise<Workout> {
  const { data } = await api.patch<ApiResponse<{ workout: Workout }>>(
    `/api/workouts/${id}`,
    workoutData,
  );
  if (!data.data) {
    throw new Error(data.message ?? "Failed to update workout");
  }
  return data.data.workout;
}

export async function deleteWorkout(id: string): Promise<void> {
  const { data } = await api.delete<ApiResponse<null>>(`/api/workouts/${id}`);
  if (!data.success) {
    throw new Error(data.message ?? "Failed to delete workout");
  }
}
