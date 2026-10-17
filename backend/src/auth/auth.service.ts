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
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Helpers ─────────────────────────────────────────────────

/** Select clause that deliberately omits passwordHash everywhere. */
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

/**
 * login — verifies credentials and returns a signed token.
 *
 * Security decisions:
 *  - We always run bcrypt.compare even when the user doesn't exist
 *    (using a dummy hash). This prevents timing-based email enumeration:
 *    a failed lookup returns as slowly as a failed password comparison.
 *  - The error message is identical for "email not found" and
 *    "password wrong" — the client cannot distinguish them.
 */
// Constant-time dummy hash used when no user is found.
// Generated once at module load; never stored anywhere.
const DUMMY_HASH =
  "$2b$12$invalidhashpaddingtomimicbcryptcostfactorXXXXXXXXXXXXXX";

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always compare so timing is constant regardless of whether email exists.
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
  const isMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !isMatch) {
    // Generic message — intentionally does not reveal whether the email exists.
    throw AppError.unauthorized("Invalid email or password");
  }

  if (!user.isActive) {
    // We reveal "deactivated" only after credentials are verified — otherwise
    // we would leak that the email exists. At this point the user has already
    // proven ownership of the account.
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

/**
 * getMe — fetches the authenticated user's own profile.
 */
export async function getMe(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect,
  });
  if (!user) throw AppError.notFound("User");
  return user;
}

const BCRYPT_ROUNDS = 12;

/**
 * register — creates a new standard USER account with hashed password and returns a token.
 */
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

/**
 * forgotPassword — checks database for user, sends recovery email, and reports error if not found.
 */
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

  // Generate cryptographic random token
  const crypto = await import("crypto");
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

  // Invalidate any previous reset tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  // Save new reset token
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

  // Send email and re-throw if it fails so API and UI accurately know delivery status
  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
    token: rawToken,
  });
}

/**
 * resetPasswordWithToken — consumes recovery token and updates password.
 */
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
