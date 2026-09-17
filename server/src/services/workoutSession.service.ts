import { progressionService } from "./progression.service";
import { workoutRepository } from "../repositories/workout.repository";
import { workoutSessionRepository, WorkoutSessionUpdateData } from "../repositories/workoutSession.repository";
import { IWorkoutSession, IWorkoutSessionExercise } from "../models/WorkoutSession";
import { Types } from "mongoose";
import { AppError } from "../errors/AppError";
import { analyticsService } from "./analytics.service";
import { programService } from "./program.service";

export interface SafeWorkoutSessionSet {
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface SafeWorkoutSessionExercise {
  exerciseName: string;
  plannedSets: number;
  plannedReps: number;
  plannedWeight?: number;
  progressionInsight?: {
    reason: string;
    previousWeight?: number;
    previousReps?: number;
  };
  sets: SafeWorkoutSessionSet[];
}

export interface SafeWorkoutSession {
  id: string;
  workout: string | { _id: string; name: string; description?: string };
  startedAt: Date;
  completedAt?: Date | null;
  status: "active" | "completed";
  exercises: SafeWorkoutSessionExercise[];
  updatedAt: Date;
}

const toWorkoutSessionResponse = (session: any): SafeWorkoutSession => {
  return {
    id: session._id.toString(),
    workout: session.workout && (session.workout as any)._id ? {
      _id: (session.workout as any)._id.toString(),
      name: (session.workout as any).name,
      description: (session.workout as any).description,
    } : session.workout.toString(),
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    status: session.status,
    exercises: session.exercises.map((ex: any) => ({
      exerciseName: ex.exerciseName,
      plannedSets: ex.plannedSets,
      plannedReps: ex.plannedReps,
      plannedWeight: ex.plannedWeight,
      progressionInsight: ex.progressionInsight ? {
        reason: ex.progressionInsight.reason,
        previousWeight: ex.progressionInsight.previousWeight,
        previousReps: ex.progressionInsight.previousReps
      } : undefined,
      sets: ex.sets.map((set: any) => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        completed: set.completed,
      })),
    })),
    updatedAt: session.updatedAt,
  };
};

class WorkoutSessionService {
  async startSession(
    userId: string,
    workoutId: string,
    programContext?: { programId: string; programWeek: number; programDay: number }
  ): Promise<SafeWorkoutSession> {
    // Check if user already has an active session
    const existingActive = await workoutSessionRepository.findActiveSession(userId);
    if (existingActive) {
      throw new AppError("You already have an active workout session", 400);
    }

    // Load workout to verify ownership and copy structure
    const workout = await workoutRepository.findByIdAndUser(workoutId, userId);
    if (!workout) {
      throw new AppError("Workout not found or you do not have permission", 404);
    }

    let programDataToAttach: { programId?: string; programWeek?: number; programDay?: number } = {};

    if (programContext) {
      const schedule = await programService.getTodaySchedule(userId);

      if (!schedule.hasActiveProgram) {
        throw new AppError("No active program found", 400);
      }

      if (schedule.isProgramFinished) {
        throw new AppError("Program is finished", 400);
      }

      if (schedule.currentWeek !== programContext.programWeek || schedule.currentDay !== programContext.programDay) {
        throw new AppError("Requested schedule does not match today's schedule", 400);
      }

      if (schedule.isRestDay) {
         throw new AppError("Today is a rest day", 400);
      }

      if (schedule.workout?._id !== workoutId) {
        throw new AppError("Requested workout does not match today's scheduled workout", 400);
      }

      if (schedule.programId !== programContext.programId) {
        throw new AppError("Requested program ID does not match the active program", 400);
      }

      if (schedule.isCompletedToday) {
        throw new AppError("Today's scheduled workout is already completed", 400);
      }

      programDataToAttach = {
        programId: schedule.programId,
        programWeek: schedule.currentWeek,
        programDay: schedule.currentDay
      };
    }

    // Snapshot exercises and apply progression
    const sessionExercises: IWorkoutSessionExercise[] = await Promise.all(
      workout.exercises.map(async (ex) => {
        let plannedWeight = ex.weight;
        let plannedReps = ex.reps;
        let progressionInsight: { reason: string; previousWeight?: number; previousReps?: number; } | undefined = undefined;

        const progression = await progressionService.getRecommendation(
          userId,
          ex.name,
          ex.sets,
          ex.reps
        );

        if (progression && progression.recommendation) {
          plannedWeight = progression.recommendation.weight;
          // we can map the min/max reps back to plannedReps since the schema expects a single number for plannedReps
          plannedReps = progression.recommendation.maxReps;
          progressionInsight = {
            reason: progression.reason,
            previousWeight: progression.latestPerformance?.weight,
            previousReps: progression.latestPerformance?.totalReps
          };
        } else if (progression && progression.recommendation === null) {
           progressionInsight = undefined;
        }

        return {
          exerciseName: ex.name,
          plannedSets: ex.sets,
          plannedReps,
          plannedWeight,
          progressionInsight,
          sets: [],
        };
      })
    );

    const session = await workoutSessionRepository.createSession(userId, {
      workout: workoutId,
      exercises: sessionExercises,
      ...programDataToAttach
    });

    return toWorkoutSessionResponse(session);
  }

  async getActiveSession(userId: string): Promise<SafeWorkoutSession | null> {
    const session = await workoutSessionRepository.findActiveSession(userId);
    if (!session) return null;
    return toWorkoutSessionResponse(session);
  }

  async getSessionById(sessionId: string, userId: string): Promise<SafeWorkoutSession> {
    const session = await workoutSessionRepository.findByIdAndUser(sessionId, userId);
    if (!session) {
      throw new AppError("Workout session not found", 404);
    }
    return toWorkoutSessionResponse(session);
  }

  async getSessions(userId: string, page: number = 1, limit: number = 10): Promise<{ sessions: SafeWorkoutSession[]; total: number }> {
    const { sessions, total } = await workoutSessionRepository.findAllByUser(userId, page, limit);
    return {
      sessions: sessions.map(toWorkoutSessionResponse),
      total,
    };
  }

  async updateSession(sessionId: string, userId: string, data: WorkoutSessionUpdateData & { expectedUpdatedAt?: string }): Promise<SafeWorkoutSession> {
    const session = await workoutSessionRepository.findByIdAndUser(sessionId, userId);
    if (!session) {
      throw new AppError("Workout session not found", 404);
    }

    if (session.status === "completed") {
      throw new AppError("Cannot update a completed workout session", 400);
    }

    const updatedSession = await workoutSessionRepository.updateSession(sessionId, userId, data);
    if (!updatedSession) {
      if (data.expectedUpdatedAt) {
        throw new AppError("Concurrency conflict: session has been modified since last read", 409, true, "ERR_CONCURRENCY_CONFLICT");
      }
      throw new AppError("Failed to update workout session", 500);
    }

    return toWorkoutSessionResponse(updatedSession);
  }

  async completeSession(sessionId: string, userId: string, expectedUpdatedAt?: string): Promise<SafeWorkoutSession> {
    const session = await workoutSessionRepository.findByIdAndUser(sessionId, userId);
    if (!session) {
      throw new AppError("Workout session not found", 404);
    }

    if (session.status === "completed") {
      throw new AppError("Workout session is already completed", 400);
    }

    const completedSession = await workoutSessionRepository.completeSession(sessionId, userId, expectedUpdatedAt);
    if (!completedSession) {
      if (expectedUpdatedAt) {
        throw new AppError("Concurrency conflict: session has been modified since last read", 409, true, "ERR_CONCURRENCY_CONFLICT");
      }
      throw new AppError("Failed to complete workout session", 500);
    }

    // Attempt to detect any PRs generated by this session
    let newPersonalRecords: any[] = [];
    try {
      newPersonalRecords = await analyticsService.getRecentPRsForSession(userId, sessionId);
    } catch (e) {
       // Non-fatal error, do not fail completion
    }

    return { ...toWorkoutSessionResponse(completedSession), newPersonalRecords } as any;
  }
}

export const workoutSessionService = new WorkoutSessionService();
export default workoutSessionService;
