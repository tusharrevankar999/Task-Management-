import express from "express";
import cors from "cors";
import authRoutes from "./auth/auth.routes.js";
import usersRoutes from "./users/users.routes.js";
import projectsRoutes from "./projects/projects.routes.js";
import tasksRoutes from "./tasks/tasks.routes.js";
import notificationsRoutes from "./notifications/notifications.routes.js";
import { errorHandler } from "./errors/errorHandler.js";

const app = express();

// ─── Global middleware ───────────────────────────────────────

const configuredOrigins = (process.env["CORS_ORIGIN"] || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (
        configuredOrigins.includes("*") ||
        configuredOrigins.includes(normalizedOrigin) ||
        configuredOrigins.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        process.env["NODE_ENV"] !== "production"
      ) {
        return callback(null, true);
      }

      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10kb" })); // limit body size
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── Health check ────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Routes ──────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/notifications", notificationsRoutes);

// ─── 404 handler ─────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
});

// ─── Central error handler (must be last) ────────────────────

app.use(errorHandler);

export default app;
