import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../services/analytics.service";
import type { WorkoutActivityResponse } from "../types";

export interface UseWorkoutActivityOptions {
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

export const useWorkoutActivity = (options?: UseWorkoutActivityOptions) => {
  const tz = options?.timezone || (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC") || "UTC";

  return useQuery<WorkoutActivityResponse, Error>({
    queryKey: ["analytics", "activity", options?.startDate, options?.endDate, tz],
    queryFn: () =>
      analyticsService.getWorkoutActivity({
        startDate: options?.startDate,
        endDate: options?.endDate,
        timezone: tz,
      }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
