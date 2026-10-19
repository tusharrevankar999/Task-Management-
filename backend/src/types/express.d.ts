import type { Role } from "@prisma/client";

/**
 * Augment Express's Request interface so `req.user` is typed everywhere
 * without casting.
 *
 * Placed in src/types/ so it's picked up automatically by TypeScript.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        name: string;
        email: string;
        role: Role;
        isActive: boolean;
      };
    }
  }
}

export {};
