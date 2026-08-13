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
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
