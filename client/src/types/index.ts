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
