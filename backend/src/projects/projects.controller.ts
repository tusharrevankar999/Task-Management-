import type { Request, Response, NextFunction } from "express";
import * as projectsService from "./projects.service.js";
import { createProjectSchema, updateProjectSchema } from "./projects.schemas.js";
import { AppError } from "../errors/AppError.js";

function parseProjectId(rawId: string | undefined): number {
  const id = Number(rawId);
  if (!rawId || isNaN(id) || !Number.isInteger(id) || id <= 0) {
    throw AppError.badRequest("Invalid project ID. Must be a positive integer.");
  }
  return id;
}

export async function listProjectsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { search, status } = req.query;
    const projects = await projectsService.listProjects({
      search: typeof search === "string" ? search : undefined,
      status: typeof status === "string" ? status : undefined,
    });
    res.json({ projects });
  } catch (err) {
    next(err);
  }
}

export async function getProjectHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseProjectId(req.params["id"]);
    const project = await projectsService.getProjectById(id);
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function createProjectHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = createProjectSchema.parse(req.body);
    const userId = Number((req as any).user?.id);
    if (!userId || isNaN(userId)) {
      throw AppError.unauthorized("User ID is missing or invalid");
    }
    const project = await projectsService.createProject(input, userId);
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}

export async function updateProjectHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseProjectId(req.params["id"]);
    const input = updateProjectSchema.parse(req.body);
    const project = await projectsService.updateProject(id, input);
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function deleteProjectHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseProjectId(req.params["id"]);
    await projectsService.deleteProject(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
