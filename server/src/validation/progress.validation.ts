import { z } from "zod";

export const progressEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD"),
  weight: z.number().min(20, "Weight must be at least 20 kg").max(500, "Weight must be less than 500 kg"),
  bodyFatPercentage: z.number().min(1).max(70).optional(),
  waist: z.number().min(10).max(300).optional(),
  chest: z.number().min(10).max(300).optional(),
  arm: z.number().min(5).max(100).optional(),
});

export const createProgressEntrySchema = {
  body: progressEntrySchema,
};

export const updateProgressEntrySchema = {
  body: progressEntrySchema.partial().refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  }),
  params: z.object({
    id: z.string().min(1, "Entry ID is required"),
  }),
};
