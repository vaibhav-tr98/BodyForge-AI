import { ProgressAnalysisDTO } from './progressAnalysis.types';
import { NutritionAnalysisDTO } from './nutritionAnalysis.types';
import { WorkoutAnalysisDTO } from './workoutAnalysis.types';
import { ReadinessAnalysisDTO } from './readinessAnalysis.types';

export interface DailySummaryContext {
  date: string;
  progressAnalysis: ProgressAnalysisDTO | null;
  nutritionAnalysis: NutritionAnalysisDTO | null;
  workoutAnalysis: WorkoutAnalysisDTO | null;
  readinessAnalysis: ReadinessAnalysisDTO | null;
}

export interface DailySummaryDTO {
  summary: string;
  topPositive: string;
  mainAttention: string;
  nextAction: string;
}
