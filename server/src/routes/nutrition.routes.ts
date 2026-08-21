import { Router } from "express";
import { nutritionController } from "../controllers/nutrition.controller";
import { validateRequest } from "../middleware/validation.middleware";
import { authenticate } from "../middleware/auth.middleware";
import {
  createNutritionEntrySchema,
  updateNutritionEntrySchema,
  getNutritionByDateSchema
} from "../validation/nutrition.validation";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post("/", validateRequest(createNutritionEntrySchema), nutritionController.addEntry);
router.get("/", validateRequest(getNutritionByDateSchema), nutritionController.getEntries);
router.get("/summary", validateRequest(getNutritionByDateSchema), nutritionController.getSummary);
router.patch("/:id", validateRequest(updateNutritionEntrySchema), nutritionController.updateEntry);
router.delete("/:id", nutritionController.deleteEntry);

export default router;
