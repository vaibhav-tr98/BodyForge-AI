import { getProgramAnalytics } from "../controllers/programAnalytics.controller";
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
import { validateParams } from "../middleware/validation.middleware";
import { programIdParamSchema } from "../validation/program.validation";
import { apiMethodLimiter } from "../middleware/rateLimit.middleware";

const router = express.Router();

router.use(authenticate);
router.use(apiMethodLimiter);

router.post("/", createProgram);
router.get("/", getPrograms);
router.get("/active/today", getTodaySchedule);
router.get("/:id/analytics", validateParams(programIdParamSchema), getProgramAnalytics);
router.get("/:id", validateParams(programIdParamSchema), getProgramById);
router.patch("/:id", validateParams(programIdParamSchema), updateProgram);
router.delete("/:id", validateParams(programIdParamSchema), deleteProgram);

export default router;
