import prisma from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { CreateTaskInput } from "./tasks.schemas.js";

const assigneeSelect = {
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
      assignedTo: {
        select: assigneeSelect,
      },
      createdAt: true,
    },
  });

  return tasks;
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
      assignedTo: {
        select: assigneeSelect,
      },
      createdAt: true,
    },
  });

  return task;
}
