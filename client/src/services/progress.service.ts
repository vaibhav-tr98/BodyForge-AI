import { api } from "./api";
import type {
  ProgressEntry,
  CreateProgressEntryRequest,
  UpdateProgressEntryRequest,
  ProgressSummary,
  ApiResponse
} from "../types";

export const getProgressHistory = async (): Promise<ProgressEntry[]> => {
  const response = await api.get<ApiResponse<{ history: ProgressEntry[] }>>("/api/progress");
  return response.data.data?.history || [];
};

export const getProgressSummary = async (): Promise<ProgressSummary> => {
  const response = await api.get<ApiResponse<{ summary: ProgressSummary }>>("/api/progress/summary");
  return response.data.data!.summary;
};

export const getProgressEntry = async (id: string): Promise<ProgressEntry> => {
  const response = await api.get<ApiResponse<{ entry: ProgressEntry }>>(`/api/progress/${id}`);
  return response.data.data!.entry;
};

export const createProgressEntry = async (data: CreateProgressEntryRequest): Promise<ProgressEntry> => {
  const response = await api.post<ApiResponse<{ entry: ProgressEntry }>>("/api/progress", data);
  return response.data.data!.entry;
};

export const updateProgressEntry = async (id: string, data: UpdateProgressEntryRequest): Promise<ProgressEntry> => {
  const response = await api.patch<ApiResponse<{ entry: ProgressEntry }>>(`/api/progress/${id}`, data);
  return response.data.data!.entry;
};

export const deleteProgressEntry = async (id: string): Promise<void> => {
  await api.delete(`/api/progress/${id}`);
};
