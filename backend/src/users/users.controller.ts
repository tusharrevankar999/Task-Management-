import type { Request, Response, NextFunction } from "express";
import * as usersService from "./users.service.js";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  listUsersQuerySchema,
} from "./users.schemas.js";
import { AppError } from "../errors/AppError.js";

function parseUserId(rawId: string | undefined): number {
  const id = Number(rawId);
  if (!rawId || isNaN(id) || !Number.isInteger(id) || id <= 0) {
    throw AppError.badRequest("Invalid user ID. Must be a positive integer.");
  }
  return id;
}

export async function listUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await usersService.listUsers(query);
    if (req.headers["x-paginated"] === "true") {
      res.status(200).json(result);
    } else {
      res.status(200).json(result.users);
    }
  } catch (err) {
    next(err);
  }
}

export async function getUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseUserId(req.params.id);
    const user = await usersService.getUserById(id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function createUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = createUserSchema.parse(req.body);
    const user = await usersService.createUser(input);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseUserId(req.params.id);
    const input = updateUserSchema.parse(req.body);
    const user = await usersService.updateUser(id, input);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

export async function deactivateUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseUserId(req.params.id);
    const user = await usersService.deactivateUser(id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

export async function deleteUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseUserId(req.params.id);
    await usersService.deleteUser(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseUserId(req.params.id);
    const input = resetPasswordSchema.parse(req.body);
    await usersService.resetPassword(id, input);
    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
}
