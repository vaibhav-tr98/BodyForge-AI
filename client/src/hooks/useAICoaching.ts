import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface CoachingResponseDTO {
  summary: string;
  primaryAction: string;
  trainingGuidance: {
    status: 'ready' | 'light' | 'rest';
    recommendation: string;
  };
  nutritionGuidance: {
    status: 'on_track' | 'needs_attention';
    recommendation: string;
  };
  progressInsight: {
    observation: string;
  };
}

export const useAICoaching = (date: string) => {
  return useQuery<CoachingResponseDTO, Error>({
    queryKey: ['ai-coaching', date],
    queryFn: async () => {
      const { data } = await axios.get(`/api/analytics/coaching?date=${date}`);
      return data.data;
    },
    staleTime: 4 * 60 * 60 * 1000, // 4 hours
    refetchOnWindowFocus: false,
    retry: 1, // Only retry once since backend handles Gemini retries
  });
};
