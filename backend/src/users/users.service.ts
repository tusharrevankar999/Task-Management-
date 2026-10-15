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

// ─── Security constant ───────────────────────────────────────

/**
 * bcrypt cost factor.
 *
 * 12 rounds ≈ 300 ms on a modern CPU — slow enough to make brute-force
 * impractical, fast enough not to hurt UX during login/signup.
 * Increase to 13–14 for high-value accounts; never go below 10.
 */
const BCRYPT_ROUNDS = 12;

// ─── Types ───────────────────────────────────────────────────

export interface PaginatedUsers {
  users: SafeUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Service functions ───────────────────────────────────────

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

export async function getUserById(id: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });
  if (!user) throw AppError.notFound("User");
  return user;
}

export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  // Check for duplicate email before hashing (cheap check first)
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
  id: string,
  input: UpdateUserInput
): Promise<SafeUser> {
  // Ensure the user exists first
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

/**
 * deactivateUser — soft-delete by setting isActive = false.
 *
 * We prefer soft-delete over hard-delete because the userId may be
 * referenced by tasks and audit logs you'll add later.
 */
export async function deactivateUser(id: string): Promise<SafeUser> {
  await getUserById(id);
  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: safeUserSelect,
  });
}

/**
 * deleteUser — permanent removal.
 *
 * Use with caution. Exposed as a separate endpoint so the caller
 * must opt in explicitly rather than using the same route as deactivate.
 */
export async function deleteUser(id: string): Promise<void> {
  await getUserById(id);
  await prisma.user.delete({ where: { id } });
}

/**
 * resetPassword — ADMIN-initiated password reset.
 *
 * Hashes the new password with the same cost factor as creation.
 */
export async function resetPassword(
  id: string,
  input: ResetPasswordInput
): Promise<void> {
  await getUserById(id);
  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
}
