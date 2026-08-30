import mongoose from "mongoose";
import { z } from "zod";

export const exerciseIdParamSchema = z.object({
  id: z
    .string({ message: "Invalid exercise ID" })
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: "Invalid exercise ID",
    }),
});

export const searchExercisesSchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(100, "Search query is too long")
      .optional()
      .transform((val) => val === "" ? undefined : val),
    muscle: z
      .string()
      .trim()
      .max(50, "Muscle name is too long")
      .optional()
      .transform((val) => val === "" ? undefined : val),
    equipment: z
      .string()
      .trim()
      .max(50, "Equipment name is too long")
      .optional()
      .transform((val) => val === "" ? undefined : val),
    difficulty: z
      .enum(["beginner", "intermediate", "advanced"] as const, {
        message: "Difficulty must be beginner, intermediate, or advanced",
      })
      .or(z.literal(""))
      .optional()
      .transform((val) => val === "" ? undefined : val),
    page: z.coerce
      .number()
      .int("Page must be an integer")
      .min(1, "Page must be at least 1")
      .default(1),
    limit: z.coerce
      .number()
      .int("Limit must be an integer")
      .min(1, "Limit must be at least 1")
      .max(1000, "Limit cannot exceed 1000")
      .default(20),
  })
  .strict();
