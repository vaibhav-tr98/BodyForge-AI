import { z } from "zod";

export const nutritionEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD"),
  foodName: z.string().min(1).max(100),
  quantity: z.number().min(0),
  unit: z.string().min(1).max(20),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
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
