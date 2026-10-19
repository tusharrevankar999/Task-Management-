import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";

// ────────────────────────────────────────────────────────────
// Token payload shape
// ────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string; // userId as string
  role: Role;
}

// ────────────────────────────────────────────────────────────
// Sign
// ────────────────────────────────────────────────────────────

export function signToken(userId: number | string, role: Role): string {
  return jwt.sign({ role } as Omit<JwtPayload, "sub">, env.JWT_SECRET, {
    subject: String(userId),
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

// ────────────────────────────────────────────────────────────
// Verify
// ────────────────────────────────────────────────────────────

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;

    if (!decoded.sub || !decoded["role"]) {
      throw AppError.unauthorized("Invalid token payload");
    }

    return {
      sub: decoded.sub,
      role: decoded["role"] as Role,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized("Invalid or expired token");
  }
}
