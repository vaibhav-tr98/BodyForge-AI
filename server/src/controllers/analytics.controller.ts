import { workoutGeneratorService } from "../services/workoutGenerator.service";
import { Request, Response, NextFunction } from "express";
import { analyticsService } from "../services/analytics.service";
import { insightService } from "../services/insight.service";
import { progressInsightService } from "../services/progressInsight.service";
import { progressAnalysisService } from "../services/progressAnalysis.service";
import { nutritionAnalysisService } from "../services/nutritionAnalysis.service";
import { workoutAnalysisService } from "../services/workoutAnalysis.service";
import { readinessAnalysisService } from "../services/readinessAnalysis.service";
import { dailySummaryService } from "../services/dailySummary.service";
import logger from "../utils/logger";

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

  public getProgressInsight = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.authenticatedUserId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      
      // Date is part of requirements to be validated, though the insight service doesn't need it 
      // as it gets chronologically the last 2 entries. The requirement says:
      // Add: GET /api/analytics/progress-insight?date=YYYY-MM-DD
      const date = req.query.date as string;
      if (!date) {
        res.status(400).json({ success: false, message: "Date is required" });
        return;
      }

      const data = await progressInsightService.getProgressInsight(userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
  public getProgressAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const data = await progressAnalysisService.getProgressAnalysis(userId, date);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  public getNutritionAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const data = await nutritionAnalysisService.getNutritionAnalysis(userId, date);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  public getWorkoutAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const data = await workoutAnalysisService.getWorkoutAnalysis(userId, date);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  public getReadinessAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.authenticatedUserId!;
      const analysis = await readinessAnalysisService.getReadinessAnalysis(userId);
      res.status(200).json(analysis);
    } catch (error: any) {
      if (error.message === "AI analysis is temporarily unavailable.") {
        res.status(503).json({ success: false, message: error.message });
      } else {
        logger.error("Failed to generate readiness analysis", { error });
        next(error);
      }
    }
  };

  public getDailySummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const data = await dailySummaryService.getDailySummary(userId, date);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      if (error.message === "AI analysis is temporarily unavailable.") {
        res.status(503).json({ success: false, message: error.message });
      } else {
        logger.error("Failed to generate daily summary", { error });
        next(error);
      }
    }
  };

  public generateWorkoutPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.authenticatedUserId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const data = await workoutGeneratorService.generateWorkout(userId, req.body);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      if (error.message === "AI workout generation is temporarily unavailable.") {
        res.status(503).json({ success: false, message: error.message });
      } else {
        logger.error("Failed to generate workout plan", { error });
        next(error);
      }
    }
  };

}

export const analyticsController = new AnalyticsController();
