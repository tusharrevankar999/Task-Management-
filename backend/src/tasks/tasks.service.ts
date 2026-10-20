import prisma from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { CreateTaskInput, UpdateTaskInput, ReorderTasksInput } from "./tasks.schemas.js";
import { emitTaskNotification } from "../socket.js";

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
      orderBy: [
        { position: "asc" },
        { createdAt: "desc" },
        { id: "desc" },
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
  user: { id: number; role: string; name?: string },
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

  // Find current highest position in project to append task at end
  const highestTask = await prisma.task.findFirst({
    where: { projectId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const nextPosition = highestTask ? highestTask.position + 1 : 0;

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      status: "PENDING",
      position: nextPosition,
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

  const recipientUserIds: number[] = [];
  if (task.assignedTo?.id) {
    recipientUserIds.push(task.assignedTo.id);
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId: task.projectId },
    select: { userId: true },
  });
  members.forEach((m) => {
    if (!recipientUserIds.includes(m.userId)) {
      recipientUserIds.push(m.userId);
    }
  });

  emitTaskNotification({
    action: task.assignedTo?.id ? "ASSIGNED" : "CREATED",
    taskId: task.id,
    taskTitle: task.title,
    projectId: task.projectId,
    projectName: task.project.name,
    message: task.assignedTo?.id
      ? `Task "${task.title}" was assigned to ${task.assignedTo.name || "you"}`
      : `New task "${task.title}" was created in project "${task.project.name}"`,
    updatedBy: {
      id: user.id,
      name: user.name || "Admin",
    },
    task,
    recipientUserIds,
  }).catch((err) => console.error("Failed to emit task notification:", err));

  return task;
}

export async function updateTask(
  user: { id: number; role: string; name?: string },
  projectId: number,
  taskId: number,
  input: UpdateTaskInput
) {
  await checkProjectAccess(user, projectId);

  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    include: {
      assignedTo: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
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

  // Determine notification type
  const isNewlyAssigned =
    input.assignedToId !== undefined &&
    input.assignedToId !== null &&
    input.assignedToId !== existingTask.assignedToId;

  const isCompleted =
    input.status !== undefined &&
    input.status === "COMPLETED" &&
    existingTask.status !== "COMPLETED";

  let action: "ASSIGNED" | "COMPLETED" | "UPDATED" = "UPDATED";
  let message = `Task "${updatedTask.title}" was updated`;

  if (isCompleted) {
    action = "COMPLETED";
    message = `Task "${updatedTask.title}" was marked as completed!`;
  } else if (isNewlyAssigned) {
    action = "ASSIGNED";
    message = `Task "${updatedTask.title}" was assigned to ${updatedTask.assignedTo?.name || "you"}`;
  } else if (input.status && input.status !== existingTask.status) {
    const formatStatus = (s: string) =>
      s === "IN_PROGRESS" ? "In Progress" : s === "COMPLETED" ? "Completed" : "Pending";
    message = `Task "${updatedTask.title}" status changed to ${formatStatus(input.status)}`;
  }

  const recipientUserIds: number[] = [];
  if (updatedTask.assignedTo?.id) {
    recipientUserIds.push(updatedTask.assignedTo.id);
  }
  if (existingTask.assignedToId && !recipientUserIds.includes(existingTask.assignedToId)) {
    recipientUserIds.push(existingTask.assignedToId);
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId: updatedTask.projectId },
    select: { userId: true },
  });
  members.forEach((m) => {
    if (!recipientUserIds.includes(m.userId)) {
      recipientUserIds.push(m.userId);
    }
  });

  emitTaskNotification({
    action,
    taskId: updatedTask.id,
    taskTitle: updatedTask.title,
    projectId: updatedTask.projectId,
    projectName: updatedTask.project.name,
    message,
    updatedBy: {
      id: user.id,
      name: user.name || "Admin",
    },
    task: updatedTask,
    recipientUserIds,
  }).catch((err) => console.error("Failed to emit task notification:", err));

  return updatedTask;
}

export async function reorderTasks(
  user: { id: number; role: string; name?: string },
  projectId: number | undefined,
  input: ReorderTasksInput
) {
  if (projectId) {
    await checkProjectAccess(user, projectId);
  }

  // Fetch the tasks to know their titles, assignees, and projects
  const tasksToReorder = await prisma.task.findMany({
    where: { id: { in: input.taskIds } },
    select: {
      id: true,
      title: true,
      assignedToId: true,
      assignedTo: { select: { id: true, name: true } },
      projectId: true,
      project: { select: { id: true, name: true } },
    },
  });

  // Update positions in a transaction
  const updated = await prisma.$transaction(async (tx) => {
    const updates = input.taskIds.map((taskId, index) =>
      tx.task.update({
        where: { id: taskId },
        data: { position: index },
        select: {
          id: true,
          position: true,
          projectId: true,
        },
      })
    );

    return Promise.all(updates);
  });

  const recipientUserIds: number[] = [];
  const projectIds = new Set<number>();
  const assignedNames: string[] = [];

  tasksToReorder.forEach((t) => {
    if (t.assignedToId && !recipientUserIds.includes(t.assignedToId)) {
      recipientUserIds.push(t.assignedToId);
      if (t.assignedTo?.name) {
        assignedNames.push(t.assignedTo.name);
      }
    }
    if (t.projectId) {
      projectIds.add(t.projectId);
    }
  });

  if (projectIds.size > 0) {
    const members = await prisma.projectMember.findMany({
      where: { projectId: { in: Array.from(projectIds) } },
      select: { userId: true },
    });
    members.forEach((m) => {
      if (!recipientUserIds.includes(m.userId)) {
        recipientUserIds.push(m.userId);
      }
    });
  }

  const firstTask = tasksToReorder[0];
  const projectName = firstTask?.project?.name;

  let message = `Task order was changed`;
  if (projectName) {
    message = `Task order was changed in project "${projectName}"`;
  }

  // Emit reorder notification
  emitTaskNotification({
    action: "REORDERED",
    projectId: projectId || firstTask?.projectId,
    projectName,
    message,
    updatedBy: {
      id: user.id,
      name: user.name || "Admin",
    },
    reorderedTaskIds: input.taskIds,
    recipientUserIds,
  }).catch((err) => console.error("Failed to emit task notification:", err));

  return updated;
}

export async function deleteTask(
  user: { id: number; role: string; name?: string },
  projectId: number,
  taskId: number
) {
  await checkProjectAccess(user, projectId);

  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    select: { id: true, title: true, assignedToId: true, project: { select: { name: true } } },
  });

  if (!existingTask) {
    throw AppError.notFound("Task not found");
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  const recipientUserIds: number[] = [];
  if (existingTask.assignedToId) {
    recipientUserIds.push(existingTask.assignedToId);
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });
  members.forEach((m) => {
    if (!recipientUserIds.includes(m.userId)) {
      recipientUserIds.push(m.userId);
    }
  });

  emitTaskNotification({
    action: "DELETED",
    taskId,
    taskTitle: existingTask.title,
    projectId,
    projectName: existingTask.project?.name,
    message: `Task "${existingTask.title}" was deleted`,
    updatedBy: {
      id: user.id,
      name: user.name || "Admin",
    },
    recipientUserIds,
  }).catch((err) => console.error("Failed to emit task notification:", err));
}
