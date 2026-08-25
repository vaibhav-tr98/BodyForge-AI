import { progressRepository } from "../repositories/progress.repository";
import { AppError } from "../errors/AppError";
import { IProgressEntry } from "../models/ProgressEntry";

export class ProgressService {
  async createProgressEntry(userId: string, data: Partial<IProgressEntry>): Promise<IProgressEntry> {
    const existingEntry = await progressRepository.findByUserAndDate(userId, data.date as string);
    if (existingEntry) {
      throw new AppError("An entry for this date already exists. Please update it instead.", 400);
    }
    
    return await progressRepository.create({ ...data, user: userId } as any);
  }

  async getProgressHistory(userId: string): Promise<IProgressEntry[]> {
    return await progressRepository.findByUser(userId);
  }

  async getProgressEntry(userId: string, entryId: string): Promise<IProgressEntry> {
    const entry = await progressRepository.findByIdForUser(userId, entryId);
    if (!entry) {
      throw new AppError("Progress entry not found", 404);
    }
    return entry;
  }

  async updateProgressEntry(userId: string, entryId: string, data: Partial<IProgressEntry>): Promise<IProgressEntry> {
    const entry = await progressRepository.findByIdForUser(userId, entryId);
    if (!entry) {
      throw new AppError("Progress entry not found", 404);
    }

    if (data.date && data.date !== entry.date) {
      const existingEntry = await progressRepository.findByUserAndDate(userId, data.date);
      if (existingEntry && existingEntry._id.toString() !== entryId) {
        throw new AppError("An entry for this date already exists", 400);
      }
    }

    const updated = await progressRepository.updateForUser(userId, entryId, data);
    if (!updated) {
      throw new AppError("Failed to update progress entry", 500);
    }
    return updated;
  }

  async deleteProgressEntry(userId: string, entryId: string): Promise<void> {
    const deleted = await progressRepository.deleteForUser(userId, entryId);
    if (!deleted) {
      throw new AppError("Progress entry not found", 404);
    }
  }

  async getProgressSummary(userId: string) {
    // We need chronological data for trend calculation
    // findByUser returns sorted by date DESC (newest first)
    const historyDesc = await progressRepository.findByUser(userId);
    
    if (!historyDesc || historyDesc.length === 0) {
      return {
        currentWeight: null,
        startingWeight: null,
        weightChange: null,
        weightChangePercentage: null,
        trend: "no_history",
        latestEntry: null,
        totalEntries: 0
      };
    }

    const latestEntry = historyDesc[0];
    const oldestEntry = historyDesc[historyDesc.length - 1];
    
    const currentWeight = latestEntry.weight;
    const startingWeight = oldestEntry.weight;
    const weightChange = Number((currentWeight - startingWeight).toFixed(2));
    const weightChangePercentage = startingWeight > 0 ? Number(((weightChange / startingWeight) * 100).toFixed(2)) : 0;
    
    let trend = "stable";
    if (historyDesc.length > 1) {
      const previousEntry = historyDesc[1];
      if (currentWeight > previousEntry.weight) {
        trend = "gaining";
      } else if (currentWeight < previousEntry.weight) {
        trend = "losing";
      }
    }

    return {
      currentWeight,
      startingWeight,
      weightChange,
      weightChangePercentage,
      trend,
      latestEntry,
      totalEntries: historyDesc.length
    };
  }
}

export const progressService = new ProgressService();
