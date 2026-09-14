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
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import {
  validateBody,
  validateParams,
  validateRequest,
} from "../middleware/validation.middleware";
import {
  sessionIdParamSchema,
  startSessionSchema,
  updateSessionSchema,
  completeSessionSchema,
} from "../validation/workoutSession.validation";

const router = Router();

router.post("/", authenticate, validateBody(startSessionSchema), startSession);
router.get("/", authenticate, getSessions);
router.get("/active", authenticate, getActiveSession);
router.get("/:id", authenticate, validateParams(sessionIdParamSchema), getSessionById);
router.patch(
  "/:id",
  authenticate,
  idempotencyMiddleware,
  validateRequest({ params: sessionIdParamSchema, body: updateSessionSchema }),
  updateSession
);
router.post(
  "/:id/complete",
  authenticate,
  idempotencyMiddleware,
  validateRequest({ params: sessionIdParamSchema, body: completeSessionSchema }),
  completeSession
);

export default router;
