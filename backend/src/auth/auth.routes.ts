import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  loginHandler,
  registerHandler,
  getMeHandler,
  forgotPasswordHandler,
  resetPasswordConfirmHandler,
} from "./auth.controller.js";

const router = Router();

// POST /api/auth/register — public
router.post("/register", registerHandler);

// POST /api/auth/login — public
router.post("/login", loginHandler);

// POST /api/auth/forgot-password — public
router.post("/forgot-password", forgotPasswordHandler);

// POST /api/auth/reset-password — public
router.post("/reset-password", resetPasswordConfirmHandler);

// GET /api/auth/me — requires valid JWT
router.get("/me", authenticate, getMeHandler);

export default router;
