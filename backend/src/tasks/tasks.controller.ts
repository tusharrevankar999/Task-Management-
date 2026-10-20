import type { Request, Response, NextFunction } from "express";
import * as tasksService from "./tasks.service.js";
import { createTaskSchema, updateTaskSchema, reorderTasksSchema } from "./tasks.schemas.js";
import { AppError } from "../errors/AppError.js";

function parseProjectId(rawId: string | string[] | undefined): number {
  if (Array.isArray(rawId)) rawId = rawId[0];
  const id = Number(rawId);
  if (!rawId || isNaN(id) || !Number.isInteger(id) || id <= 0) {
    throw AppError.badRequest("Invalid project ID. Must be a positive integer.");
  }
  return id;
}

function parseTaskId(rawId: string | string[] | undefined): number {
  if (Array.isArray(rawId)) rawId = rawId[0];
  const id = Number(rawId);
  if (!rawId || isNaN(id) || !Number.isInteger(id) || id <= 0) {
    throw AppError.badRequest("Invalid task ID. Must be a positive integer.");
  }
  return id;
}

export async function listAllTasksHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      throw AppError.unauthorized("Authentication required");
    }

    const page = req.query["page"] ? Number(req.query["page"]) : 1;
    const limit = req.query["limit"] ? Number(req.query["limit"]) : 10;
    const search = typeof req.query["search"] === "string" ? req.query["search"] : undefined;
    const status = typeof req.query["status"] === "string" ? req.query["status"] : undefined;
    const projectId = req.query["projectId"] ? Number(req.query["projectId"]) : undefined;

    const result = await tasksService.listAllTasks(user, {
      page,
      limit,
      search,
      status,
      projectId: isNaN(projectId as number) ? undefined : projectId,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
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

export async function getTaskHandler(
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
    const taskId = parseTaskId(req.params["taskId"]);
    const task = await tasksService.getTaskById(user, projectId, taskId);

    res.json({ data: task });
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

export async function updateTaskHandler(
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
    const taskId = parseTaskId(req.params["taskId"]);
    const input = updateTaskSchema.parse(req.body);
    const updatedTask = await tasksService.updateTask(user, projectId, taskId, input);

    res.json({ data: updatedTask });
  } catch (err) {
    next(err);
  }
}

export async function reorderTasksHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      throw AppError.unauthorized("Authentication required");
    }

    const rawProjectId = req.params["projectId"];
    const projectId = rawProjectId ? parseProjectId(rawProjectId) : undefined;
    const input = reorderTasksSchema.parse(req.body);

    const updated = await tasksService.reorderTasks(user, projectId, input);

    res.json({ success: true, count: updated.length });
  } catch (err) {
    next(err);
  }
}

export async function deleteTaskHandler(
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
    const taskId = parseTaskId(req.params["taskId"]);
    await tasksService.deleteTask(user, projectId, taskId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
