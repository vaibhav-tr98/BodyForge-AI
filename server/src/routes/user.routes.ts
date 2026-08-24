import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { updateProfileSchema } from "../validation/user.validation";

const router = Router();

router.get("/me/profile", authenticate, getProfile);
router.patch("/me/profile", authenticate, validateBody(updateProfileSchema), updateProfile);
router.put("/me/profile", authenticate, validateBody(updateProfileSchema), updateProfile);

export default router;
