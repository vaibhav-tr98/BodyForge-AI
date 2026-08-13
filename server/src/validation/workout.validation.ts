import mongoose from "mongoose";
import { z } from "zod";

export const workoutIdParamSchema = z.object({
  id: z
    .string({ message: "Invalid workout ID" })
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: "Invalid workout ID",
    }),
});

export const exerciseSchema = z
  .object({
    name: z
      .string({ message: "Exercises must contain valid exercise entries" })
      .refine((val) => val.trim().length >= 1 && val.trim().length <= 100, {
        message: "Exercises must contain valid exercise entries",
      }),
    sets: z
      .number({ message: "Exercises must contain valid exercise entries" })
      .refine((val) => Number.isInteger(val) && val > 0, {
        message: "Exercises must contain valid exercise entries",
      }),
    reps: z
      .number({ message: "Exercises must contain valid exercise entries" })
      .refine((val) => Number.isInteger(val) && val > 0, {
        message: "Exercises must contain valid exercise entries",
      }),
    weight: z
      .number({ message: "Exercises must contain valid exercise entries" })
      .refine((val) => Number.isFinite(val) && val >= 0, {
        message: "Exercises must contain valid exercise entries",
      })
      .optional(),
  })
  .strict();

export const createWorkoutSchema = z
  .object({
    name: z
      .string({ message: "Workout name must be between 1 and 100 characters" })
      .refine((val) => val.trim().length >= 1 && val.trim().length <= 100, {
        message: "Workout name must be between 1 and 100 characters",
      }),
    description: z
      .string({ message: "Description must be a string of 500 characters or fewer" })
      .refine((val) => val.trim().length <= 500, {
        message: "Description must be a string of 500 characters or fewer",
      })
      .optional(),
    exercises: z.array(exerciseSchema, {
      message: "Exercises must be an array",
    }),
  })
  .strict();

export const updateWorkoutSchema = z
  .object({
    name: z
      .string({ message: "Workout name must be between 1 and 100 characters" })
      .refine((val) => val.trim().length >= 1 && val.trim().length <= 100, {
        message: "Workout name must be between 1 and 100 characters",
      })
      .optional(),
    description: z
      .string({ message: "Description must be a string of 500 characters or fewer" })
      .refine((val) => val.trim().length <= 500, {
        message: "Description must be a string of 500 characters or fewer",
      })
      .optional(),
    exercises: z
      .array(exerciseSchema, {
        message: "Exercises must contain valid exercise entries",
      })
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "A valid workout update is required",
  });

export type WorkoutIdParamInput = z.infer<typeof workoutIdParamSchema>;
export type ExerciseInput = z.infer<typeof exerciseSchema>;
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
