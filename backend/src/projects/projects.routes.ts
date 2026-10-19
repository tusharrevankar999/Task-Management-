import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  listProjectsHandler,
  getProjectHandler,
  createProjectHandler,
  updateProjectHandler,
  deleteProjectHandler,
} from "./projects.controller.js";

const router = Router();

// All project routes require authentication
router.use(authenticate);

router.get("/", listProjectsHandler);
router.post("/", createProjectHandler);
router.get("/:id", getProjectHandler);
router.patch("/:id", updateProjectHandler);
router.delete("/:id", deleteProjectHandler);

export default router;
