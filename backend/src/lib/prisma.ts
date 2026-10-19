import { PrismaClient } from "@prisma/client";

// In Neon PostgreSQL (with connection pooler), pgbouncer=true prevents
// "cached plan must not change result type" errors when table schemas change.
let databaseUrl = process.env["DATABASE_URL"] || "";
if (databaseUrl && !databaseUrl.includes("pgbouncer=true")) {
  databaseUrl += (databaseUrl.includes("?") ? "&" : "?") + "pgbouncer=true";
}

const prisma = new PrismaClient({
  datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
  log:
    process.env["NODE_ENV"] === "development"
      ? ["query", "warn", "error"]
      : ["error"],
});

export default prisma;
