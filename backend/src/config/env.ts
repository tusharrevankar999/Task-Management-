/**
 * Typed environment helper.
 * Fails fast at startup if a required variable is missing.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env["NODE_ENV"] ?? "development",
  PORT: parseInt(process.env["PORT"] ?? "3001", 10),

  DATABASE_URL: requireEnv("DATABASE_URL"),

  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env["JWT_EXPIRES_IN"] ?? "1h",

  SEED_ADMIN_NAME: process.env["SEED_ADMIN_NAME"] ?? "Admin User",
  SEED_ADMIN_EMAIL: process.env["SEED_ADMIN_EMAIL"] ?? "admin@example.com",
  SEED_ADMIN_PASSWORD: process.env["SEED_ADMIN_PASSWORD"] ?? "Admin@1234",
} as const;
