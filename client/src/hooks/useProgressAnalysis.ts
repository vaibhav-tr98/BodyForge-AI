import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../services/analytics.service";
import type { ProgressAnalysisDTO } from "../types/progressAnalysis.types";

export const useProgressAnalysis = (date: string) => {
  return useQuery<ProgressAnalysisDTO, Error>({
    queryKey: ["progress-analysis", date],
    queryFn: () => analyticsService.getProgressAnalysis(date),
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 1, // Only retry once to avoid unnecessary API costs if failing
    refetchOnWindowFocus: false,
  });
};
