export interface CoachingContext {
  date: string;
  userProfile: {
    fitnessGoal: string | null;
    experienceLevel: string | null;
    gender: string | null;
  };
  readiness: {
    overallScore: number;
    status: "ready" | "moderate" | "light" | "recent" | "no_history";
    fatiguedMuscles: string[];
    freshMuscles: string[];
  } | null;
  recentWorkouts: {
    name: string | null;
    volume: number;
    exerciseCount: number;
    date: Date;
  }[];
  nutrition: {
    caloriesConsumed: number;
    calorieTarget: number | null;
    proteinConsumed: number;
    proteinTarget: number | null;
    status: string | null;
  } | null;
  progress: {
    currentWeight: number | null;
    trend: string | null;
  } | null;
  activeWorkoutId: string | null;
}

export interface CoachingResponseDTO {
  summary: string;
  primaryAction: string;
  trainingGuidance: {
    status: "ready" | "light" | "rest";
    recommendation: string;
  };
  nutritionGuidance: {
    status: "on_track" | "needs_attention";
    recommendation: string;
  };
  progressInsight: {
    observation: string;
  };
}
