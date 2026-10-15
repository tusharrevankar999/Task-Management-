import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { Role } from "@prisma/client";
import { AppError } from "../errors/AppError.js";

/**
 * requireRole — role-based access control gate.
 *
 * Usage:
 *   router.get('/admin-only', authenticate, requireRole('ADMIN'), handler)
 *   router.get('/either',    authenticate, requireRole('ADMIN', 'USER'), handler)
 *
 * Must be used AFTER the `authenticate` middleware (which populates req.user).
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(AppError.unauthorized());
      return;
    }
    if (!roles.includes(user.role)) {
      next(AppError.forbidden("Insufficient permissions"));
      return;
    }
    next();
  };
}
