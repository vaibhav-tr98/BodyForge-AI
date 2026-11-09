export interface UserFitnessProfile {
  age?: number | null;
  gender?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  fitnessGoal?: string | null;
  experienceLevel?: string | null;
  activityLevel?: string | null;
  timezone: string;
}

export interface TrainingProgramContext {
  name: string;
  status: string;
  startDate?: string;
  currentPosition?: {
    week: number;
    day: number;
    description: string;
  } | null;
}

export interface WorkoutExerciseSummary {
  exerciseName: string;
  completedSetsCount: number;
  topSet: {
    weight: number;
    reps: number;
  } | null;
  totalVolume: number;
}

export interface RecentWorkoutSummary {
  id: string;
  name: string;
  date: string;
  totalVolume: number;
  exerciseCount: number;
  exercises: WorkoutExerciseSummary[];
}

export interface PersonalRecordSummary {
  exerciseName: string;
  heaviestWeight: number;
  bestReps: number;
  bestSessionVolume: number;
  firstRecordedWeight?: number | null;
  weightImprovementPercent?: number | null;
  lastPerformedAt?: Date | null;
}

export interface ReadinessContext {
  overallScore: number;
  status: string;
  freshMuscles: string[];
  fatiguedMuscles: string[];
}

export interface NutritionDaySummary {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  entryCount: number;
  status?: string;
}

export interface NutritionTargetsContext {
  calories: number;
  protein: number;
  calculationMethod: string;
}

export interface FitnessContext {
  assembledAt: string;
  profile: UserFitnessProfile;
  training: {
    activeProgram: TrainingProgramContext | null;
    recentWorkouts: RecentWorkoutSummary[];
    topPersonalRecords: PersonalRecordSummary[];
    readiness: ReadinessContext | null;
  };
  nutrition: {
    targets: NutritionTargetsContext | null;
    recentSummaries: NutritionDaySummary[];
  };
}
