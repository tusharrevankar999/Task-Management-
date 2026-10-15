// Central export so Socket.IO (or any future transport) can import
// just the JWT utilities without pulling in Express.
export { verifyToken, signToken } from "./utils/jwt.js";
export type { JwtPayload } from "./utils/jwt.js";

// Error types
export { AppError } from "./errors/AppError.js";

// Middleware
export { authenticate } from "./middleware/authenticate.js";
export { requireRole } from "./middleware/requireRole.js";
export {
  requireProjectMember,
  type GetMembership,
} from "./middleware/requireProjectMember.js";
