import type { Request, Response, NextFunction } from "express";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import * as authService from "./auth.service.js";

/**
 * POST /api/auth/register
 *
 * Body: { name: string; email: string; password: string }
 * Returns: { token: string; user: SafeUser }
 */
export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(
      input.name,
      input.email,
      input.password
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 *
 * Body: { email: string; password: string }
 * Returns: { token: string; user: SafeUser }
 */
export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input.email, input.password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 *
 * Requires: Bearer token (authenticate middleware applied in router)
 * Returns: SafeUser (compatible with both direct object or { user: ... })
 */
export async function getMeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // req.user is guaranteed by authenticate middleware
    const user = await authService.getMe(req.user!.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 *
 * Body: { email: string }
 */
export async function forgotPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { forgotPasswordSchema } = await import("./auth.schemas.js");
    const input = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(input.email);
    res.status(200).json({
      message: "Password reset link has been successfully sent to your email address.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 *
 * Body: { token: string; password: string }
 */
export async function resetPasswordConfirmHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { resetPasswordConfirmSchema } = await import("./auth.schemas.js");
    const input = resetPasswordConfirmSchema.parse(req.body);
    await authService.resetPasswordWithToken(input.token, input.password);
    res.status(200).json({
      message: "Password has been successfully updated. You may now sign in.",
    });
  } catch (err) {
    next(err);
  }
}
