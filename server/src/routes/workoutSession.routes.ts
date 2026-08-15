import { Router } from "express";
import {
  completeSession,
  getActiveSession,
  getSessionById,
  getSessions,
  startSession,
  updateSession,
} from "../controllers/workoutSession.controller";
import { authenticate } from "../middleware/auth.middleware";
import {
  validateBody,
  validateParams,
  validateRequest,
} from "../middleware/validation.middleware";
import {
  sessionIdParamSchema,
  startSessionSchema,
  updateSessionSchema,
} from "../validation/workoutSession.validation";

const router = Router();

router.post("/", authenticate, validateBody(startSessionSchema), startSession);
router.get("/", authenticate, getSessions);
router.get("/active", authenticate, getActiveSession);
router.get("/:id", authenticate, validateParams(sessionIdParamSchema), getSessionById);
router.patch(
  "/:id",
  authenticate,
  validateRequest({ params: sessionIdParamSchema, body: updateSessionSchema }),
  updateSession
);
router.post(
  "/:id/complete",
  authenticate,
  validateParams(sessionIdParamSchema),
  completeSession
);

export default router;
