import { Router } from "express";
import {
  createWorkout,
  deleteWorkout,
  getWorkoutById,
  getWorkouts,
  updateWorkout,
} from "../controllers/workout.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, createWorkout);
router.get("/", authenticate, getWorkouts);
router.get("/:id", authenticate, getWorkoutById);
router.patch("/:id", authenticate, updateWorkout);
router.delete("/:id", authenticate, deleteWorkout);

export default router;
