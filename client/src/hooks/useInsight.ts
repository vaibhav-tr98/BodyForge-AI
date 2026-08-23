import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../services/analytics.service";
import type { BodyForgeInsightDTO } from "../types/insight.types";

export const useInsight = (date: string) => {
  return useQuery<BodyForgeInsightDTO, Error>({
    queryKey: ["insight", date],
    queryFn: () => analyticsService.getInsight(date),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};
