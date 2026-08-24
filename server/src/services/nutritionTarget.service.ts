import { IUser } from "../models/User";

export interface NutritionTargets {
  calories: number;
  protein: number;
  calculationMethod: string;
}

class NutritionTargetService {
  /**
   * Deterministic MVP calculation for daily nutrition targets.
   * Based on BMR, Activity Level, and Fitness Goal.
   * This is a heuristic, not medical advice.
   */
  public calculateTargets(user: IUser): NutritionTargets | null {
    // 1. Profile Completeness Check
    if (
      !user.age ||
      !user.gender ||
      !user.height ||
      !user.weight ||
      !user.activityLevel ||
      !user.fitnessGoal
    ) {
      return null;
    }

    const {
      age,
      gender,
      height: heightCm,
      weight: weightKg,
      activityLevel,
      fitnessGoal,
    } = user;

    // 2. BMR Calculation (Mifflin-St Jeor Equation)
    let bmr = 0;
    const maleBmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    const femaleBmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

    if (gender === "male") {
      bmr = maleBmr;
    } else if (gender === "female") {
      bmr = femaleBmr;
    } else {
      // "other" or "prefer_not_to_say"
      // Use deterministic midpoint of male and female BMR
      bmr = (maleBmr + femaleBmr) / 2;
    }

    // 3. Activity Multiplier
    let activityMultiplier = 1.2;
    switch (activityLevel) {
      case "sedentary":
        activityMultiplier = 1.2;
        break;
      case "lightly_active":
        activityMultiplier = 1.375;
        break;
      case "moderately_active":
        activityMultiplier = 1.55;
        break;
      case "very_active":
        activityMultiplier = 1.725;
        break;
      case "extremely_active":
        activityMultiplier = 1.9;
        break;
    }

    const tdee = bmr * activityMultiplier;

    // 4. Fitness Goal Adjustment for Calories
    let calorieAdjustment = 1.0;
    switch (fitnessGoal) {
      case "lose_fat":
        calorieAdjustment = 0.8;
        break;
      case "maintain":
        calorieAdjustment = 1.0;
        break;
      case "build_muscle":
        calorieAdjustment = 1.1;
        break;
      case "improve_fitness":
        calorieAdjustment = 1.0;
        break;
    }

    const calories = Math.round(tdee * calorieAdjustment);

    // 5. Protein Target Calculation
    let proteinMultiplier = 1.6;
    switch (fitnessGoal) {
      case "lose_fat":
        proteinMultiplier = 2.0;
        break;
      case "maintain":
        proteinMultiplier = 1.6;
        break;
      case "build_muscle":
        proteinMultiplier = 2.0;
        break;
      case "improve_fitness":
        proteinMultiplier = 1.6;
        break;
    }

    const protein = Math.round(weightKg * proteinMultiplier);

    return {
      calories,
      protein,
      calculationMethod: "deterministic_bmr_activity_goal",
    };
  }
}

export const nutritionTargetService = new NutritionTargetService();
