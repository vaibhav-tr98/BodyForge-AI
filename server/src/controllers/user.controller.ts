import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import logger from "../utils/logger";
import { userService } from "../services/user.service";

const getAuthenticatedUserId = (req: Request, res: Response): string | undefined => {
  if (!req.authenticatedUserId) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return undefined;
  }

  return req.authenticatedUserId;
};

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const user = await userService.getProfile(userId);
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Get user profile failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve user profile" });
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const user = await userService.updateProfile(userId, req.body);
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Update user profile failed:", error);
    res.status(500).json({ success: false, message: "Unable to update user profile" });
  }
};

