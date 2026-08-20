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

const router = Router();

router.post("/", authenticate, validateBody(createWorkoutSchema), createWorkout);
router.get("/", authenticate, getWorkouts);
router.get("/recommendation/today", authenticate, getTodayRecommendation);
router.get("/:id", authenticate, validateParams(workoutIdParamSchema), getWorkoutById);
router.patch(
  "/:id",
  authenticate,
  validateRequest({ params: workoutIdParamSchema, body: updateWorkoutSchema }),
  updateWorkout
);
router.delete("/:id", authenticate, validateParams(workoutIdParamSchema), deleteWorkout);

export default router;
