import { api } from "./api";
import type { 
  NutritionEntry, 
  CreateNutritionEntryRequest, 
  UpdateNutritionEntryRequest, 
  NutritionSummary,
  NutritionOverview,
  ApiResponse,
  NutritionFood
} from "../types";

export const searchFoods = async (query: string): Promise<NutritionFood[]> => {
  const response = await api.get<ApiResponse<NutritionFood[]>>(`/api/nutrition/foods/search?q=${query}`);
  return response.data.data || [];
};

export const getNutritionEntries = async (date: string): Promise<NutritionEntry[]> => {
  const response = await api.get<ApiResponse<NutritionEntry[]>>(`/api/nutrition?date=${date}`);
  return response.data.data || [];
};

export const getNutritionSummary = async (date: string): Promise<NutritionSummary> => {
  const response = await api.get<ApiResponse<NutritionSummary>>(`/api/nutrition/summary?date=${date}`);
  return response.data.data!;
};

export const createNutritionEntry = async (data: CreateNutritionEntryRequest): Promise<NutritionEntry> => {
  const response = await api.post<ApiResponse<NutritionEntry>>("/api/nutrition", data);
  return response.data.data!;
};

export const updateNutritionEntry = async (id: string, data: UpdateNutritionEntryRequest): Promise<NutritionEntry> => {
  const response = await api.patch<ApiResponse<NutritionEntry>>(`/api/nutrition/${id}`, data);
  return response.data.data!;
};

export const deleteNutritionEntry = async (id: string): Promise<void> => {
  await api.delete(`/api/nutrition/${id}`);
};

export const getTodayOverview = async (date?: string): Promise<NutritionOverview> => {
  const url = date ? `/api/nutrition/today-overview?date=${date}` : `/api/nutrition/today-overview`;
  const response = await api.get<ApiResponse<NutritionOverview>>(url);
  return response.data.data!;
};
