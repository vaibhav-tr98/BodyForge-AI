import { nutritionRepository } from "../repositories/nutrition.repository";
import { INutritionEntry } from "../models/NutritionEntry";
import { AppError } from "../errors/AppError";
import { workoutRecommendationService } from "./workoutRecommendation.service";
import { userRepository } from "../repositories/user.repository";

import { foodService } from "./food.service";
import { nutritionTargetService } from "./nutritionTarget.service";
import { AIProvider, classifyGeminiError } from "./aiProvider.service";
import { DateEngine } from "../utils/dateEngine";

class NutritionService {
  async addEntry(userId: string, data: Partial<INutritionEntry>): Promise<INutritionEntry> {
    if (!data.foodName || data.quantity === undefined || !data.unit) {
      throw new AppError("foodName, quantity, and unit are required", 400);
    }

    if (typeof data.quantity !== "number" || !Number.isFinite(data.quantity) || data.quantity <= 0) {
      throw new AppError("Quantity must be a positive finite number", 400);
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

  async getHistory(
    userId: string,
    startDate?: string,
    endDate?: string,
    days: number = 7,
    timezone?: string
  ) {
    let tz = DateEngine.getValidTimezone(timezone);
    if (tz === "UTC" && !timezone) {
      const user = await userRepository.findById(userId);
      if (user?.timezone) {
        tz = DateEngine.getValidTimezone(user.timezone);
      }
    }

    const todayStr = DateEngine.getCurrentDateInTimezone(new Date(), tz);
    let endStr = endDate || todayStr;
    let startStr = startDate;

    if (!startStr) {
      let curr = endStr;
      for (let i = 1; i < days; i++) {
        curr = DateEngine.getPreviousCalendarDay(curr);
      }
      startStr = curr;
    }

    if (startStr > endStr) {
      const temp = startStr;
      startStr = endStr;
      endStr = temp;
    }

    const entries = await nutritionRepository.find({
      user: userId as any,
      date: { $gte: startStr, $lte: endStr },
    });

    const dailyMap = new Map<string, { calories: number; protein: number; carbs: number; fat: number; entryCount: number }>();
    for (const entry of entries) {
      const existing = dailyMap.get(entry.date) || { calories: 0, protein: 0, carbs: 0, fat: 0, entryCount: 0 };
      existing.calories += entry.calories;
      existing.protein += entry.protein;
      existing.carbs += entry.carbs;
      existing.fat += entry.fat;
      existing.entryCount += 1;
      dailyMap.set(entry.date, existing);
    }

    const resultDays: Array<{
      date: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      entryCount: number;
    }> = [];

    let cursor = startStr;
    while (cursor <= endStr) {
      const stats = dailyMap.get(cursor) || { calories: 0, protein: 0, carbs: 0, fat: 0, entryCount: 0 };
      resultDays.push({
        date: cursor,
        calories: Math.round(stats.calories),
        protein: Math.round(stats.protein * 10) / 10,
        carbs: Math.round(stats.carbs * 10) / 10,
        fat: Math.round(stats.fat * 10) / 10,
        entryCount: stats.entryCount,
      });

      const [y, m, d] = cursor.split("-").map(Number);
      const nextD = new Date(Date.UTC(y, m - 1, d + 1));
      cursor = nextD.toISOString().split("T")[0];
    }

    const totalDaysCount = resultDays.length || 1;
    const totalCal = resultDays.reduce((acc, d) => acc + d.calories, 0);
    const totalProt = resultDays.reduce((acc, d) => acc + d.protein, 0);
    const totalCarb = resultDays.reduce((acc, d) => acc + d.carbs, 0);
    const totalF = resultDays.reduce((acc, d) => acc + d.fat, 0);

    return {
      days: resultDays,
      averageCalories: Math.round(totalCal / totalDaysCount),
      averageProtein: Math.round((totalProt / totalDaysCount) * 10) / 10,
      averageCarbs: Math.round((totalCarb / totalDaysCount) * 10) / 10,
      averageFat: Math.round((totalF / totalDaysCount) * 10) / 10,
    };
  }

  async getTodayOverview(userId: string, date: string) {
    const summary = await this.getSummary(userId, date);

    const user = await userRepository.findById(userId);

    const targets = user ? nutritionTargetService.calculateTargets(user as any) : null;
    let targetCalories = targets ? targets.calories : 0;
    let targetProtein = targets ? targets.protein : 0;

    let progress = null;
    if (targets) {
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

  async analyzeLog(text: string): Promise<import("../types/foodExtraction.types").AnalyzeMealResponseDTO> {
    let extractionResult;
    try {
      extractionResult = await AIProvider.extractFoodFromText(text);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      const classified = classifyGeminiError(error);
      if (classified.isQuotaExhausted || classified.isRateLimit) {
        throw new AppError("AI service rate limit reached. Please wait a moment or log your food manually.", 429);
      }
      if (error?.message?.includes("GEMINI_API_KEY") || error?.message?.includes("not configured")) {
        throw new AppError("AI Quick Log is not configured. Please log food manually.", 503);
      }
      if (error?.code === "ECONNABORTED" || error?.message?.includes("timeout")) {
        throw new AppError("AI analysis timed out. Please try again or log manually.", 504);
      }
      throw new AppError(error?.message || "AI service is currently unavailable. Please try again or log manually.", 503);
    }

    if (!extractionResult || !Array.isArray(extractionResult.items) || extractionResult.items.length === 0) {
      return { proposals: [] };
    }

    const proposals = [];

    for (const item of extractionResult.items) {
      const foodText = (item.foodText || "").trim();
      if (!foodText) continue;

      const unit = (item.unit || "piece").trim();

      // Validate quantity: zero, negative, NaN, Infinity, or non-finite numbers must NOT be silently converted to 1
      if (typeof item.quantity !== "number" || !Number.isFinite(item.quantity) || item.quantity <= 0) {
        proposals.push({
          extractedFood: item.foodText,
          quantity: item.quantity,
          unit,
          candidates: [],
          selectedCandidateId: null,
          requiresReview: false,
          status: "not_found" as const
        });
        continue;
      }

      const quantity = item.quantity;

      let normalizedText = foodText.toLowerCase();
      if (normalizedText.endsWith('s') && !normalizedText.endsWith('ss') && !normalizedText.endsWith('us')) {
        normalizedText = normalizedText.slice(0, -1);
      }

      const searchResults = await foodService.searchFoods(normalizedText);
      const candidates = [];

      for (const food of searchResults) {
        try {
          const preview = await foodService.calculateMacros(food.name, quantity, unit);
          candidates.push({
            food: {
              _id: food._id ? food._id.toString() : food.name,
              name: food.name
            },
            preview: preview
          });
        } catch (e) {
          // If unit failed, try "piece" or baseUnit fallback before giving up
          if (unit !== "piece" && unit !== food.baseUnit) {
            try {
              const fallbackPreview = await foodService.calculateMacros(food.name, quantity, "piece");
              candidates.push({
                food: {
                  _id: food._id ? food._id.toString() : food.name,
                  name: food.name
                },
                preview: fallbackPreview
              });
            } catch {
              continue;
            }
          }
        }
      }

      let status: "not_found" | "matched" | "ambiguous" = "not_found";
      let requiresReview = false;
      let selectedCandidateId: string | null = null;

      if (candidates.length === 0) {
        status = "not_found";
      } else if (candidates.length === 1) {
        status = "matched";
        selectedCandidateId = candidates[0].food._id;
      } else {
        status = "ambiguous";
        requiresReview = true;
        selectedCandidateId = candidates[0].food._id;
      }

      proposals.push({
        extractedFood: item.foodText,
        quantity,
        unit,
        candidates,
        selectedCandidateId,
        requiresReview,
        status
      });
    }

    return { proposals };
  }
}

export const nutritionService = new NutritionService();
