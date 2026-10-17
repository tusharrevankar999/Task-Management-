import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
import prisma from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";

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
    const userId = Number(payload.sub);

    if (isNaN(userId)) {
      throw AppError.unauthorized("Invalid token payload");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw AppError.unauthorized("Invalid or expired token");
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
