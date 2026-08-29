import { Router } from "express";
import { analyticsLimiter } from "../middleware/rateLimit.middleware";
import { analyticsController } from "../controllers/analytics.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateParams, validateQuery } from "../middleware/validation.middleware";
import { getExerciseProgressSchema, dateQuerySchema } from "../validation/analytics.validation";
import { validateWorkoutGeneratorRequest } from "../validation/workoutGenerator.validation";

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

router.get("/dashboard", analyticsController.getDashboard);
router.get("/readiness", analyticsController.getTrainingReadiness);
router.get("/personal-records", analyticsController.getPersonalRecords);
router.get("/personal-records/:exerciseName", validateParams(getExerciseProgressSchema), analyticsController.getPersonalRecordByExercise);
router.get("/exercise/:exerciseName", validateParams(getExerciseProgressSchema), analyticsController.getExercise);
router.get("/insight", analyticsLimiter, validateQuery(dateQuerySchema), analyticsController.getInsight);
router.get("/progress-insight", analyticsLimiter, validateQuery(dateQuerySchema), analyticsController.getProgressInsight);
router.get("/progress-analysis", analyticsLimiter, validateQuery(dateQuerySchema), analyticsController.getProgressAnalysis);
router.get("/nutrition-analysis", analyticsLimiter, validateQuery(dateQuerySchema), analyticsController.getNutritionAnalysis);
router.get("/workout-analysis", analyticsLimiter, validateQuery(dateQuerySchema), analyticsController.getWorkoutAnalysis);
router.get("/readiness-analysis", analyticsLimiter, analyticsController.getReadinessAnalysis);
router.get("/daily-summary", analyticsLimiter, validateQuery(dateQuerySchema), analyticsController.getDailySummary);
router.post("/generate-workout-plan", analyticsLimiter, validateWorkoutGeneratorRequest, analyticsController.generateWorkoutPlan);

export default router;
