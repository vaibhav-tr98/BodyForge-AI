import { Router } from "express";
import {
  createWorkout,
  deleteWorkout,
  getWorkoutById,
  getWorkouts,
  getTodayRecommendation,
  updateWorkout,
} from "../controllers/workout.controller";
import { authenticate } from "../middleware/auth.middleware";
import {
  validateBody,
  validateParams,
  validateRequest,
} from "../middleware/validation.middleware";
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  workoutIdParamSchema,
} from "../validation/workout.validation";
import { apiMethodLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

router.use(authenticate);
router.use(apiMethodLimiter);

router.post("/", validateBody(createWorkoutSchema), createWorkout);
router.get("/", getWorkouts);
router.get("/recommendation/today", getTodayRecommendation);
router.get("/:id", validateParams(workoutIdParamSchema), getWorkoutById);
router.patch(
  "/:id",
  validateRequest({ params: workoutIdParamSchema, body: updateWorkoutSchema }),
  updateWorkout
);
router.delete("/:id", validateParams(workoutIdParamSchema), deleteWorkout);

export default router;
