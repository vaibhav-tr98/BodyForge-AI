import { AppError } from "../errors/AppError";
import { IWorkout } from "../models/Workout";
import { workoutRepository, WorkoutCreateData, WorkoutUpdateData } from "../repositories/workout.repository";

export interface SafeExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
}

export interface SafeWorkout {
  id: string;
  name: string;
  description?: string;
  exercises: SafeExercise[];
  createdAt: Date;
  updatedAt: Date;
}

const toWorkoutResponse = (workout: IWorkout): SafeWorkout => ({
  id: workout._id.toString(),
  name: workout.name,
  ...(workout.description !== undefined ? { description: workout.description } : {}),
  exercises: workout.exercises.map((exercise) => ({
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    ...(exercise.weight !== undefined ? { weight: exercise.weight } : {}),
  })),
  createdAt: workout.createdAt,
  updatedAt: workout.updatedAt,
});

class WorkoutService {
  async createWorkout(userId: string, data: WorkoutCreateData): Promise<SafeWorkout> {
    const workout = await workoutRepository.create(userId, data);
    return toWorkoutResponse(workout);
  }

  async getWorkouts(userId: string): Promise<SafeWorkout[]> {
    const workouts = await workoutRepository.findByUserId(userId);
    return workouts.map(toWorkoutResponse);
  }

  async getWorkoutById(id: string, userId: string): Promise<SafeWorkout> {
    const workout = await workoutRepository.findByIdAndUser(id, userId);
    
    if (!workout) {
      throw new AppError("Workout not found", 404);
    }
    
    return toWorkoutResponse(workout);
  }

  async updateWorkout(id: string, userId: string, data: WorkoutUpdateData): Promise<SafeWorkout> {
    const workout = await workoutRepository.updateByIdAndUser(id, userId, data);
    
    if (!workout) {
      throw new AppError("Workout not found", 404);
    }
    
    return toWorkoutResponse(workout);
  }

  async deleteWorkout(id: string, userId: string): Promise<void> {
    const workout = await workoutRepository.deleteByIdAndUser(id, userId);
    
    if (!workout) {
      throw new AppError("Workout not found", 404);
    }
  }
}

export const workoutService = new WorkoutService();
export default workoutService;
