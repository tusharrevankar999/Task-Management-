import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyToken } from "./utils/jwt.js";
import prisma from "./lib/prisma.js";
import { addNotification } from "./notifications/notifications.store.js";

let io: SocketIOServer | null = null;

export interface SocketUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (_origin, callback) => {
        // Allow any client origin
        callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  // Socket Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const payload = verifyToken(token);
      const userId = Number(payload.sub);

      if (isNaN(userId)) {
        return next(new Error("Invalid token payload"));
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return next(new Error("User not found or inactive"));
      }

      (socket as any).user = user;
      next();
    } catch (err: any) {
      console.error("[Socket.IO] Auth error:", err.message);
      next(new Error("Socket authentication failed: " + (err.message || "Unknown error")));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const user = (socket as any).user as SocketUser;
    if (!user) return;

    const userRoom = `user:${user.id}`;
    socket.join(userRoom);
    socket.join("authenticated:users");

    if (user.role === "ADMIN") {
      socket.join("role:admin");
    }

    try {
      const projectMemberships = await prisma.projectMember.findMany({
        where: { userId: user.id },
        select: { projectId: true },
      });

      projectMemberships.forEach((pm) => {
        socket.join(`project:${pm.projectId}`);
      });
    } catch (err) {
      console.error("[Socket.IO] Error joining project rooms:", err);
    }

    socket.on("disconnect", () => {
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO has not been initialized yet!");
  }
  return io;
}

export interface TaskNotificationPayload {
  action: "ASSIGNED" | "UPDATED" | "COMPLETED" | "REORDERED" | "DELETED" | "CREATED" | "PROJECT_ASSIGNED" | "PROJECT_CREATED";
  taskId?: number;
  taskTitle?: string;
  projectId?: number;
  projectName?: string;
  message: string;
  updatedBy: {
    id: number;
    name: string;
  };
  task?: any;
  project?: any;
  reorderedTaskIds?: number[];
  recipientUserIds?: number[];
}

/**
 * Broadcast notification
 */
export async function emitTaskNotification(payload: TaskNotificationPayload) {
  // Save notification so user who logs in later gets it!
  const stored = addNotification({
    action: payload.action,
    taskId: payload.taskId,
    taskTitle: payload.taskTitle,
    projectId: payload.projectId,
    projectName: payload.projectName,
    message: payload.message,
    updatedBy: payload.updatedBy,
    recipientUserIds: payload.recipientUserIds,
  });

  if (!io) {
    return;
  }

  const broadcastPayload = {
    ...payload,
    id: stored.id,
    createdAt: stored.createdAt,
  };

  io.emit("task:notification", broadcastPayload);
  io.emit(`task:${payload.action.toLowerCase()}`, broadcastPayload);
}
