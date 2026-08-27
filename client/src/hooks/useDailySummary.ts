import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../services/analytics.service";
import type { DailySummaryDTO } from "../types/dailySummary.types";

export const useDailySummary = (date: string) => {
  return useQuery<DailySummaryDTO, Error>({
    queryKey: ["dailySummary", date],
    queryFn: () => analyticsService.getDailySummary(date),
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
