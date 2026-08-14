import { api } from "./api";

export interface Exercise {
  id: string;
  name: string;
  category?: string;
  equipment?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  instructions: string[];
}

export interface PaginatedExercises {
  exercises: Exercise[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExerciseSearchParams {
  q?: string;
  muscle?: string;
  equipment?: string;
  difficulty?: "beginner" | "intermediate" | "advanced" | "";
  page?: number;
  limit?: number;
}

export const getExercises = async (params: ExerciseSearchParams): Promise<PaginatedExercises> => {
  const response = await api.get<{ success: boolean; data: PaginatedExercises }>("/api/exercises", { params });
  return response.data.data;
};

export const getExerciseById = async (id: string): Promise<Exercise> => {
  const response = await api.get<{ success: boolean; data: { exercise: Exercise } }>(`/api/exercises/${id}`);
  return response.data.data.exercise;
};
