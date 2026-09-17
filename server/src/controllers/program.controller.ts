import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import logger from "../utils/logger";
import { programService } from "../services/program.service";

const getAuthenticatedUserId = (req: Request, res: Response): string | undefined => {
  if (!req.authenticatedUserId) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return undefined;
  }
  return req.authenticatedUserId;
};

export const createProgram = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const program = await programService.createProgram(userId, req.body);
    res.status(201).json({ success: true, data: { program } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Create program failed:", error);
    res.status(500).json({ success: false, message: "Unable to create program" });
  }
};

export const getPrograms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const programs = await programService.getPrograms(userId);
    res.status(200).json({ success: true, data: { programs } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Get programs failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve programs" });
  }
};

export const getProgramById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const program = await programService.getProgramById(req.params.id as string, userId);
    res.status(200).json({ success: true, data: { program } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Get program by id failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve program" });
  }
};

export const updateProgram = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const program = await programService.updateProgram(req.params.id as string, userId, req.body);
    res.status(200).json({ success: true, data: { program } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Update program failed:", error);
    res.status(500).json({ success: false, message: "Unable to update program" });
  }
};

export const deleteProgram = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    await programService.deleteProgram(req.params.id as string, userId);
    res.status(200).json({ success: true, message: "Program deleted successfully" });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Delete program failed:", error);
    res.status(500).json({ success: false, message: "Unable to delete program" });
  }
};

export const getTodaySchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const schedule = await programService.getTodaySchedule(userId);
    res.status(200).json({ success: true, data: { schedule } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Get today's schedule failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve schedule" });
  }
};
