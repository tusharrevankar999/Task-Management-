import { z } from "zod";

// ─── Strong password rule ────────────────────────────────────
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one digit")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );

// ─── Create user ─────────────────────────────────────────────
export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.email("Invalid email address"),
  password: passwordSchema,
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// ─── Update user ─────────────────────────────────────────────
export const updateUserSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    role: z.enum(["ADMIN", "USER"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ─── Reset password ──────────────────────────────────────────
export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ─── List users query ────────────────────────────────────────
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(["ADMIN", "USER"]).optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  search: z.string().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
