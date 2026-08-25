import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../services/analytics.service";
import type { NutritionAnalysisDTO } from "../types/nutritionAnalysis.types";

export const useNutritionAnalysis = (date: string) => {
  return useQuery<NutritionAnalysisDTO, Error>({
    queryKey: ["nutrition-analysis", date],
    queryFn: () => analyticsService.getNutritionAnalysis(date),
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 1, // Only retry once to avoid unnecessary API costs if failing
    refetchOnWindowFocus: false,
  });
};
