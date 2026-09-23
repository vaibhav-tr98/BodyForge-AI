import { Router } from "express";
import { getExercises, getExerciseById } from "../controllers/exercise.controller";
import { validateQuery, validateParams } from "../middleware/validation.middleware";
import { exerciseIdParamSchema, searchExercisesSchema } from "../validation/exercise.validation";
import { readLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

// Publicly accessible exercise library routes
router.use(readLimiter);

router.get("/", validateQuery(searchExercisesSchema), getExercises);
router.get("/:id", validateParams(exerciseIdParamSchema), getExerciseById);

export default router;
