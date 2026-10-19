import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { listTasksHandler, createTaskHandler } from "./tasks.controller.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get("/", listTasksHandler);
router.post("/", createTaskHandler);

export default router;
