export interface ProgressAnalysisDTO {
  summary: string;
  positives: string[];
  attention: string[];
  nextAction: string;
}

export interface ProgressAnalysisContext {
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

  readinessScore: number | null;
  readinessStatus: string | null;

  workoutName: string | null;

  caloriesTarget: number | null;
  caloriesConsumed: number | null;
  proteinTarget: number | null;
  proteinConsumed: number | null;

  deterministicProgressInsight: string | null;
}
