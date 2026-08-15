import { AppError } from "../errors/AppError";
import { workoutRepository } from "../repositories/workout.repository";
import { workoutSessionRepository, WorkoutSessionUpdateData } from "../repositories/workoutSession.repository";
import { IWorkoutSession, IWorkoutSessionExercise } from "../models/WorkoutSession";
import { Types } from "mongoose";

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
  sets: SafeWorkoutSessionSet[];
}

export interface SafeWorkoutSession {
  id: string;
  workout: string | { _id: string; name: string; description?: string };
  startedAt: Date;
  completedAt?: Date | null;
  status: "active" | "completed";
  exercises: SafeWorkoutSessionExercise[];
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
      sets: ex.sets.map((set: any) => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        completed: set.completed,
      })),
    })),
  };
};

class WorkoutSessionService {
  async startSession(userId: string, workoutId: string): Promise<SafeWorkoutSession> {
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

    // Snapshot exercises
    const sessionExercises: IWorkoutSessionExercise[] = workout.exercises.map((ex) => {
      return {
        exerciseName: ex.name,
        plannedSets: ex.sets,
        plannedReps: ex.reps,
        plannedWeight: ex.weight,
        sets: [],
      };
    });

    const session = await workoutSessionRepository.createSession(userId, {
      workout: workoutId,
      exercises: sessionExercises,
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

  async updateSession(sessionId: string, userId: string, data: WorkoutSessionUpdateData): Promise<SafeWorkoutSession> {
    const session = await workoutSessionRepository.findByIdAndUser(sessionId, userId);
    if (!session) {
      throw new AppError("Workout session not found", 404);
    }

    if (session.status === "completed") {
      throw new AppError("Cannot update a completed workout session", 400);
    }

    const updatedSession = await workoutSessionRepository.updateSession(sessionId, userId, data);
    if (!updatedSession) {
      throw new AppError("Failed to update workout session", 500);
    }

    return toWorkoutSessionResponse(updatedSession);
  }

  async completeSession(sessionId: string, userId: string): Promise<SafeWorkoutSession> {
    const session = await workoutSessionRepository.findByIdAndUser(sessionId, userId);
    if (!session) {
      throw new AppError("Workout session not found", 404);
    }

    if (session.status === "completed") {
      throw new AppError("Workout session is already completed", 400);
    }

    const completedSession = await workoutSessionRepository.completeSession(sessionId, userId);
    if (!completedSession) {
      throw new AppError("Failed to complete workout session", 500);
    }

    return toWorkoutSessionResponse(completedSession);
  }
}

export const workoutSessionService = new WorkoutSessionService();
export default workoutSessionService;
