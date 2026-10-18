import type { Request, Response, NextFunction, RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";

/**
 * GetMembership — an async function you inject from your project layer.
 * It must return true if the given user is a member of the given project.
 *
 * Using dependency injection keeps this middleware completely decoupled from
 * the Project schema so it compiles even before you add projects.
 *
 * Example (once you build the project layer):
 *   import { isMember } from '../projects/projectService.js';
 *   router.get('/projects/:projectId/tasks',
 *     authenticate,
 *     requireProjectMember(isMember),
 *     taskController.list
 *   );
 */
export type GetMembership = (
  userId: string,
  projectId: string
) => Promise<boolean>;

/**
 * requireProjectMember — middleware factory.
 *
 * Behaviour:
 *  - ADMIN: always passes (bypasses membership check).
 *  - USER: calls `getMembership(userId, projectId)` and passes only if true.
 *  - projectId is read from `req.params.projectId`.
 *
 * Must be used AFTER `authenticate`.
 */
export function requireProjectMember(
  getMembership: GetMembership
): RequestHandler {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        throw AppError.unauthorized();
      }

      // ADMINs bypass the membership check entirely
      if (user.role === "ADMIN") {
        next();
        return;
      }

      const projectId = req.params.projectId;
      if (!projectId || typeof projectId !== "string") {
        throw AppError.badRequest("projectId is required in route params");
      }

      const isMember = await getMembership(user.id, projectId);
      if (!isMember) {
        throw AppError.forbidden("You are not a member of this project");
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
