import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
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
router.post("/", createProjectHandler);
router.get("/:id", getProjectHandler);
router.patch("/:id", updateProjectHandler);
router.delete("/:id", deleteProjectHandler);

export default router;

