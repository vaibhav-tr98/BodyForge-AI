export type ProgressInsightType =
  | "no_history"
  | "insufficient_history"
  | "weight_loss"
  | "weight_gain"
  | "weight_stable"
  | "body_fat_improvement"
  | "body_fat_increase"
  | "measurement_improvement";

export type ProgressInsightPriority = "high" | "medium" | "low";

export interface ProgressInsightContext {
  currentWeight: number | null;
  previousWeight: number | null;
  weightChange: number | null;
  currentBodyFat: number | null;
  previousBodyFat: number | null;
  bodyFatChange: number | null;
  currentWaist: number | null;
  previousWaist: number | null;
  waistChange: number | null;
  daysTracked: number;
}

export interface ProgressInsightDTO {
  type: ProgressInsightType;
  priority: ProgressInsightPriority;
  title: string;
  message: string;
  context: ProgressInsightContext;
}
