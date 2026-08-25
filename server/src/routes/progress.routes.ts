import { Router } from "express";
import { 
  getProgressHistory, 
  getProgressSummary, 
  getProgressEntry, 
  createProgressEntry, 
  updateProgressEntry, 
  deleteProgressEntry 
} from "../controllers/progress.controller";
import { validateRequest } from "../middleware/validation.middleware";
import { authenticate } from "../middleware/auth.middleware";
import {
  createProgressEntrySchema,
  updateProgressEntrySchema
} from "../validation/progress.validation";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get("/summary", getProgressSummary);
router.get("/", getProgressHistory);
router.get("/:id", getProgressEntry);
router.post("/", validateRequest(createProgressEntrySchema), createProgressEntry);
router.patch("/:id", validateRequest(updateProgressEntrySchema), updateProgressEntry);
router.delete("/:id", deleteProgressEntry);

export default router;
