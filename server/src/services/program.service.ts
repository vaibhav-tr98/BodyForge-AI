import { AppError } from "../errors/AppError";
import { programRepository } from "../repositories/program.repository";
import Workout from "../models/Workout";
import { DateEngine } from "../utils/dateEngine";
import { Types } from "mongoose";
import WorkoutSession from "../models/WorkoutSession";

export interface ProgramDTO {
  id: string;
  name: string;
  goal?: string;
  startDate: string;
  timezone: string;
  status: "draft" | "active" | "completed" | "archived";
  weeks: Array<{
    days: Array<{
      dayIndex: number;
      workoutId: string | null;
    }>;
  }>;
}

export interface TodayScheduleDTO {
  hasActiveProgram: boolean;
  programId?: string;
  currentWeek?: number;
  currentDay?: number;
  isRestDay?: boolean;
  isCompletedToday?: boolean;
  isProgramFinished?: boolean;
  workout?: any; // The populated workout object if applicable
}

class ProgramService {
  private toDTO(program: any): ProgramDTO {
    return {
      id: program._id.toString(),
      name: program.name,
      goal: program.goal,
      startDate: program.startDate,
      timezone: program.timezone,
      status: program.status,
      weeks: program.weeks.map((week: any) => ({
        days: week.days.map((day: any) => ({
          dayIndex: day.dayIndex,
          workoutId: day.workoutId ? day.workoutId.toString() : null,
        })),
      })),
    };
  }

  private validateTimezone(timezone: string) {
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch (e) {
      throw new AppError("Invalid timezone", 400);
    }
  }

  private async validateWorkouts(userId: string, weeks: any[]) {
    const workoutIds = new Set<string>();
    for (const week of weeks) {
      if (week.days && Array.isArray(week.days)) {
        for (const day of week.days) {
          if (day.workoutId) {
            workoutIds.add(day.workoutId.toString());
          }
        }
      }
    }

    if (workoutIds.size > 0) {
      const idsArray = Array.from(workoutIds);
      const validWorkouts = await Workout.find({
        _id: { $in: idsArray },
        user: userId,
      });

      if (validWorkouts.length !== idsArray.length) {
        throw new AppError("One or more workouts are invalid or do not belong to you", 400);
      }
    }
  }

  async createProgram(userId: string, data: any): Promise<ProgramDTO> {
    if (data.timezone) {
      this.validateTimezone(data.timezone);
    }
    
    if (data.weeks) {
      await this.validateWorkouts(userId, data.weeks);
    }

    const programData = {
      ...data,
      user: new Types.ObjectId(userId),
      status: "draft", // Force draft on creation
    };

    const program = await programRepository.createProgram(programData);
    return this.toDTO(program);
  }

  async getPrograms(userId: string): Promise<ProgramDTO[]> {
    const programs = await programRepository.findAllByUser(userId);
    return programs.map(p => this.toDTO(p));
  }

  async getProgramById(programId: string, userId: string): Promise<ProgramDTO> {
    const program = await programRepository.findByIdAndUser(programId, userId);
    if (!program) {
      throw new AppError("Program not found", 404);
    }
    return this.toDTO(program);
  }

  async updateProgram(programId: string, userId: string, data: any): Promise<ProgramDTO> {
    const existing = await programRepository.findByIdAndUser(programId, userId);
    if (!existing) {
      throw new AppError("Program not found", 404);
    }

    if (data.timezone) {
      this.validateTimezone(data.timezone);
    }

    if (data.weeks) {
      await this.validateWorkouts(userId, data.weeks);
    }

    // Status transition validation
    if (data.status && data.status !== existing.status) {
      if (data.status === "active") {
        const activeProgram = await programRepository.findActiveProgram(userId);
        if (activeProgram && activeProgram._id.toString() !== existing._id.toString()) {
          const position = DateEngine.getProgramPosition(new Date(), activeProgram.startDate, activeProgram.timezone);
          const isFinished = position.week >= activeProgram.weeks.length;

          if (isFinished) {
            // Auto-complete the expired program so the new one can be activated
            await programRepository.updateProgram(activeProgram._id.toString(), userId, { status: "completed" });
          } else {
            throw new AppError("You already have an active program", 400);
          }
        }
      }
    }

    const updated = await programRepository.updateProgram(programId, userId, data);
    if (!updated) {
      throw new AppError("Failed to update program", 500);
    }
    return this.toDTO(updated);
  }

  async deleteProgram(programId: string, userId: string): Promise<void> {
    const existing = await programRepository.findByIdAndUser(programId, userId);
    if (!existing) {
      throw new AppError("Program not found", 404);
    }

    if (existing.status === "active" || existing.status === "completed") {
      throw new AppError(`Cannot delete program with status '${existing.status}'`, 400);
    }

    await programRepository.deleteProgram(programId, userId);
  }

  async getTodaySchedule(userId: string, now: Date = new Date()): Promise<TodayScheduleDTO> {
    const program = await programRepository.findActiveProgram(userId);
    if (!program) {
      return { hasActiveProgram: false };
    }

    const position = DateEngine.getProgramPosition(now, program.startDate, program.timezone);

    if (!position.hasStarted) {
      return {
        hasActiveProgram: true,
        programId: program._id.toString(),
        isProgramFinished: false,
      };
    }

    if (position.week >= program.weeks.length) {
      return {
        hasActiveProgram: true,
        programId: program._id.toString(),
        isProgramFinished: true,
      };
    }

    const currentWeekData = program.weeks[position.week];
    const currentDayData = currentWeekData.days.find(d => d.dayIndex === position.day);

    if (!currentDayData) {
      throw new AppError("Invalid schedule data", 500);
    }

    const isRestDay = !currentDayData.workoutId;
    
    // Check completion
    let isCompletedToday = false;
    const completedSession = await WorkoutSession.findOne({
      user: userId,
      programId: program._id,
      programWeek: position.week,
      programDay: position.day,
      status: "completed"
    });
    
    if (completedSession) {
      isCompletedToday = true;
    }

    let workout = null;
    if (!isRestDay && currentDayData.workoutId) {
      workout = await Workout.findById(currentDayData.workoutId);
    }

    return {
      hasActiveProgram: true,
      programId: program._id.toString(),
      currentWeek: position.week,
      currentDay: position.day,
      isRestDay,
      isCompletedToday,
      isProgramFinished: false,
      workout: workout ? {
        _id: workout._id.toString(),
        name: workout.name,
        description: workout.description,
      } : undefined,
    };
  }
}

// I need to import WorkoutSession at the top
export const programService = new ProgramService();
export default programService;
