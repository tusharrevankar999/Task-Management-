import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  deactivateUserHandler,
  deleteUserHandler,
  resetPasswordHandler,
} from "./users.controller.js";

const router = Router();

// All user management routes require authentication + ADMIN role
router.use(authenticate, requireRole("ADMIN"));

// GET    /api/users          — list with pagination, filtering, search
router.get("/", listUsersHandler);

// GET    /api/users/:id      — get single user
router.get("/:id", getUserHandler);

// POST   /api/users          — create user
router.post("/", createUserHandler);

// PATCH  /api/users/:id      — update name / role / isActive
router.patch("/:id", updateUserHandler);

// PATCH  /api/users/:id/deactivate  — soft-delete (sets isActive=false)
router.patch("/:id/deactivate", deactivateUserHandler);

// DELETE /api/users/:id      — hard-delete (permanent)
router.delete("/:id", deleteUserHandler);

// POST   /api/users/:id/reset-password  — admin resets a user's password
router.post("/:id/reset-password", resetPasswordHandler);

export default router;
