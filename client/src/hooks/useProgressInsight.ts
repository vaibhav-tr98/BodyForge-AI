import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../services/analytics.service";
import type { ProgressInsightDTO } from "../types/progressInsight.types";

export function useProgressInsight(date: string) {
  return useQuery<ProgressInsightDTO, Error>({
    queryKey: ["progress-insight", date],
    queryFn: () => analyticsService.getProgressInsight(date),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!date,
  });
}
