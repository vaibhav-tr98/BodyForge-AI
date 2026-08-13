import { Router } from "express";
import { login, register } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validation.middleware";
import { loginSchema, registerSchema } from "../validation/auth.validation";

const router = Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);

export default router;
