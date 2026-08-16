import { Request, Response } from "express";
import { progressionService } from "../services/progression.service";

export const getExerciseRecommendation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.authenticatedUserId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const { exerciseName } = req.params;
    const plannedSetsStr = Array.isArray(req.query.plannedSets) ? req.query.plannedSets[0] : req.query.plannedSets;
    const plannedRepsStr = Array.isArray(req.query.plannedReps) ? req.query.plannedReps[0] : req.query.plannedReps;
    const plannedSets = parseInt(plannedSetsStr as string, 10);
    const plannedReps = parseInt(plannedRepsStr as string, 10);

    const recommendation = await progressionService.getRecommendation(
      userId,
      exerciseName as string,
      plannedSets,
      plannedReps
    );

    res.status(200).json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get progression recommendation",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
