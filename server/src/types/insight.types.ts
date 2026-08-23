export type InsightPriority = "high" | "medium" | "low";
export type InsightType = "history_needed" | "nutrition_config_needed" | "nutrition_gap" | "on_track" | "no_workout";

export interface BodyForgeInsightDTO {
  type: InsightType;
  priority: InsightPriority;
  title: string;
  message: string;
  context: {
    readinessScore?: number;
    workoutName?: string;
    nutritionStatus?: string;
    proteinPercent?: number;
  };
}
