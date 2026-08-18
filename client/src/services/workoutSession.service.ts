import { api } from "./api";
import type {
  ApiResponse,
  WorkoutSession,
  UpdateWorkoutSessionRequest,
} from "../types";

export async function startWorkout(workoutId: string): Promise<WorkoutSession> {
  const { data } = await api.post<ApiResponse<{ session: WorkoutSession }>>(
    "/api/workout-sessions",
    { workoutId }
  );
  if (!data.data) {
    throw new Error(data.message ?? "Failed to start workout session");
  }
  return data.data.session;
}

export async function getActiveWorkout(): Promise<WorkoutSession | null> {
  const { data } = await api.get<ApiResponse<{ session: WorkoutSession | null }>>(
    "/api/workout-sessions/active"
  );
  if (!data.data) {
    throw new Error(data.message ?? "Failed to retrieve active session");
  }
  return data.data.session;
}

export async function getWorkoutSessions(
  page: number = 1,
  limit: number = 10
): Promise<{ sessions: WorkoutSession[]; total: number; page: number; limit: number }> {
  const { data } = await api.get<
    ApiResponse<{
      sessions: WorkoutSession[];
      total: number;
      page: number;
      limit: number;
    }>
  >(`/api/workout-sessions?page=${page}&limit=${limit}`);
  
  if (!data.data) {
    throw new Error(data.message ?? "Failed to retrieve workout sessions");
  }
  return data.data;
}

export async function getWorkoutSession(id: string): Promise<WorkoutSession> {
  const { data } = await api.get<ApiResponse<{ session: WorkoutSession }>>(
    `/api/workout-sessions/${id}`
  );
  if (!data.data) {
    throw new Error(data.message ?? "Failed to retrieve workout session");
  }
  return data.data.session;
}

export async function updateWorkoutSession(
  id: string,
  sessionData: UpdateWorkoutSessionRequest
): Promise<WorkoutSession> {
  const { data } = await api.patch<ApiResponse<{ session: WorkoutSession }>>(
    `/api/workout-sessions/${id}`,
    sessionData
  );
  if (!data.data) {
    throw new Error(data.message ?? "Failed to update workout session");
  }
  return data.data.session;
}

export async function completeWorkoutSession(id: string): Promise<import("../types").CompleteSessionResponse> {
  const { data } = await api.post<ApiResponse<import("../types").CompleteSessionResponse>>(
    `/api/workout-sessions/${id}/complete`
  );
  if (!data.data) {
    throw new Error(data.message ?? "Failed to complete workout session");
  }
  return data.data;
}
