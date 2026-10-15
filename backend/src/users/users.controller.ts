import type { Request, Response, NextFunction } from "express";
import * as usersService from "./users.service.js";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  listUsersQuerySchema,
} from "./users.schemas.js";

// ─── List users ──────────────────────────────────────────────

export async function listUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await usersService.listUsers(query);
    // If the client expects the bare array (e.g. usersApi.list() expecting User[])
    // we provide result.users when requested or include pagination fields
    if (req.headers["x-paginated"] === "true") {
      res.status(200).json(result);
    } else {
      // Return bare array for simple frontend consuming api.get<User[]>('/users')
      res.status(200).json(result.users);
    }
  } catch (err) {
    next(err);
  }
}

// ─── Get single user ─────────────────────────────────────────

export async function getUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const user = await usersService.getUserById(id!);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

// ─── Create user ─────────────────────────────────────────────

export async function createUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = createUserSchema.parse(req.body);
    const user = await usersService.createUser(input);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

// ─── Update user ─────────────────────────────────────────────

export async function updateUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const input = updateUserSchema.parse(req.body);
    const user = await usersService.updateUser(id!, input);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

// ─── Deactivate user (soft-delete) ───────────────────────────

export async function deactivateUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const user = await usersService.deactivateUser(id!);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

// ─── Delete user (hard-delete) ───────────────────────────────

export async function deleteUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    await usersService.deleteUser(id!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Reset password ──────────────────────────────────────────

export async function resetPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const input = resetPasswordSchema.parse(req.body);
    await usersService.resetPassword(id!, input);
    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
}
