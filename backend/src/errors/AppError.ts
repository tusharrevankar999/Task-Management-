/**
 * AppError — structured application error.
 *
 * All intentional HTTP errors thrown inside the app should use this class so
 * the central error handler can produce a consistent response shape:
 *
 *   { error: { code, message, details? } }
 *
 * Security note: `code` is a machine-readable string (e.g. "UNAUTHORIZED")
 * while `message` is a human-readable string safe to surface to the client.
 * Never embed internal DB details in either field.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    // Maintains proper prototype chain in transpiled ES5
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /** 400 Bad Request */
  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, "BAD_REQUEST", message, details);
  }

  /** 401 Unauthorized */
  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError(401, "UNAUTHORIZED", message);
  }

  /** 403 Forbidden */
  static forbidden(message = "Forbidden"): AppError {
    return new AppError(403, "FORBIDDEN", message);
  }

  /** 404 Not Found */
  static notFound(resource = "Resource"): AppError {
    return new AppError(404, "NOT_FOUND", `${resource} not found`);
  }

  /** 409 Conflict */
  static conflict(message: string): AppError {
    return new AppError(409, "CONFLICT", message);
  }
}
