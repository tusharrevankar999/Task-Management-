import express from "express";
import cors from "cors";
import authRoutes from "./auth/auth.routes.js";
import usersRoutes from "./users/users.routes.js";
import { errorHandler } from "./errors/errorHandler.js";

const app = express();

// ─── Global middleware ───────────────────────────────────────

app.use(
  cors({
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
    credentials: true,
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

// ─── 404 handler ─────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
});

// ─── Central error handler (must be last) ────────────────────

app.use(errorHandler);

export default app;
