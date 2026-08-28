import { z } from "zod";

export const getExerciseProgressSchema = z.object({
  exerciseName: z
    .string()
    .trim()
    .min(1, "Exercise name is required")
    .max(200, "Exercise name is too long"),
});

export const dateQuerySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD') });
