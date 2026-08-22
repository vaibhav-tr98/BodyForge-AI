import { nutritionRepository } from "../repositories/nutrition.repository";
import { INutritionEntry } from "../models/NutritionEntry";
import { AppError } from "../errors/AppError";
import { workoutRecommendationService } from "./workoutRecommendation.service";
import { userRepository } from "../repositories/user.repository";

import { foodService } from "./food.service";

class NutritionService {
  async addEntry(userId: string, data: Partial<INutritionEntry>): Promise<INutritionEntry> {
    if (!data.foodName || data.quantity === undefined || !data.unit) {
      throw new AppError("foodName, quantity, and unit are required", 400);
    }

    const calculatedMacros = await foodService.calculateMacros(data.foodName, data.quantity, data.unit);
    
    return await nutritionRepository.create({ 
      ...data, 
      user: userId as any,
      calories: calculatedMacros.calories,
      protein: calculatedMacros.protein,
      carbs: calculatedMacros.carbs,
      fat: calculatedMacros.fat
    });
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
    
    let macrosToUpdate = {};
    const newFoodName = updateData.foodName || entry.foodName;
    const newQuantity = updateData.quantity !== undefined ? updateData.quantity : entry.quantity;
    const newUnit = updateData.unit || entry.unit;

    if (updateData.foodName || updateData.quantity !== undefined || updateData.unit) {
      const calculatedMacros = await foodService.calculateMacros(newFoodName, newQuantity, newUnit);
      macrosToUpdate = {
        calories: calculatedMacros.calories,
        protein: calculatedMacros.protein,
        carbs: calculatedMacros.carbs,
        fat: calculatedMacros.fat
      };
    }
    
    // Explicitly ignore any client-provided macros to prevent manipulation
    delete updateData.calories;
    delete updateData.protein;
    delete updateData.carbs;
    delete updateData.fat;

    const finalUpdateData = { ...updateData, ...macrosToUpdate };

    const updatedEntry = await nutritionRepository.updateOne({ _id: entryId }, finalUpdateData);
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

  async getTodayOverview(userId: string, date: string) {
    const summary = await this.getSummary(userId, date);
    
    const user = await userRepository.findById(userId);
    
    let targetCalories = 0;
    let targetProtein = 0;
    let targets = null;
    let progress = null;
    
    if (user && user.weight) {
      targetCalories = Math.round(user.weight * 30);
      targetProtein = Math.round(user.weight * 2);
      
      targets = {
        calories: targetCalories,
        protein: targetProtein,
      };
      
      progress = {
        caloriesPercent: targetCalories > 0 ? Math.min(100, Math.round((summary.totalCalories / targetCalories) * 100)) : 0,
        proteinPercent: targetProtein > 0 ? Math.min(100, Math.round((summary.totalProtein / targetProtein) * 100)) : 0,
      };
    }
    
    let caloriesStatus = "below_target";
    if (targetCalories > 0) {
      if (summary.totalCalories >= targetCalories) {
        caloriesStatus = "target_reached";
      } else if (summary.totalCalories >= targetCalories * 0.85) {
        caloriesStatus = "on_track";
      }
    } else {
       caloriesStatus = "no_target";
    }

    let proteinStatus = "below_target";
    if (targetProtein > 0) {
      if (summary.totalProtein >= targetProtein) {
        proteinStatus = "target_reached";
      } else if (summary.totalProtein >= targetProtein * 0.85) {
        proteinStatus = "on_track";
      }
    } else {
       proteinStatus = "no_target";
    }

    // Connect today's nutrition overview to the existing workout system.
    const recommendationRes = await workoutRecommendationService.getTodayRecommendation(userId, date);
    const hasWorkout = !!recommendationRes.recommendation;
    const workoutName = hasWorkout ? recommendationRes.recommendation!.workoutName : undefined;

    return {
      date,
      nutrition: {
        calories: summary.totalCalories,
        protein: summary.totalProtein,
        carbs: summary.totalCarbs,
        fat: summary.totalFat,
      },
      targets,
      progress,
      workout: {
        hasWorkout,
        workoutName,
      },
      status: {
        calories: caloriesStatus,
        protein: proteinStatus,
      }
    };
  }
}

export const nutritionService = new NutritionService();

