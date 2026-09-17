
import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import logger from "../utils/logger";
import programAnalyticsService from "../services/programAnalytics.service";

export const getProgramAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.authenticatedUserId;
  if (!userId) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  try {
    const id = req.params.id as string;
    const analytics = await programAnalyticsService.getAnalytics(userId, id);
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Get program analytics failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve program analytics" });
  }
};

