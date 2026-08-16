import { Request, Response, NextFunction } from "express";

export const validateProgressionRequest = (req: Request, res: Response, next: NextFunction) => {
  const { exerciseName } = req.params;
  const { plannedSets, plannedReps } = req.query;

  if (!exerciseName || typeof exerciseName !== "string" || exerciseName.trim().length === 0) {
    return res.status(400).json({ success: false, message: "Valid exerciseName is required" });
  }

  if (exerciseName.length > 100) {
    return res.status(400).json({ success: false, message: "exerciseName is too long" });
  }

  const sets = parseInt(plannedSets as string, 10);
  const reps = parseInt(plannedReps as string, 10);

  if (isNaN(sets) || sets <= 0 || sets > 50) {
    return res.status(400).json({ success: false, message: "Valid plannedSets (1-50) is required in query" });
  }

  if (isNaN(reps) || reps <= 0 || reps > 200) {
    return res.status(400).json({ success: false, message: "Valid plannedReps (1-200) is required in query" });
  }

  next();
};
