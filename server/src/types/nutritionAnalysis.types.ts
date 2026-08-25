export interface NutritionAnalysisDTO {
  summary: string;
  positives: string[];
  attention: string[];
  nextAction: string;
}

export interface NutritionAnalysisContext {
  date: string;
  caloriesConsumed: number;
  calorieTarget: number | null;
  caloriePercentage: number | null;
  
  proteinConsumed: number;
  proteinTarget: number | null;
  proteinPercentage: number | null;
  
  carbsConsumed: number;
  fatConsumed: number;
  
  fitnessGoal: string | null;
  nutritionStatus: string | null; // e.g., "below_target", "target_reached", "above_target"
  
  workoutRecommendationName: string | null;
}
