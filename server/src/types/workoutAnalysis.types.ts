export interface WorkoutAnalysisDTO {
  summary: string;
  positives: string[];
  attention: string[];
  nextAction: string;
}

export interface WorkoutAnalysisContext {
  date: string;
  overallReadinessScore: number | null;
  overallReadinessStatus: string | null;
  readinessRecommendationReason: string | null;
  readyMuscleGroups: string[];
  
  todayWorkoutRecommendationName: string | null;
  todayWorkoutRecommendationReason: string | null;
  
  recentWorkoutCount7Days: number | null;
  recentWorkoutCount14Days: number | null;
  
  recentPRs: {
    exerciseName: string;
    bestWeight: number;
    bestReps: number;
    achievedAt: string;
  }[] | null;
}
