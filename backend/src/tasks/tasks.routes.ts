import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  listAllTasksHandler,
  listTasksHandler,
  getTaskHandler,
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
} from "./tasks.controller.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

// When mounted directly under /api/tasks:
router.get("/all", listAllTasksHandler);

// Nested routes under /api/projects/:projectId/tasks:
router.get("/", listTasksHandler);
router.post("/", createTaskHandler);
router.get("/:taskId", getTaskHandler);
router.patch("/:taskId", updateTaskHandler);
router.delete("/:taskId", deleteTaskHandler);

export default router;
