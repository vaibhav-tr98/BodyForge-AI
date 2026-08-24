import { z } from "zod";

export const updateProfileSchema = z
  .object({
    name: z
      .string({ message: "Name must be between 2 and 50 characters" })
      .refine((val) => val.trim().length >= 2 && val.trim().length <= 50, {
        message: "Name must be between 2 and 50 characters",
      })
      .optional(),
    height: z
      .number({ message: "Height must be between 50 and 300" })
      .refine((val) => Number.isFinite(val) && val >= 50 && val <= 300, {
        message: "Height must be between 50 and 300",
      })
      .optional(),
    weight: z
      .number({ message: "Weight must be between 20 and 500" })
      .refine((val) => Number.isFinite(val) && val >= 20 && val <= 500, {
        message: "Weight must be between 20 and 500",
      })
      .optional(),
    goal: z
      .string({ message: "Goal must be between 1 and 100 characters" })
      .refine((val) => val.trim().length >= 1 && val.trim().length <= 100, {
        message: "Goal must be between 1 and 100 characters",
      })
      .optional(),
    experience: z
      .string({ message: "Experience must be between 1 and 100 characters" })
      .refine((val) => val.trim().length >= 1 && val.trim().length <= 100, {
        message: "Experience must be between 1 and 100 characters",
      })
      .optional(),
    age: z
      .number({ message: "Age must be a valid integer between 13 and 120" })
      .int({ message: "Age must be an integer" })
      .min(13, { message: "Age must be at least 13" })
      .max(120, { message: "Age must be at most 120" })
      .optional(),
    gender: z
      .enum(["male", "female", "other", "prefer_not_to_say"], {
        message: "Gender must be male, female, other, or prefer_not_to_say",
      })
      .optional(),
    activityLevel: z
      .enum(["sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"], {
        message: "Invalid activity level",
      })
      .optional(),
    fitnessGoal: z
      .enum(["lose_fat", "maintain", "build_muscle", "improve_fitness"], {
        message: "Invalid fitness goal",
      })
      .optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
