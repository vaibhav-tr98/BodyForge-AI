import { Request, Response, NextFunction } from "express";
import { analyticsService } from "../services/analytics.service";
import { insightService } from "../services/insight.service";

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

  public getPersonalRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.authenticatedUserId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const data = await analyticsService.getPersonalRecordsAndInsights(userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  public getPersonalRecordByExercise = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.authenticatedUserId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const exerciseName = req.params.exerciseName as string;
      const data = await analyticsService.getPersonalRecordsAndInsights(userId);
      
      const pr = data.personalRecords.find((p: any) => p.exerciseName.toLowerCase() === exerciseName.toLowerCase());
      if (!pr) {
        res.status(404).json({ success: false, message: "No personal records found for this exercise" });
        return;
      }
      
      res.status(200).json({ success: true, data: pr });
    } catch (error) {
      next(error);
    }
  };

  public getTrainingReadiness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.authenticatedUserId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const data = await analyticsService.getTrainingReadiness(userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  public getInsight = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.authenticatedUserId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const date = req.query.date as string;
      if (!date) {
        res.status(400).json({ success: false, message: "Date is required" });
        return;
      }
      
      const data = await insightService.getInsight(userId, date);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export const analyticsController = new AnalyticsController();
