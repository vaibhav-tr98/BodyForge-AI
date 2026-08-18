import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateParams } from "../middleware/validation.middleware";
import { getExerciseProgressSchema } from "../validation/analytics.validation";

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

router.get("/dashboard", analyticsController.getDashboard);
router.get("/personal-records", analyticsController.getPersonalRecords);
router.get("/personal-records/:exerciseName", validateParams(getExerciseProgressSchema), analyticsController.getPersonalRecordByExercise);
router.get("/exercise/:exerciseName", validateParams(getExerciseProgressSchema), analyticsController.getExercise);

export default router;
