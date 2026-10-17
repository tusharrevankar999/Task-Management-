import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import { signToken } from "../utils/jwt.js";
import { AppError } from "../errors/AppError.js";
import type { Role } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────

export interface LoginResult {
  token: string;
  user: SafeUser;
}

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Helpers ─────────────────────────────────────────────────

export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─── Service ─────────────────────────────────────────────────

const DUMMY_HASH =
  "$2b$12$invalidhashpaddingtomimicbcryptcostfactorXXXXXXXXXXXXXX";

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
  const isMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !isMatch) {
    throw AppError.unauthorized("Invalid email or password");
  }

  if (!user.isActive) {
    throw AppError.forbidden("Account is deactivated");
  }

  const token = signToken(user.id, user.role);

  const safeUser: SafeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return { token, user: safeUser };
}

export async function getMe(userId: number | string): Promise<SafeUser> {
  const id = Number(userId);
  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });
  if (!user) throw AppError.notFound("User");
  return user;
}

const BCRYPT_ROUNDS = 12;

export async function register(
  name: string,
  email: string,
  password: string
): Promise<LoginResult> {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    throw AppError.conflict("A user with that email already exists");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "USER",
      isActive: true,
    },
    select: safeUserSelect,
  });

  const token = signToken(user.id, user.role);

  return { token, user };
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, isActive: true },
  });

  if (!user) {
    throw AppError.notFound("Account does not exist with this email");
  }

  if (!user.isActive) {
    throw AppError.forbidden("This account is currently deactivated. Please contact support.");
  }

  const crypto = await import("crypto");
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  await prisma.passwordResetToken.create({
    data: {
      token: rawToken,
      userId: user.id,
      expiresAt,
    },
  });

  const { env } = await import("../config/env.js");
  const { sendPasswordResetEmail } = await import("../lib/mailer.js");

  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
    token: rawToken,
  });
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    throw AppError.badRequest("Invalid or expired password reset token");
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId },
    }),
  ]);
}
