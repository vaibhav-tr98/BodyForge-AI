import mongoose from "mongoose";
import WorkoutSession, { IWorkoutSession, IWorkoutSessionExercise } from "../models/WorkoutSession";

export interface WorkoutSessionCreateData {
  workout: string;
  exercises: IWorkoutSessionExercise[];
}

export interface WorkoutSessionUpdateData {
  exercises: IWorkoutSessionExercise[];
}

class WorkoutSessionRepository {
  async createSession(userId: string, data: WorkoutSessionCreateData): Promise<IWorkoutSession> {
    const session = new WorkoutSession({
      ...data,
      user: new mongoose.Types.ObjectId(userId),
      workout: new mongoose.Types.ObjectId(data.workout),
      startedAt: new Date(),
      status: "active",
    });
    return await session.save();
  }

  async findActiveSession(userId: string): Promise<IWorkoutSession | null> {
    return await WorkoutSession.findOne({ user: userId, status: "active" });
  }

  async findByIdAndUser(sessionId: string, userId: string): Promise<IWorkoutSession | null> {
    return await WorkoutSession.findOne({ _id: sessionId, user: userId });
  }

  async findAllByUser(userId: string, page: number = 1, limit: number = 10): Promise<{ sessions: IWorkoutSession[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [sessions, total] = await Promise.all([
      WorkoutSession.find({ user: userId })
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("workout", "name description"),
      WorkoutSession.countDocuments({ user: userId }),
    ]);

    return { sessions, total };
  }

  async updateSession(sessionId: string, userId: string, data: WorkoutSessionUpdateData): Promise<IWorkoutSession | null> {
    return await WorkoutSession.findOneAndUpdate(
      { _id: sessionId, user: userId, status: "active" },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async completeSession(sessionId: string, userId: string): Promise<IWorkoutSession | null> {
    return await WorkoutSession.findOneAndUpdate(
      { _id: sessionId, user: userId, status: "active" },
      { $set: { status: "completed", completedAt: new Date() } },
      { new: true }
    );
  }

  async findCompletedSessionsByExercise(
    userId: string,
    exerciseName: string,
    limit: number = 5
  ): Promise<IWorkoutSession[]> {
    return await WorkoutSession.find({
      user: userId,
      status: "completed",
      "exercises.exerciseName": { $regex: new RegExp(`^${exerciseName.trim()}$`, "i") }
    })
      .sort({ startedAt: -1 })
      .limit(limit);
  }
}

export const workoutSessionRepository = new WorkoutSessionRepository();
export default workoutSessionRepository;
