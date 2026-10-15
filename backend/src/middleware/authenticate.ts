import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
import prisma from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";

/**
 * authenticate — verifies the Bearer JWT, loads the full user from DB,
 * and attaches it to `req.user`.
 *
 * Security decisions:
 *  - We always load the user from DB (not just from the token) so that
 *    deactivated or deleted accounts are rejected immediately, even if their
 *    token hasn't expired yet.
 *  - The error message is intentionally generic: we do NOT distinguish
 *    "user not found" from "token invalid" to prevent enumeration.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw AppError.unauthorized("Missing or malformed Authorization header");
    }

    const token = authHeader.slice(7); // strip "Bearer "
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      // Same message for "not found" and "deactivated" — avoids leaking status
      throw AppError.unauthorized("Invalid or expired token");
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
