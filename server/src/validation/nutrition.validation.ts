import { z } from "zod";

export const nutritionEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD"),
  foodName: z.string().min(1).max(100),
  quantity: z.number().positive().max(10000),
  unit: z.string().min(1).max(20),
});

export const createNutritionEntrySchema = {
  body: nutritionEntrySchema,
};

export const updateNutritionEntrySchema = {
  body: nutritionEntrySchema.partial(),
  params: z.object({
    id: z.string().min(1, "Entry ID is required"),
  }),
};

export const getNutritionByDateSchema = {
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD"),
  }),
};

export const analyzeLogSchema = {
  body: z.object({
    text: z.string().trim().min(2, "Text must be at least 2 characters").max(500, "Text must be at most 500 characters"),
  }),
};
