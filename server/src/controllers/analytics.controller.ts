import { Request, Response, NextFunction } from "express";
import { analyticsService } from "../services/analytics.service";

class AnalyticsController {
  public getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.authenticatedUserId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const data = await analyticsService.getDashboardAnalytics(userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  public getExercise = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.authenticatedUserId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const exerciseName = req.params.exerciseName as string;
      const data = await analyticsService.getExerciseProgress(userId, exerciseName);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export const analyticsController = new AnalyticsController();
