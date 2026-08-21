import { nutritionRepository } from "../repositories/nutrition.repository";
import { INutritionEntry } from "../models/NutritionEntry";
import { AppError } from "../errors/AppError";

class NutritionService {
  async addEntry(userId: string, data: Partial<INutritionEntry>): Promise<INutritionEntry> {
    return await nutritionRepository.create({ ...data, user: userId as any });
  }

  async getEntriesByDate(userId: string, date: string): Promise<INutritionEntry[]> {
    return await nutritionRepository.find({ user: userId, date });
  }

  async updateEntry(userId: string, entryId: string, updateData: Partial<INutritionEntry>): Promise<INutritionEntry> {
    const entry = await nutritionRepository.findById(entryId);
    if (!entry) {
      throw new AppError("Nutrition entry not found", 404);
    }
    if (entry.user.toString() !== userId) {
      throw new AppError("Not authorized to update this entry", 403);
    }
    
    const updatedEntry = await nutritionRepository.updateOne({ _id: entryId }, updateData);
    if (!updatedEntry) {
        throw new AppError("Nutrition entry not found during update", 404);
    }
    return updatedEntry;
  }

  async deleteEntry(userId: string, entryId: string): Promise<void> {
    const entry = await nutritionRepository.findById(entryId);
    if (!entry) {
      throw new AppError("Nutrition entry not found", 404);
    }
    if (entry.user.toString() !== userId) {
      throw new AppError("Not authorized to delete this entry", 403);
    }
    
    await nutritionRepository.deleteOne({ _id: entryId });
  }

  async getSummary(userId: string, date: string) {
    const entries = await nutritionRepository.find({ user: userId, date });
    
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const entry of entries) {
      totalCalories += entry.calories;
      totalProtein += entry.protein;
      totalCarbs += entry.carbs;
      totalFat += entry.fat;
    }

    return {
      date,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      entryCount: entries.length,
    };
  }
}

export const nutritionService = new NutritionService();
