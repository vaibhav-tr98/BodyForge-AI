import { z } from "zod";

export const getExerciseProgressSchema = z.object({
  exerciseName: z
    .string()
    .trim()
    .min(1, "Exercise name is required")
    .max(200, "Exercise name is too long"),
});
