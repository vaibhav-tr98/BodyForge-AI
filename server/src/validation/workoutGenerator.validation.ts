import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const workoutGeneratorSchema = z.object({
  targetMuscles: z.string().min(1).max(100),
  availableTime: z.number().int().min(10).max(180),
  equipment: z.string().min(1).max(100),
});

export const validateWorkoutGeneratorRequest = (req: Request, res: Response, next: NextFunction) => {
  const result = workoutGeneratorSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: "Invalid generator request data",
      errors: result.error.issues,
    });
    return;
  }

  req.body = result.data;
  next();
};
