import { AppError } from "../errors/AppError";
import { foodRepository } from "../repositories/food.repository";
import { IFood } from "../models/Food";

function getStandardServingFallback(food: IFood, unit: string): number | undefined {
  const name = (food.name || "").toLowerCase();
  const aliases: string[] = ((food as any).aliases || []).map((a: string) => a.toLowerCase());
  const category = (food.category || "").toLowerCase();

  // Strict word-boundary checks to prevent false positives (e.g. "eggplant" matching "egg", "rotisserie" matching "roti")
  const isEgg = (
    (/\b(egg|eggs)\b/i.test(name) && !/\beggplant\b/i.test(name) && !/\b(roll|rolls|custard|custards)\b/i.test(name)) ||
    aliases.some(a => /\b(egg|eggs)\b/i.test(a) && !/\beggplant\b/i.test(a))
  );

  const isBanana = (
    (/\b(banana|bananas)\b/i.test(name) && !/\b(pepper|peppers)\b/i.test(name)) ||
    aliases.some(a => /\b(banana|bananas)\b/i.test(a) && !/\b(pepper|peppers)\b/i.test(a))
  );

  const isRoti = (
    (/\b(roti|rotis|chapati|chapatis|phulka)\b/i.test(name) && !/\brotisserie\b/i.test(name)) ||
    aliases.some(a => /\b(roti|rotis|chapati|chapatis|phulka)\b/i.test(a))
  );

  const isProteinPowder = (
    /\b(whey|protein powder)\b/i.test(name) ||
    aliases.some(a => /\b(whey|protein powder)\b/i.test(a))
  );

  const isFluidMilk = (
    (/\b(milk|dudh)\b/i.test(name) || aliases.some(a => /\b(milk|dudh)\b/i.test(a))) &&
    !/\b(biscuit|biscuits|waffle|waffles|pancake|pancakes|bar|bars|cookie|cookies|cake|cakes|chocolate)\b/i.test(name)
  );

  const countUnits = ["piece", "pieces", "pc", "pcs", "item", "items", "serving", "servings"];

  if (isEgg && (countUnits.includes(unit) || unit === "egg" || unit === "eggs")) {
    return 50; // Standard 50g per egg
  }

  if (isBanana && (countUnits.includes(unit) || unit === "banana" || unit === "bananas")) {
    return 118; // Standard 118g per medium banana
  }

  if (isRoti && (countUnits.includes(unit) || unit === "roti" || unit === "rotis" || unit === "chapati" || unit === "chapatis")) {
    return 40; // Standard 40g per roti
  }

  if (isProteinPowder && (unit === "scoop" || unit === "scoops" || unit === "serving" || unit === "servings")) {
    return 30; // Standard 30g per scoop
  }

  if ((isFluidMilk || category.includes("beverage")) && (unit === "glass" || unit === "glasses")) {
    return 250; // Standard 250ml/g per glass
  }

  if ((isFluidMilk || category.includes("beverage")) && (unit === "cup" || unit === "cups")) {
    return 240; // Standard 240ml/g per cup
  }

  return undefined;
}

class FoodService {
  public async searchFoods(query: string): Promise<IFood[]> {
    return await foodRepository.searchFoods(query);
  }

  public async getFoodByName(name: string): Promise<IFood | null> {
    return await foodRepository.getFoodByName(name);
  }

  public async calculateMacros(foodName: string, quantity: number, unit: string) {
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) {
      throw new AppError("Quantity must be a positive finite number", 400);
    }

    const food = await this.getFoodByName(foodName);
    if (!food) {
      throw new AppError(`Food "${foodName}" not found in the database.`, 404);
    }

    const normalizedUnit = unit.toLowerCase().trim();
    const normalizedBaseUnit = food.baseUnit.toLowerCase().trim();

    // Validate integer for count-based units
    const isMeasurementUnit = ['g', 'kg', 'ml', 'l', 'oz', 'lb', 'cup', 'cups', 'tbsp', 'tsp', 'fl oz', 'glass', 'glasses', 'scoop', 'scoops'].includes(normalizedUnit);
    if (!isMeasurementUnit && !Number.isInteger(quantity)) {
      throw new AppError(`Quantity for count-based unit "${unit}" must be an integer.`, 400);
    }

    let multiplier = 1;

    // Check if requested unit matches a known serving in food.servings (servings take priority over fallback)
    let servingEquivalent: number | undefined;
    if (food.servings && food.servings.length > 0) {
      const isPlural = normalizedUnit.endsWith('s');
      const singular = isPlural ? normalizedUnit.slice(0, -1) : normalizedUnit;
      const plural = isPlural ? normalizedUnit : normalizedUnit + 's';

      const serving = food.servings.find(s => {
        const sUnit = s.unit.toLowerCase().trim();
        return (
          sUnit === normalizedUnit ||
          sUnit === singular ||
          sUnit === plural ||
          (['rotis', 'roti', 'chapati', 'chapatis'].includes(normalizedUnit) && sUnit === 'piece') ||
          (['eggs', 'egg'].includes(normalizedUnit) && sUnit === 'piece') ||
          (['bananas', 'banana'].includes(normalizedUnit) && sUnit === 'piece')
        );
      });

      if (serving) {
        servingEquivalent = serving.equivalent / (serving.quantity || 1);
      }
    }

    // Check fallback serving equivalents for common foods only when serving metadata is absent
    if (servingEquivalent === undefined) {
      servingEquivalent = getStandardServingFallback(food, normalizedUnit);
    }

    const foodNameLower = (food.name || "").toLowerCase();
    const foodCategoryLower = ((food as any).category || "").toLowerCase();

    // Restricted liquid check: fluid beverages, fluid milk, or baseUnit ml/l only (never solid cheese/paneer/butter)
    const isLiquid = (
      normalizedBaseUnit === "ml" ||
      normalizedBaseUnit === "l" ||
      foodCategoryLower.includes("beverage") ||
      ((foodNameLower.includes("milk") || foodNameLower.includes("dudh")) &&
        !foodNameLower.includes("powder") &&
        !foodNameLower.includes("biscuit") &&
        !foodNameLower.includes("waffle") &&
        !foodNameLower.includes("bar")) ||
      foodNameLower.includes("juice") ||
      foodNameLower.includes("water") ||
      foodNameLower.includes("oil")
    );

    if (servingEquivalent !== undefined && (normalizedBaseUnit === "g" || normalizedBaseUnit === "ml")) {
      // e.g. 1 piece = 40g, base = 100g. Request = 2 pieces. multiplier = (2 * 40) / 100 = 0.8
      multiplier = (quantity * servingEquivalent) / food.baseQuantity;
    } else if (normalizedUnit === normalizedBaseUnit) {
      multiplier = quantity / food.baseQuantity;
    } else if (normalizedUnit === "kg" && normalizedBaseUnit === "g") {
      multiplier = (quantity * 1000) / food.baseQuantity;
    } else if (normalizedUnit === "g" && normalizedBaseUnit === "kg") {
      multiplier = (quantity / 1000) / food.baseQuantity;
    } else if (normalizedUnit === "l" && normalizedBaseUnit === "ml") {
      multiplier = (quantity * 1000) / food.baseQuantity;
    } else if (normalizedUnit === "ml" && normalizedBaseUnit === "l") {
      multiplier = (quantity / 1000) / food.baseQuantity;
    } else if (isLiquid && normalizedUnit === "ml" && normalizedBaseUnit === "g") {
      multiplier = quantity / food.baseQuantity;
    } else if (isLiquid && normalizedUnit === "g" && normalizedBaseUnit === "ml") {
      multiplier = quantity / food.baseQuantity;
    } else if (isLiquid && normalizedUnit === "l" && normalizedBaseUnit === "g") {
      multiplier = (quantity * 1000) / food.baseQuantity;
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
