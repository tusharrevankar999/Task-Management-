import type { Request, Response, NextFunction } from "express";
import * as tasksService from "./tasks.service.js";
import { createTaskSchema } from "./tasks.schemas.js";
import { AppError } from "../errors/AppError.js";

function parseProjectId(rawId: string | string[] | undefined): number {
  if (Array.isArray(rawId)) rawId = rawId[0];
  const id = Number(rawId);
  if (!rawId || isNaN(id) || !Number.isInteger(id) || id <= 0) {
    throw AppError.badRequest("Invalid project ID. Must be a positive integer.");
  }
  return id;
}

export async function listTasksHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      throw AppError.unauthorized("Authentication required");
    }

    const projectId = parseProjectId(req.params["projectId"]);
    const tasks = await tasksService.listTasksByProjectId(user, projectId);

    res.json({ data: tasks });
  } catch (err) {
    next(err);
  }
}

export async function createTaskHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      throw AppError.unauthorized("Authentication required");
    }

    const projectId = parseProjectId(req.params["projectId"]);
    const input = createTaskSchema.parse(req.body);
    const task = await tasksService.createTask(user, projectId, input);

    res.status(201).json({ data: task });
  } catch (err) {
    next(err);
  }
}
