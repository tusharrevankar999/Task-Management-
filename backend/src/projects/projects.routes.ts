import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  listProjectsHandler,
  getProjectHandler,
  createProjectHandler,
  updateProjectHandler,
  deleteProjectHandler,
} from "./projects.controller.js";
import tasksRoutes from "../tasks/tasks.routes.js";

const router = Router();

// All project routes require authentication
router.use(authenticate);

// Nested tasks routes
router.use("/:projectId/tasks", tasksRoutes);

router.get("/", listProjectsHandler);
router.post("/", requireRole("ADMIN"), createProjectHandler);
router.get("/:id", getProjectHandler);
router.patch("/:id", requireRole("ADMIN"), updateProjectHandler);
router.delete("/:id", requireRole("ADMIN"), deleteProjectHandler);

export default router;
