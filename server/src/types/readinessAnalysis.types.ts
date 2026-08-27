export interface ReadinessAnalysisMuscleGroup {
  muscle: string;
  readinessScore: number;
  status: "ready" | "moderate" | "light" | "recent" | "no_history";
  daysSinceLastTrained: number | null;
}

export interface ReadinessAnalysisContext {
  overallScore: number;
  status: "ready" | "moderate" | "light" | "recent" | "no_history";
  recommendationReason: string;
  muscleGroups: ReadinessAnalysisMuscleGroup[];
}

export interface ReadinessAnalysisDTO {
  summary: string;
  positives: string[];
  attention: string[];
  nextAction: string;
}
