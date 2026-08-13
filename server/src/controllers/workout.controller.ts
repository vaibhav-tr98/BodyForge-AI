import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import logger from "../utils/logger";
import { workoutService } from "../services/workout.service";

const getAuthenticatedUserId = (req: Request, res: Response): string | undefined => {
  if (!req.authenticatedUserId) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return undefined;
  }
  return req.authenticatedUserId;
};

export const createWorkout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const workout = await workoutService.createWorkout(userId, req.body);
    res.status(201).json({ success: true, data: { workout } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Create workout failed:", error);
    res.status(500).json({ success: false, message: "Unable to create workout" });
  }
};

export const getWorkouts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const workouts = await workoutService.getWorkouts(userId);
    res.status(200).json({ success: true, data: { workouts, count: workouts.length } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Get workouts failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve workouts" });
  }
};

export const getWorkoutById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const workout = await workoutService.getWorkoutById(req.params.id as string, userId);
    res.status(200).json({ success: true, data: { workout } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Get workout by id failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve workout" });
  }
};

export const updateWorkout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const workout = await workoutService.updateWorkout(req.params.id as string, userId, req.body);
    res.status(200).json({ success: true, data: { workout } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Update workout failed:", error);
    res.status(500).json({ success: false, message: "Unable to update workout" });
  }
};

export const deleteWorkout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    await workoutService.deleteWorkout(req.params.id as string, userId);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Delete workout failed:", error);
    res.status(500).json({ success: false, message: "Unable to delete workout" });
  }
};
