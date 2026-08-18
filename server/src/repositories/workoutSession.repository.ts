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

  async getDashboardAggregations(userId: string, weekStart: Date): Promise<{
    totalWorkouts: number;
    workoutsThisWeek: number;
    totalVolume: number;
    totalExercises: number;
  }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const result = await WorkoutSession.aggregate([
      {
        $match: {
          user: userObjectId,
          status: "completed",
        },
      },
      {
        $facet: {
          workoutCounts: [
            {
              $group: {
                _id: null,
                totalWorkouts: { $sum: 1 },
                workoutsThisWeek: {
                  $sum: {
                    $cond: [{ $gte: ["$completedAt", weekStart] }, 1, 0],
                  },
                },
              },
            },
          ],
          volumeAndExercises: [
            { $unwind: "$exercises" },
            {
              $group: {
                _id: "$_id",
                exercisesInSession: { $addToSet: "$exercises.exerciseName" },
                sessionVolume: {
                  $sum: {
                    $reduce: {
                      input: {
                        $filter: {
                          input: "$exercises.sets",
                          as: "set",
                          cond: { $eq: ["$$set.completed", true] },
                        },
                      },
                      initialValue: 0,
                      in: { $add: ["$$value", { $multiply: ["$$this.weight", "$$this.reps"] }] },
                    },
                  },
                },
              },
            },
            {
              $group: {
                _id: null,
                totalVolume: { $sum: "$sessionVolume" },
                totalExercises: { $sum: { $size: "$exercisesInSession" } },
              },
            },
          ],
        },
      },
    ]);

    const counts = result[0]?.workoutCounts[0] || { totalWorkouts: 0, workoutsThisWeek: 0 };
    const stats = result[0]?.volumeAndExercises[0] || { totalVolume: 0, totalExercises: 0 };

    return {
      totalWorkouts: counts.totalWorkouts,
      workoutsThisWeek: counts.workoutsThisWeek,
      totalVolume: stats.totalVolume,
      totalExercises: stats.totalExercises,
    };
  }

  async getUserWorkoutDates(userId: string): Promise<Date[]> {
    const sessions = await WorkoutSession.find(
      { user: userId, status: "completed" },
      { completedAt: 1 }
    ).sort({ completedAt: -1 });

    return sessions
      .map((s) => s.completedAt)
      .filter((date): date is Date => date != null);
  }

  async getRecentCompletedSessions(userId: string, limit: number): Promise<any[]> {
    return await WorkoutSession.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          status: "completed",
        },
      },
      { $sort: { completedAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "workouts",
          localField: "workout",
          foreignField: "_id",
          as: "workoutData",
        },
      },
      {
        $project: {
          _id: 1,
          workoutName: { $arrayElemAt: ["$workoutData.name", 0] },
          completedAt: 1,
          exerciseCount: { $size: "$exercises" },
          totalVolume: {
            $sum: {
              $map: {
                input: "$exercises",
                as: "exercise",
                in: {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$$exercise.sets",
                          as: "set",
                          cond: { $eq: ["$$set.completed", true] },
                        },
                      },
                      as: "set",
                      in: { $multiply: ["$$set.weight", "$$set.reps"] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ]);
  }

  async getPersonalRecords(userId: string): Promise<any[]> {
    return await WorkoutSession.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          status: "completed",
        },
      },
      { $sort: { completedAt: 1 } }, // Ascending to keep history chronological
      { $unwind: "$exercises" },
      {
        $project: {
          exerciseName: { $trim: { input: "$exercises.exerciseName" } },
          completedAt: 1,
          completedSets: {
            $filter: {
              input: "$exercises.sets",
              as: "set",
              cond: { $eq: ["$$set.completed", true] },
            },
          },
        },
      },
      {
        $match: {
          "completedSets.0": { $exists: true },
        },
      },
      {
        $addFields: {
          maxWeightInSession: { $max: "$completedSets.weight" },
          maxRepsInSession: { $max: "$completedSets.reps" },
          sessionVolume: {
            $sum: {
              $map: {
                input: "$completedSets",
                as: "set",
                in: { $multiply: ["$$set.weight", "$$set.reps"] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: { $toLower: "$exerciseName" },
          originalExerciseName: { $last: "$exerciseName" },
          heaviestWeight: { $max: "$maxWeightInSession" },
          bestReps: { $max: "$maxRepsInSession" },
          bestSessionVolume: { $max: "$sessionVolume" },
          totalSessions: { $sum: 1 },
          lastPerformedAt: { $last: "$completedAt" },
          history: {
            $push: {
              weight: "$maxWeightInSession",
              reps: "$maxRepsInSession",
              volume: "$sessionVolume",
              date: "$completedAt",
            },
          },
        },
      },
    ]);
  }
}

export const workoutSessionRepository = new WorkoutSessionRepository();
export default workoutSessionRepository;
