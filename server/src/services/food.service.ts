import { AppError } from "../errors/AppError";
import { foodRepository } from "../repositories/food.repository";
import { IFood } from "../models/Food";

class FoodService {
  public async searchFoods(query: string): Promise<IFood[]> {
    return await foodRepository.searchFoods(query);
  }

  public async getFoodByName(name: string): Promise<IFood | null> {
    return await foodRepository.getFoodByName(name);
  }

  public async calculateMacros(foodName: string, quantity: number, unit: string) {
    if (quantity <= 0) {
      throw new AppError("Quantity must be greater than 0", 400);
    }

    const food = await this.getFoodByName(foodName);
    if (!food) {
      throw new AppError(`Food "${foodName}" not found in the database.`, 404);
    }

    const normalizedUnit = unit.toLowerCase();
    const normalizedBaseUnit = food.baseUnit.toLowerCase();

    let multiplier = 1;

    if (normalizedUnit === normalizedBaseUnit) {
      multiplier = quantity / food.baseQuantity;
    } else if (normalizedUnit === "kg" && normalizedBaseUnit === "g") {
      multiplier = (quantity * 1000) / food.baseQuantity;
    } else if (normalizedUnit === "g" && normalizedBaseUnit === "kg") {
      multiplier = (quantity / 1000) / food.baseQuantity;
    } else if (normalizedUnit === "l" && normalizedBaseUnit === "ml") {
      multiplier = (quantity * 1000) / food.baseQuantity;
    } else if (normalizedUnit === "ml" && normalizedBaseUnit === "l") {
      multiplier = (quantity / 1000) / food.baseQuantity;
    } else if (normalizedUnit === "pieces" && normalizedBaseUnit === "piece") {
      multiplier = quantity / food.baseQuantity;
    } else if (normalizedUnit === "piece" && normalizedBaseUnit === "pieces") {
      multiplier = quantity / food.baseQuantity;
    } else if (normalizedUnit === "servings" && normalizedBaseUnit === "serving") {
      multiplier = quantity / food.baseQuantity;
    } else if (normalizedUnit === "serving" && normalizedBaseUnit === "servings") {
      multiplier = quantity / food.baseQuantity;
    } else {
      throw new AppError(`Unit "${unit}" is not compatible with food's base unit "${food.baseUnit}".`, 400);
    }

    return {
      calories: Math.max(0, Math.round(food.calories * multiplier)),
      protein: Math.max(0, Math.round(food.protein * multiplier)),
      carbs: Math.max(0, Math.round(food.carbs * multiplier)),
      fat: Math.max(0, Math.round(food.fat * multiplier)),
    };
  }
}

export const foodService = new FoodService();
