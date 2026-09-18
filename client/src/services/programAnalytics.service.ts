
import { api } from "./api";

export interface ProgramAnalytics {
  programId: string;
  adherence: {
    percentage: number;
    scheduledDaysElapsed: number;
    completedSessions: number;
  };
  volume: {
    totalCompletedSets: number;
    totalReps: number;
    exerciseVolume: {
      exerciseName: string;
      completedSets: number;
      totalReps: number;
      loadVolume: number;
    }[];
  };
}

export const getProgramAnalytics = async (programId: string): Promise<ProgramAnalytics> => {
  const response = await api.get(`/api/programs/${programId}/analytics`);
  return response.data.data;
};

