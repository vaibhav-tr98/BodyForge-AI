import mongoose from "mongoose";
import Program, { IProgram } from "../models/Program";

class ProgramRepository {
  async createProgram(data: Partial<IProgram>): Promise<IProgram> {
    const program = new Program(data);
    return await program.save();
  }

  async findByIdAndUser(programId: string, userId: string): Promise<IProgram | null> {
    return await Program.findOne({ _id: programId, user: userId });
  }

  async findActiveProgram(userId: string): Promise<IProgram | null> {
    return await Program.findOne({ user: userId, status: "active" });
  }

  async findAllByUser(userId: string): Promise<IProgram[]> {
    return await Program.find({ user: userId }).sort({ createdAt: -1 });
  }

  async updateProgram(
    programId: string,
    userId: string,
    updateData: Partial<IProgram>
  ): Promise<IProgram | null> {
    return await Program.findOneAndUpdate(
      { _id: programId, user: userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  async isWorkoutReferenced(workoutId: string, userId: string): Promise<boolean> {
    const exists = await Program.exists({ 
      user: userId,
      "weeks.days.workoutId": workoutId 
    });
    return exists !== null;
  }

  async deleteProgram(programId: string, userId: string): Promise<boolean> {
    const result = await Program.deleteOne({ _id: programId, user: userId });
    return result.deletedCount > 0;
  }
}

export const programRepository = new ProgramRepository();
export default programRepository;
