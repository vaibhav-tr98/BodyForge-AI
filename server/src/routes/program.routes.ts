import express from "express";
import {
  createProgram,
  getPrograms,
  getProgramById,
  updateProgram,
  deleteProgram,
  getTodaySchedule,
} from "../controllers/program.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authenticate);

router.post("/", createProgram);
router.get("/", getPrograms);
router.get("/active/today", getTodaySchedule);
router.get("/:id", getProgramById);
router.patch("/:id", updateProgram);
router.delete("/:id", deleteProgram);

export default router;
