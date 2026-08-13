import mongoose from "mongoose";
import Workout, { IWorkout, IExercise } from "../models/Workout";

export interface ExerciseData {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
}

export interface WorkoutCreateData {
  name: string;
  description?: string;
  exercises: ExerciseData[];
}

export type WorkoutUpdateData = Partial<WorkoutCreateData>;

class WorkoutRepository {
  async create(userId: string, data: WorkoutCreateData): Promise<IWorkout> {
    const workout = new Workout({
      ...data,
      user: new mongoose.Types.ObjectId(userId),
    });
    return await workout.save();
  }

  async findByUserId(userId: string): Promise<IWorkout[]> {
    return await Workout.find({ user: userId }).sort({ createdAt: -1 });
  }

  async findByIdAndUser(id: string, userId: string): Promise<IWorkout | null> {
    return await Workout.findOne({ _id: id, user: userId });
  }

  async updateByIdAndUser(id: string, userId: string, data: WorkoutUpdateData): Promise<IWorkout | null> {
    return await Workout.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async deleteByIdAndUser(id: string, userId: string): Promise<IWorkout | null> {
    return await Workout.findOneAndDelete({ _id: id, user: userId });
  }
}

export const workoutRepository = new WorkoutRepository();
export default workoutRepository;
