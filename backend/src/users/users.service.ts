import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";
import { safeUserSelect } from "../auth/auth.service.js";
import type {
  CreateUserInput,
  UpdateUserInput,
  ResetPasswordInput,
  ListUsersQuery,
} from "./users.schemas.js";
import type { SafeUser } from "../auth/auth.service.js";

const BCRYPT_ROUNDS = 12;

export interface PaginatedUsers {
  users: SafeUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listUsers(query: ListUsersQuery): Promise<PaginatedUsers> {
  const { page, limit, role, isActive, search } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(role !== undefined && { role }),
    ...(isActive !== undefined && { isActive }),
    ...(search !== undefined && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: safeUserSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUserById(id: number): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });
  if (!user) throw AppError.notFound("User");
  return user;
}

export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw AppError.conflict("A user with that email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    },
    select: safeUserSelect,
  });

  return user;
}

export async function updateUser(
  id: number,
  input: UpdateUserInput
): Promise<SafeUser> {
  await getUserById(id);

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    select: safeUserSelect,
  });

  return user;
}

export async function deactivateUser(id: number): Promise<SafeUser> {
  await getUserById(id);
  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: safeUserSelect,
  });
}

export async function deleteUser(id: number): Promise<void> {
  await getUserById(id);
  await prisma.user.delete({ where: { id } });
}

export async function resetPassword(
  id: number,
  input: ResetPasswordInput
): Promise<void> {
  await getUserById(id);
  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
}
