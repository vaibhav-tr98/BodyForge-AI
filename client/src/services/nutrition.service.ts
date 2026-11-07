import { api } from "./api";
import type { 
  NutritionEntry, 
  CreateNutritionEntryRequest, 
  UpdateNutritionEntryRequest, 
  NutritionSummary,
  NutritionHistoryResponse,
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

export const getNutritionHistory = async (params?: {
  startDate?: string;
  endDate?: string;
  days?: number;
  timezone?: string;
}): Promise<NutritionHistoryResponse> => {
  const query = new URLSearchParams();
  if (params?.startDate) query.append("startDate", params.startDate);
  if (params?.endDate) query.append("endDate", params.endDate);
  if (params?.days) query.append("days", params.days.toString());
  if (params?.timezone) query.append("timezone", params.timezone);
  else if (typeof Intl !== "undefined") {
    query.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  }

  const queryString = query.toString();
  const url = `/api/nutrition/history${queryString ? `?${queryString}` : ""}`;
  const response = await api.get<ApiResponse<NutritionHistoryResponse>>(url);
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

export const analyzeLog = async (text: string): Promise<any> => {
  const response = await api.post<ApiResponse<any>>(`/api/nutrition/analyze-log`, { text });
  return response.data.data!;
};
