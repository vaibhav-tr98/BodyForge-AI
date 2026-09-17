
import { AppError } from "../errors/AppError";
import programRepository from "../repositories/program.repository";
import workoutSessionRepository from "../repositories/workoutSession.repository";
import { DateEngine } from "../utils/dateEngine";

export interface ProgramAnalyticsDTO {
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

class ProgramAnalyticsService {
  async getAnalytics(userId: string, programId: string): Promise<ProgramAnalyticsDTO> {
    const program = await programRepository.findByIdAndUser(programId, userId);
    if (!program) {
      throw new AppError("Program not found", 404);
    }

    const { daysElapsed, week: currentWeek, day: currentDay, hasStarted } = DateEngine.getProgramPosition(
      new Date(),
      program.startDate,
      program.timezone
    );

    const scheduledElapsedSet = new Set<string>();
    const completedSet = new Set<string>();

    if (hasStarted) {
      // 1. Build expectations from current schedule (past days only)
      for (let w = 0; w < program.weeks.length; w++) {
        for (let d = 0; d < 7; d++) {
          const workoutId = program.weeks[w].days[d].workoutId;
          if (workoutId) {
            const isPast = w < currentWeek || (w === currentWeek && d < currentDay);
            if (isPast) {
              scheduledElapsedSet.add(`${w}-${d}`);
            }
          }
        }
      }
    }

    const rawAnalytics = await workoutSessionRepository.getProgramAnalyticsData(userId, programId);

    // 2. Process historical completions
    if (hasStarted) {
      for (const comp of rawAnalytics.completedDays) {
        // Prevent counting sessions that are somehow in the future (out of bounds)
        const isFuture = comp.week > currentWeek || (comp.week === currentWeek && comp.day > currentDay);
        if (!isFuture) {
          const key = `${comp.week}-${comp.day}`;
          completedSet.add(key);
          
          // Rule: If it was completed, it MUST count as an elapsed scheduled day,
          // even if the user later mutated the current program schedule to a rest day.
          scheduledElapsedSet.add(key);
        }
      }
    }

    const scheduledDaysElapsedCount = scheduledElapsedSet.size;
    const completedSessionsCount = completedSet.size;

    const adherencePercentage = scheduledDaysElapsedCount > 0 
      ? Math.round((completedSessionsCount / scheduledDaysElapsedCount) * 100) 
      : 0;

    return {
      programId: program._id.toString(),
      adherence: {
        percentage: adherencePercentage,
        scheduledDaysElapsed: scheduledDaysElapsedCount,
        completedSessions: completedSessionsCount
      },
      volume: {
        totalCompletedSets: rawAnalytics.totalCompletedSets,
        totalReps: rawAnalytics.totalReps,
        exerciseVolume: rawAnalytics.exerciseVolume
      }
    };
  }
}

export const programAnalyticsService = new ProgramAnalyticsService();
export default programAnalyticsService;

