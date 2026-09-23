import { Router } from "express";
import { getExerciseRecommendation } from "../controllers/progression.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateProgressionRequest } from "../validation/progression.validation";
import { readLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

router.use(authenticate);
router.use(readLimiter);

router.get("/:exerciseName", validateProgressionRequest, getExerciseRecommendation);

export default router;
