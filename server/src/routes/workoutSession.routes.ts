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
import { apiMethodLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

router.use(authenticate);
router.use(apiMethodLimiter);

router.post("/", validateBody(startSessionSchema), startSession);
router.get("/", getSessions);
router.get("/active", getActiveSession);
router.get("/:id", validateParams(sessionIdParamSchema), getSessionById);
router.patch(
  "/:id",
  idempotencyMiddleware,
  validateRequest({ params: sessionIdParamSchema, body: updateSessionSchema }),
  updateSession
);
router.post(
  "/:id/complete",
  idempotencyMiddleware,
  validateRequest({ params: sessionIdParamSchema, body: completeSessionSchema }),
  completeSession
);

export default router;
