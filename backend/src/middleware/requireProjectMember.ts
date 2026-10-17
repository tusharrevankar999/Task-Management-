import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.js";

export type GetMembership = (
  userId: number,
  projectId: number
) => Promise<boolean>;

export function requireProjectMember(getMembership: GetMembership) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        throw AppError.unauthorized("Authentication required");
      }

      if (user.role === "ADMIN") {
        return next();
      }

      const rawProjectId = req.params["projectId"];
      const projectId = Number(rawProjectId);
      if (!rawProjectId || isNaN(projectId)) {
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
