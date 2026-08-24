// ── User ────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  height?: number;
  weight?: number;
  goal?: string;
  experience?: string;
  age?: number;
  gender?: string;
  activityLevel?: string;
  fitnessGoal?: string;
  createdAt: string;
  updatedAt: string;
}

// ── API Responses ───────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ── Profile ─────────────────────────────────────────────────────────────────────

export interface ProfileUpdateData {
  name?: string;
  height?: number;
  weight?: number;
  goal?: string;
  experience?: string;
  age?: number;
  gender?: string;
  activityLevel?: string;
  fitnessGoal?: string;
}

// ── Workouts ────────────────────────────────────────────────────────────────────

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
}

export interface Workout {
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkoutRequest {
  name: string;
  description?: string;
  exercises: Exercise[];
}

export type UpdateWorkoutRequest = Partial<CreateWorkoutRequest>;

// ── Workout Sessions ────────────────────────────────────────────────────────────

export interface SessionSet {
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface SessionExercise {
  exerciseName: string;
  plannedSets: number;
  plannedReps: number;
  plannedWeight?: number;
  sets: SessionSet[];
}

export interface WorkoutSession {
  id: string;
  workout: string | { _id: string; name: string; description?: string };
  startedAt: string;
  completedAt?: string | null;
  status: "active" | "completed";
  exercises: SessionExercise[];
}

export interface UpdateWorkoutSessionRequest {
  exercises: SessionExercise[];
}

// ── Progression ─────────────────────────────────────────────────────────────────

export interface ProgressionRecommendation {
  weight: number;
  sets: number;
  minReps: number;
  maxReps: number;
}

export interface LatestPerformance {
  weight: number;
  setsCompleted: number;
  totalReps: number;
}

export type RecommendationConfidence = "low" | "medium" | "high";

export interface ProgressionResponse {
  exerciseName: string;
  recommendation: ProgressionRecommendation | null;
  reason: string;
  confidence: RecommendationConfidence;
  basedOnSessions: number;
  latestPerformance: LatestPerformance | null;
}

// ── Analytics ───────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalWorkouts: number;
  workoutsThisWeek: number;
  currentStreak: number;
  totalVolume: number;
  totalExercises: number;
}

export interface RecentWorkout {
  id: string;
  workoutName: string | null;
  completedAt: string; // ISO date string from API
  exerciseCount: number;
  totalVolume: number;
}

export interface DashboardAnalytics {
  summary: AnalyticsSummary;
  recentWorkouts: RecentWorkout[];
  progressionRecommendation: ProgressionResponse | null;
}

export interface ExerciseProgressPoint {
  date: string; // ISO date string from API
  weight: number;
  totalReps: number;
  volume: number;
}

export interface ExerciseProgress {
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  totalVolume: number;
  sessions: ExerciseProgressPoint[];
}

export interface PersonalRecord {
  exerciseName: string;
  heaviestWeight: number;
  bestReps: number;
  bestSessionVolume: number;
  firstRecordedWeight: number | null;
  weightImprovementPercent: number | null;
  lastPerformedAt: string;
  totalSessions: number;
}

export interface TrainingInsight {
  type: "strongest" | "improvement" | "most_trained" | "newest_pr";
  title: string;
  exerciseName: string;
  value: string;
}

export interface PRAndInsightsResponse {
  personalRecords: PersonalRecord[];
  insights: TrainingInsight[];
}

export interface PRResult {
  type: "weight" | "reps" | "volume";
  exerciseName: string;
  value: number;
  previousValue: number;
}

export interface CompleteSessionResponse {
  session: WorkoutSession;
  newPersonalRecords?: PRResult[];
}

export type TrainingReadinessStatus = "ready" | "moderate" | "light" | "recent" | "no_history";

export interface MuscleReadiness {
  muscle: string;
  readinessScore: number;
  status: TrainingReadinessStatus;
  lastTrainedAt: string | null;
  daysSinceLastTrained: number | null;
  sessionsLast7Days: number;
  sessionsLast14Days: number;
}

export interface TrainingReadiness {
  overallScore: number;
  status: TrainingReadinessStatus;
  recommendation: {
    muscleGroups: string[];
    reason: string;
  };
  muscleGroups: MuscleReadiness[];
}

export interface TodayWorkoutRecommendation {
  workoutId: string;
  workoutName: string;
  reason: string;
  readinessScore: number;
  confidence: "high" | "medium" | "low";
}

export interface WorkoutRecommendationResponse {
  recommendation: TodayWorkoutRecommendation | null;
  reason?: string;
}

// -- Nutrition -------------------------------------------------------------------

export interface CreateNutritionEntryRequest {
  date: string;
  foodName: string;
  quantity: number;
  unit: string;
}

export interface UpdateNutritionEntryRequest {
  date?: string;
  foodName?: string;
  quantity?: number;
  unit?: string;
}

export interface NutritionFood {
  name: string;
  aliases?: string[];
  baseQuantity: number;
  baseUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionEntry {
  _id: string;
  user: string;
  date: string;
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
  updatedAt: string;
}



export interface NutritionSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  entryCount: number;
}

export interface NutritionOverview {
  date: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  targets: {
    calories: number;
    protein: number;
  } | null;
  progress: {
    caloriesPercent: number;
    proteinPercent: number;
  } | null;
  workout: {
    hasWorkout: boolean;
    workoutName?: string;
  };
  status: {
    calories: "below_target" | "on_track" | "target_reached" | "no_target";
    protein: "below_target" | "on_track" | "target_reached" | "no_target";
  };
}
