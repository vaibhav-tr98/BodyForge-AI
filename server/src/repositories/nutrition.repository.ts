import NutritionEntry, { INutritionEntry } from "../models/NutritionEntry";
import { FilterQuery, UpdateQuery } from "mongoose";

class NutritionRepository {
  async create(data: Partial<INutritionEntry>): Promise<INutritionEntry> {
    const entry = new NutritionEntry(data);
    return await entry.save();
  }

  async findById(id: string): Promise<INutritionEntry | null> {
    return await NutritionEntry.findById(id);
  }

  async find(filter: FilterQuery<INutritionEntry>): Promise<INutritionEntry[]> {
    return await NutritionEntry.find(filter).sort({ createdAt: -1 });
  }

  async updateOne(filter: FilterQuery<INutritionEntry>, update: UpdateQuery<INutritionEntry>): Promise<INutritionEntry | null> {
    return await NutritionEntry.findOneAndUpdate(filter, update, { new: true });
  }

  async deleteOne(filter: FilterQuery<INutritionEntry>): Promise<boolean> {
    const result = await NutritionEntry.deleteOne(filter);
    return result.deletedCount > 0;
  }
}

export const nutritionRepository = new NutritionRepository();
