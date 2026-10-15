import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";

// ────────────────────────────────────────────────────────────
// Token payload shape
// ────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string; // userId (sub = JWT standard "subject" claim)
  role: Role;
}

// ────────────────────────────────────────────────────────────
// Sign
// ────────────────────────────────────────────────────────────

/**
 * Issue a signed JWT for the given user.
 *
 * Security decisions:
 *  - Only `userId` (as `sub`) and `role` are embedded — no PII.
 *    Including the role avoids a DB round-trip on every request while
 *    still being safe to re-verify on each request via authenticate middleware.
 *  - Expiry is read from env so it can be shortened in production.
 *  - HS256 is used; upgrade to RS256 if you need asymmetric verification
 *    (e.g., multiple microservices consuming the same token).
 */
export function signToken(userId: string, role: Role): string {
  return jwt.sign({ role } as Omit<JwtPayload, "sub">, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

// ────────────────────────────────────────────────────────────
// Verify — exported as a standalone function so Socket.IO (or
// any other transport) can reuse it without importing Express.
// ────────────────────────────────────────────────────────────

/**
 * Verify a Bearer token string and return its decoded payload.
 *
 * Throws `AppError.unauthorized` if the token is missing, malformed,
 * expired, or signed with the wrong secret.
 *
 * @param token - Raw token string (without "Bearer " prefix).
 */
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
    // jwt.verify throws JsonWebTokenError / TokenExpiredError — we normalize
    // them to a single generic message so the client can't distinguish
    // "expired" from "tampered" (prevents oracle attacks).
    throw AppError.unauthorized("Invalid or expired token");
  }
}
