import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import logger from "../utils/logger";
import { workoutSessionService } from "../services/workoutSession.service";

const getAuthenticatedUserId = (req: Request, res: Response): string | undefined => {
  if (!req.authenticatedUserId) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return undefined;
  }
  return req.authenticatedUserId;
};

export const startSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const session = await workoutSessionService.startSession(userId, req.body.workoutId);
    res.status(201).json({ success: true, data: { session } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Start session failed:", error);
    res.status(500).json({ success: false, message: "Unable to start session" });
  }
};

export const getActiveSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const session = await workoutSessionService.getActiveSession(userId);
    if (!session) {
      res.status(200).json({ success: true, data: { session: null } });
      return;
    }
    res.status(200).json({ success: true, data: { session } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Get active session failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve active session" });
  }
};

export const getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const { sessions, total } = await workoutSessionService.getSessions(userId, page, limit);
    res.status(200).json({ success: true, data: { sessions, total, page, limit } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Get sessions failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve sessions" });
  }
};

export const getSessionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const session = await workoutSessionService.getSessionById(req.params.id as string, userId);
    res.status(200).json({ success: true, data: { session } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Get session by id failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve session" });
  }
};

export const updateSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const session = await workoutSessionService.updateSession(req.params.id as string, userId, req.body);
    res.status(200).json({ success: true, data: { session } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Update session failed:", error);
    res.status(500).json({ success: false, message: "Unable to update session" });
  }
};

export const completeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const session = await workoutSessionService.completeSession(req.params.id as string, userId);
    res.status(200).json({ success: true, message: "Workout session completed successfully", data: { session } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Complete session failed:", error);
    res.status(500).json({ success: false, message: "Unable to complete session" });
  }
};
