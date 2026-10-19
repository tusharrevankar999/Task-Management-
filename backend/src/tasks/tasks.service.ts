import prisma from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { CreateTaskInput, UpdateTaskInput } from "./tasks.schemas.js";

const assigneeSelect = {
  id: true,
  name: true,
};

const projectSelect = {
  id: true,
  name: true,
};

export async function verifyProjectMembership(userId: number, projectId: number): Promise<boolean> {
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    select: { id: true },
  });

  return !!member;
}

export async function checkProjectAccess(
  user: { id: number; role: string },
  projectId: number
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    throw AppError.notFound("Project not found");
  }

  if (user.role === "ADMIN") {
    return;
  }

  const isMember = await verifyProjectMembership(user.id, projectId);
  if (!isMember) {
    throw AppError.forbidden("You do not have access to this project");
  }
}

export async function listAllTasks(
  user: { id: number; role: string },
  options?: { page?: number; limit?: number; search?: string; status?: string; projectId?: number }
) {
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.max(1, Math.min(100, options?.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (user.role !== "ADMIN") {
    where.project = {
      members: {
        some: {
          userId: user.id,
        },
      },
    };
  }

  if (options?.projectId) {
    where.projectId = options.projectId;
  }

  if (options?.status && ["PENDING", "IN_PROGRESS", "COMPLETED"].includes(options.status)) {
    where.status = options.status;
  }

  if (options?.search) {
    const q = options.search.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { assignedTo: { name: { contains: q, mode: "insensitive" } } },
        { project: { name: { contains: q, mode: "insensitive" } } },
      ];
    }
  }

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        position: true,
        projectId: true,
        project: {
          select: projectSelect,
        },
        assignedTo: {
          select: assigneeSelect,
        },
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    data: tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function listTasksByProjectId(
  user: { id: number; role: string },
  projectId: number
) {
  await checkProjectAccess(user, projectId);

  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: [
      { position: "asc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      position: true,
      projectId: true,
      project: {
        select: projectSelect,
      },
      assignedTo: {
        select: assigneeSelect,
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  return tasks;
}

export async function getTaskById(
  user: { id: number; role: string },
  projectId: number,
  taskId: number
) {
  await checkProjectAccess(user, projectId);

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      projectId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      position: true,
      projectId: true,
      project: {
        select: projectSelect,
      },
      assignedTo: {
        select: assigneeSelect,
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!task) {
    throw AppError.notFound("Task not found");
  }

  return task;
}

export async function createTask(
  user: { id: number; role: string },
  projectId: number,
  input: CreateTaskInput
) {
  await checkProjectAccess(user, projectId);

  if (input.assignedToId !== undefined && input.assignedToId !== null) {
    const assignee = await prisma.user.findUnique({
      where: { id: input.assignedToId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!assignee || !assignee.isActive) {
      throw AppError.badRequest("Assigned user does not exist or is inactive");
    }

    const isMember = await verifyProjectMembership(input.assignedToId, projectId);
    if (!isMember) {
      throw AppError.badRequest("Assigned user must be a member of the project");
    }
  }

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      status: "PENDING",
      position: 0,
      projectId,
      createdById: user.id,
      assignedToId: input.assignedToId ?? null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      position: true,
      projectId: true,
      project: {
        select: projectSelect,
      },
      assignedTo: {
        select: assigneeSelect,
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  return task;
}

export async function updateTask(
  user: { id: number; role: string },
  projectId: number,
  taskId: number,
  input: UpdateTaskInput
) {
  await checkProjectAccess(user, projectId);

  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, projectId },
  });

  if (!existingTask) {
    throw AppError.notFound("Task not found");
  }

  if (input.assignedToId !== undefined && input.assignedToId !== null) {
    const assignee = await prisma.user.findUnique({
      where: { id: input.assignedToId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!assignee || !assignee.isActive) {
      throw AppError.badRequest("Assigned user does not exist or is inactive");
    }

    const isMember = await verifyProjectMembership(input.assignedToId, projectId);
    if (!isMember) {
      throw AppError.badRequest("Assigned user must be a member of the project");
    }
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      position: true,
      projectId: true,
      project: {
        select: projectSelect,
      },
      assignedTo: {
        select: assigneeSelect,
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedTask;
}

export async function deleteTask(
  user: { id: number; role: string },
  projectId: number,
  taskId: number
) {
  await checkProjectAccess(user, projectId);

  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    select: { id: true },
  });

  if (!existingTask) {
    throw AppError.notFound("Task not found");
  }

  await prisma.task.delete({
    where: { id: taskId },
  });
}
