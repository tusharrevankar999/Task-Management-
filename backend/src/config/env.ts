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

  CLIENT_URL: process.env["CLIENT_URL"] ?? "http://localhost:5173",

  // SMTP Mailer (optional: if omitted, nodemailer falls back to Ethereal/Console preview)
  SMTP_HOST: process.env["SMTP_HOST"],
  SMTP_PORT: process.env["SMTP_PORT"] ? parseInt(process.env["SMTP_PORT"], 10) : 587,
  SMTP_USER: process.env["SMTP_USER"],
  SMTP_PASS: process.env["SMTP_PASS"],
  SMTP_FROM: process.env["SMTP_FROM"] ?? "Task Management <no-reply@taskmanagement.com>",
} as const;
