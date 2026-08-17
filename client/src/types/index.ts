// ── User ────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  height?: number;
  weight?: number;
  goal?: string;
  experience?: string;
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
