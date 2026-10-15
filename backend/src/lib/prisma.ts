import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance — avoids exhausting DB connection pool.
// In development tsx restarts the process, so a module-level singleton is fine.
const prisma = new PrismaClient({
  log:
    process.env["NODE_ENV"] === "development"
      ? ["query", "warn", "error"]
      : ["error"],
});

export default prisma;
