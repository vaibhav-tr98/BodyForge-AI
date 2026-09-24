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
  programContext: z
    .object({
      programId: z
        .string({ message: "Invalid program ID" })
        .refine((val) => mongoose.isObjectIdOrHexString(val), {
          message: "Invalid program ID",
        }),
      programWeek: z.number().int().min(0),
      programDay: z.number().int().min(0),
    })
    .optional(),
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
    progressionInsight: z
      .object({
        reason: z.string(),
        previousWeight: z.number().optional(),
        previousReps: z.number().optional(),
      })
      .optional(),
    sets: z.array(sessionSetSchema).max(50, "Maximum of 50 sets allowed per exercise"),
  })
  .strict();

export const updateSessionSchema = z
  .object({
    exercises: z.array(sessionExerciseSchema).max(100, "Maximum of 100 exercises allowed per session"),
    expectedUpdatedAt: z.string().datetime().optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "A valid session update is required",
  });

export const completeSessionSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime().optional()
  })
  .strict();
