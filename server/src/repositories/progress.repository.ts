import ProgressEntry, { IProgressEntry } from "../models/ProgressEntry";
import { Types } from "mongoose";

class ProgressRepository {
  async create(entryData: Partial<IProgressEntry>): Promise<IProgressEntry> {
    const entry = new ProgressEntry(entryData);
    return await entry.save();
  }

  async findByIdForUser(userId: string, entryId: string): Promise<IProgressEntry | null> {
    return await ProgressEntry.findOne({ _id: entryId, user: userId });
  }

  async findByUser(userId: string): Promise<IProgressEntry[]> {
    return await ProgressEntry.find({ user: userId }).sort({ date: -1 });
  }

  async findByUserAndDate(userId: string, date: string): Promise<IProgressEntry | null> {
    return await ProgressEntry.findOne({ user: userId, date });
  }

  async updateForUser(userId: string, entryId: string, updateData: Partial<IProgressEntry>): Promise<IProgressEntry | null> {
    return await ProgressEntry.findOneAndUpdate(
      { _id: entryId, user: userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  async deleteForUser(userId: string, entryId: string): Promise<boolean> {
    const result = await ProgressEntry.deleteOne({ _id: entryId, user: userId });
    return result.deletedCount === 1;
  }

  async getLatestForUser(userId: string): Promise<IProgressEntry | null> {
    return await ProgressEntry.findOne({ user: userId }).sort({ date: -1 }).limit(1);
  }
}

export const progressRepository = new ProgressRepository();
