import { Request, Response, NextFunction } from "express";
import { progressService } from "../services/progress.service";

const getAuthenticatedUserId = (req: Request, res: Response): string | undefined => {
  if (!(req as any).authenticatedUserId) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return undefined;
  }
  return (req as any).authenticatedUserId;
};

export const getProgressHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const history = await progressService.getProgressHistory(userId);
    
    res.status(200).json({
      status: "success",
      data: {
        history,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProgressSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const summary = await progressService.getProgressSummary(userId);
    
    res.status(200).json({
      status: "success",
      data: {
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProgressEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    const entry = await progressService.getProgressEntry(userId, id as string);
    
    res.status(200).json({
      status: "success",
      data: {
        entry,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createProgressEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const entry = await progressService.createProgressEntry(userId, req.body);
    
    res.status(201).json({
      status: "success",
      data: {
        entry,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProgressEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    const entry = await progressService.updateProgressEntry(userId, id as string, req.body);
    
    res.status(200).json({
      status: "success",
      data: {
        entry,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProgressEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    await progressService.deleteProgressEntry(userId, id as string);
    
    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
