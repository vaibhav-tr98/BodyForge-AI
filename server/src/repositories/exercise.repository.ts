import Exercise, { IExercise } from "../models/Exercise";

export interface ExerciseSearchParams {
  q?: string;
  muscle?: string;
  equipment?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  page: number;
  limit: number;
}

export interface PaginatedExercises {
  exercises: IExercise[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ExerciseRepository {
  async searchExercises(params: ExerciseSearchParams): Promise<PaginatedExercises> {
    const { q, muscle, equipment, difficulty, page, limit } = params;
    const query: any = {};

    // Use $text search if query string is provided. This utilizes the text index.
    if (q && q.trim() !== "") {
      query.$text = { $search: q };
    }

    if (muscle && muscle.trim() !== "") {
      // Find exercises where the primary or secondary muscles match
      query.$or = [
        { primaryMuscles: muscle },
        { secondaryMuscles: muscle }
      ];
    }

    if (equipment && equipment.trim() !== "") {
      query.equipment = equipment;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    const skip = (page - 1) * limit;

    // Use projection to sort by textScore if text search is active
    const sortConfig = q && q.trim() !== "" ? { score: { $meta: "textScore" } } : { name: 1 };

    const [exercises, total] = await Promise.all([
      Exercise.find(query, q && q.trim() !== "" ? { score: { $meta: "textScore" } } : undefined)
        .sort(sortConfig as any)
        .skip(skip)
        .limit(limit)
        .exec(),
      Exercise.countDocuments(query),
    ]);

    return {
      exercises,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getExerciseById(id: string): Promise<IExercise | null> {
    return await Exercise.findById(id).exec();
  }
}

export const exerciseRepository = new ExerciseRepository();
export default exerciseRepository;
