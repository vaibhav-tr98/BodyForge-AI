import mongoose from "mongoose";
import { z } from "zod";

export const sessionIdParamSchema = z.object({
  id: z
    .string({ message: "Invalid session ID" })
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: "Invalid session ID",
    }),
});

export const startSessionSchema = z.object({
  workoutId: z
    .string({ message: "Invalid workout ID" })
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: "Invalid workout ID",
    }),
});

export const sessionSetSchema = z
  .object({
    setNumber: z.number().int().min(1, "Set number must be >= 1"),
    weight: z.number().min(0, "Weight must be >= 0"),
    reps: z.number().int().min(1, "Reps must be >= 1"),
    completed: z.boolean(),
  })
  .strict();

export const sessionExerciseSchema = z
  .object({
    exerciseName: z.string().min(1, "Exercise name is required").max(100),
    plannedSets: z.number().int().min(1),
    plannedReps: z.number().int().min(1),
    plannedWeight: z.number().min(0).optional(),
    sets: z.array(sessionSetSchema),
  })
  .strict();

export const updateSessionSchema = z
  .object({
    exercises: z.array(sessionExerciseSchema),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "A valid session update is required",
  });
