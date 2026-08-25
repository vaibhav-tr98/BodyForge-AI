import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateParams } from "../middleware/validation.middleware";
import { getExerciseProgressSchema } from "../validation/analytics.validation";

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

router.get("/dashboard", analyticsController.getDashboard);
router.get("/readiness", analyticsController.getTrainingReadiness);
router.get("/personal-records", analyticsController.getPersonalRecords);
router.get("/personal-records/:exerciseName", validateParams(getExerciseProgressSchema), analyticsController.getPersonalRecordByExercise);
router.get("/exercise/:exerciseName", validateParams(getExerciseProgressSchema), analyticsController.getExercise);
router.get("/insight", analyticsController.getInsight);
router.get("/progress-insight", analyticsController.getProgressInsight);
router.get("/progress-analysis", analyticsController.getProgressAnalysis);
router.get("/nutrition-analysis", analyticsController.getNutritionAnalysis);
export default router;
