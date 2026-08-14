import { AppError } from "../errors/AppError";
import { exerciseRepository, ExerciseSearchParams, PaginatedExercises } from "../repositories/exercise.repository";
import { IExercise } from "../models/Exercise";

export interface SafeExercise {
  id: string;
  name: string;
  category?: string;
  equipment?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  instructions: string[];
}

export interface PaginatedSafeExercises {
  exercises: SafeExercise[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const toSafeExercise = (exercise: IExercise): SafeExercise => ({
  id: exercise._id.toString(),
  name: exercise.name,
  category: exercise.category,
  equipment: exercise.equipment,
  primaryMuscles: exercise.primaryMuscles,
  secondaryMuscles: exercise.secondaryMuscles,
  difficulty: exercise.difficulty,
  instructions: exercise.instructions,
});

class ExerciseService {
  async searchExercises(params: ExerciseSearchParams): Promise<PaginatedSafeExercises> {
    const result = await exerciseRepository.searchExercises(params);

    return {
      exercises: result.exercises.map(toSafeExercise),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async getExerciseById(id: string): Promise<SafeExercise> {
    const exercise = await exerciseRepository.getExerciseById(id);

    if (!exercise) {
      throw new AppError("Exercise not found", 404);
    }

    return toSafeExercise(exercise);
  }
}

export const exerciseService = new ExerciseService();
export default exerciseService;
