import prisma from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { CreateProjectInput, UpdateProjectInput } from "./projects.schemas.js";
import { emitTaskNotification } from "../socket.js";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
};

const projectInclude = {
  assignedTo: { select: userSelect },
  createdBy: { select: userSelect },
  members: {
    include: {
      user: { select: userSelect },
    },
  },
};

export async function listProjects(params?: { search?: string; status?: string }) {
  const where: any = {};

  if (params?.status === "active") {
    where.isActive = true;
  } else if (params?.status === "archived") {
    where.isActive = false;
  }

  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
      { assignedTo: { name: { contains: params.search, mode: "insensitive" } } },
      { members: { some: { user: { name: { contains: params.search, mode: "insensitive" } } } } },
    ];
  }

  return prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: projectInclude,
  });
}

export async function getProjectById(id: number) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: projectInclude,
  });

  if (!project) {
    throw AppError.notFound("Project not found");
  }

  return project;
}

export async function createProject(
  input: CreateProjectInput,
  user: { id: number; role?: string; name?: string }
) {
  const memberUserIds = Array.from(
    new Set([
      ...(input.assignedUserIds ?? []),
      ...(input.assignedToId ? [input.assignedToId] : []),
    ])
  );

  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      isActive: input.isActive ?? true,
      startDate: input.startDate,
      endDate: input.endDate,
      assignedToId: memberUserIds[0] || null,
      createdById: user.id,
      members: {
        create: memberUserIds.map((userId) => ({ userId })),
      },
    },
    include: projectInclude,
  });

  // Emit real-time notification to assigned users and members
  const recipientUserIds = memberUserIds.filter((uid) => uid !== user.id);

  emitTaskNotification({
    action: "PROJECT_ASSIGNED",
    projectId: project.id,
    projectName: project.name,
    message: `You were assigned to project "${project.name}"`,
    updatedBy: {
      id: user.id,
      name: user.name || "Admin",
    },
    project,
    recipientUserIds,
  }).catch((err) => console.error("Failed to emit project notification:", err));

  return project;
}

export async function updateProject(
  id: number,
  input: UpdateProjectInput,
  user?: { id: number; role?: string; name?: string }
) {
  const existingProject = await getProjectById(id);

  let memberUserIds: number[] | undefined = undefined;
  if (input.assignedUserIds !== undefined || input.assignedToId !== undefined) {
    memberUserIds = Array.from(
      new Set([
        ...(input.assignedUserIds ?? []),
        ...(input.assignedToId ? [input.assignedToId] : []),
      ])
    );
  }

  const updatedProject = await prisma.$transaction(async (tx) => {
    if (memberUserIds !== undefined) {
      await tx.projectMember.deleteMany({ where: { projectId: id } });
      await tx.projectMember.createMany({
        data: memberUserIds.map((userId) => ({ projectId: id, userId })),
      });
    }

    return tx.project.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
        ...(memberUserIds !== undefined
          ? { assignedToId: memberUserIds[0] || null }
          : input.assignedToId !== undefined
          ? { assignedToId: input.assignedToId || null }
          : {}),
      },
      include: projectInclude,
    });
  });

  if (user) {
    const existingMemberIds = existingProject.members.map((m) => m.userId);
    const newMemberIds = updatedProject.members.map((m) => m.userId);
    const newlyAddedIds = newMemberIds.filter((uid) => !existingMemberIds.includes(uid));

    const recipientUserIds = (newlyAddedIds.length > 0 ? newlyAddedIds : newMemberIds).filter(
      (uid) => uid !== user.id
    );

    emitTaskNotification({
      action: newlyAddedIds.length > 0 ? "PROJECT_ASSIGNED" : "UPDATED",
      projectId: updatedProject.id,
      projectName: updatedProject.name,
      message: newlyAddedIds.length > 0
        ? `You were assigned to project "${updatedProject.name}"`
        : `Project "${updatedProject.name}" was updated`,
      updatedBy: {
        id: user.id,
        name: user.name || "Admin",
      },
      project: updatedProject,
      recipientUserIds,
    }).catch((err) => console.error("Failed to emit project update notification:", err));
  }

  return updatedProject;
}

export async function deleteProject(id: number) {
  await getProjectById(id);
  return prisma.project.delete({
    where: { id },
  });
}
