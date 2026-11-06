import { z } from "zod";

export const getExerciseProgressSchema = z.object({
  exerciseName: z
    .string()
    .trim()
    .min(1, "Exercise name is required")
    .max(200, "Exercise name is too long"),
});

export const dateQuerySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD') });

export const dashboardQuerySchema = z.object({
  timezone: z.string().max(100, "Timezone too long").optional(),
});

export const activityQuerySchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid startDate format. Expected YYYY-MM-DD').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid endDate format. Expected YYYY-MM-DD').optional(),
    timezone: z.string().max(100, 'Timezone too long').optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: "startDate must be before or equal to endDate",
      path: ["startDate"],
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(`${data.startDate}T00:00:00Z`).getTime();
        const end = new Date(`${data.endDate}T00:00:00Z`).getTime();
        const diffDays = (end - start) / (1000 * 60 * 60 * 24);
        return diffDays <= 730;
      }
      return true;
    },
    {
      message: "Date range cannot exceed 730 days (2 years)",
      path: ["endDate"],
    }
  );
