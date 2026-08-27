import { useQuery } from "@tanstack/react-query";
import { getReadinessAnalysis } from "../services/readinessAnalysis.service";

export const useReadinessAnalysis = () => {
  return useQuery({
    queryKey: ["readinessAnalysis"],
    queryFn: () => getReadinessAnalysis(),
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 1
  });
};
