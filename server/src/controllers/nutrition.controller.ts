import { Request, Response, NextFunction } from "express";
import { nutritionService } from "../services/nutrition.service";
import { AppError } from "../errors/AppError";

const getAuthenticatedUserId = (req: Request, res: Response): string | undefined => {
  if (!(req as any).authenticatedUserId) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return undefined;
  }
  return (req as any).authenticatedUserId;
};

class NutritionController {
  public addEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthenticatedUserId(req, res);
      if (!userId) return;
      
      const entry = await nutritionService.addEntry(userId, req.body);
      
      res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      next(error);
    }
  };

  public getEntries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthenticatedUserId(req, res);
      if (!userId) return;
      
      const { date } = req.query;
      
      if (!date || typeof date !== 'string') {
        throw new AppError("Date query parameter is required", 400);
      }
      
      const entries = await nutritionService.getEntriesByDate(userId, date);
      
      res.status(200).json({
        success: true,
        data: entries,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthenticatedUserId(req, res);
      if (!userId) return;
      
      const { id } = req.params;
      const updatedEntry = await nutritionService.updateEntry(userId, id as string, req.body);
      
      res.status(200).json({
        success: true,
        data: updatedEntry,
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthenticatedUserId(req, res);
      if (!userId) return;
      
      const { id } = req.params;
      await nutritionService.deleteEntry(userId, id as string);
      
      res.status(200).json({
        success: true,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };

  public getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthenticatedUserId(req, res);
      if (!userId) return;
      
      const { date } = req.query;
      
      if (!date || typeof date !== 'string') {
        throw new AppError("Date query parameter is required", 400);
      }
      
      const summary = await nutritionService.getSummary(userId, date);
      
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const nutritionController = new NutritionController();
