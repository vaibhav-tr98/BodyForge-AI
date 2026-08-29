export interface WorkoutGeneratorRequest {
  targetMuscles: string;
  availableTime: number; // minutes
  equipment: string;
}

export interface WorkoutGeneratorContext {
  targetMuscles: string;
  availableTime: number;
  equipment: string;
  userAge?: number;
  userGender?: string;
  userExperience?: string;
  userFitnessGoal?: string;
}

export interface GeneratedExerciseDTO {
  name: string;
  sets: number;
  reps: number;
}

export interface GeneratedWorkoutDTO {
  name: string;
  description: string;
  exercises: GeneratedExerciseDTO[];
}
