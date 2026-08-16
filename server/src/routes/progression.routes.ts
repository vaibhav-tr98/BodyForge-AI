import { Router } from "express";
import { getExerciseRecommendation } from "../controllers/progression.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateProgressionRequest } from "../validation/progression.validation";

const router = Router();

router.use(authenticate);

router.get("/:exerciseName", validateProgressionRequest, getExerciseRecommendation);

export default router;
