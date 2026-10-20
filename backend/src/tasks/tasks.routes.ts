import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  listAllTasksHandler,
  listTasksHandler,
  getTaskHandler,
  createTaskHandler,
  updateTaskHandler,
  reorderTasksHandler,
  deleteTaskHandler,
} from "./tasks.controller.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

// When mounted directly under /api/tasks:
router.get("/all", listAllTasksHandler);
router.put("/reorder", reorderTasksHandler);

// Nested routes under /api/projects/:projectId/tasks:
router.get("/", listTasksHandler);
router.post("/", createTaskHandler);
router.put("/reorder", reorderTasksHandler);
router.get("/:taskId", getTaskHandler);
router.patch("/:taskId", updateTaskHandler);
router.delete("/:taskId", deleteTaskHandler);

export default router;
