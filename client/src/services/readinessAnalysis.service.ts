import { api } from "./api";
import type { ReadinessAnalysisDTO } from "../types/readinessAnalysis";

export const getReadinessAnalysis = async (): Promise<ReadinessAnalysisDTO> => {
  const response = await api.get("/api/analytics/readiness-analysis");
  return response.data;
};
