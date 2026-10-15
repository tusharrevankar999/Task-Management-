import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  loginHandler,
  registerHandler,
  getMeHandler,
} from "./auth.controller.js";

const router = Router();

// POST /api/auth/register — public
router.post("/register", registerHandler);

// POST /api/auth/login — public
router.post("/login", loginHandler);

// GET /api/auth/me — requires valid JWT
router.get("/me", authenticate, getMeHandler);

export default router;
