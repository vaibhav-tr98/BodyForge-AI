import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../services/analytics.service";
import type { WorkoutAnalysisDTO } from "../types/workoutAnalysis.types";

export const useWorkoutAnalysis = (date: string) => {
  return useQuery<WorkoutAnalysisDTO, Error>({
    queryKey: ["workout-analysis", date],
    queryFn: () => analyticsService.getWorkoutAnalysis(date),
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
};
