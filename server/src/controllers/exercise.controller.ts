import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import logger from "../utils/logger";
import { exerciseService } from "../services/exercise.service";
import { ExerciseSearchParams } from "../repositories/exercise.repository";

export const getExercises = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // The query params are already validated by Zod middleware, so we safely cast
    const params = req.query as unknown as ExerciseSearchParams;
    
    const result = await exerciseService.searchExercises(params);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error("Get exercises failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve exercises" });
  }
};

export const getExerciseById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const exercise = await exerciseService.getExerciseById(req.params.id as string);
    res.status(200).json({ success: true, data: { exercise } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Get exercise by id failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve exercise" });
  }
};
