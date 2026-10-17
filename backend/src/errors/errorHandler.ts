import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "./AppError.js";

/**
 * Central error handler.
 *
 * Response shape — always:
 *   { error: { code: string; message: string; details?: unknown } }
 *
 * Security policy:
 *  - ZodError validation failures → 422 VALIDATION_ERROR with field details.
 *  - AppError → forwarded as-is (already safe for the client).
 *  - All other errors → logged server-side, generic 500 returned to the client
 *    so internal stack traces / DB messages are never leaked.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // --- Zod validation errors ---
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: (err.issues ?? (err as any).errors ?? []).map((e: any) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
    });
    return;
  }

  // --- Known application errors ---
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      code: err.code,
      message: err.message,
    };
    if (err.details !== undefined) body["details"] = err.details;

    res.status(err.statusCode).json({ error: body });
    return;
  }

  // --- Unknown errors — log but never leak internals ---
  console.error("[Unhandled Error]", err);

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
