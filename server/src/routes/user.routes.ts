import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { updateProfileSchema } from "../validation/user.validation";
import { apiMethodLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

router.use(authenticate);
router.use(apiMethodLimiter);

router.get("/me/profile", getProfile);
router.patch("/me/profile", validateBody(updateProfileSchema), updateProfile);
router.put("/me/profile", validateBody(updateProfileSchema), updateProfile);

export default router;
