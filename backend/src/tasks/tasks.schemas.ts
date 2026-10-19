import { z } from "zod";

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required and cannot be empty")
    .max(255, "Task title must not exceed 255 characters"),
  description: z
    .string()
    .max(2000, "Task description must not exceed 2000 characters")
    .optional()
    .nullable()
    .transform((val) => {
      if (val === undefined || val === null) return null;
      const trimmed = val.trim();
      return trimmed.length === 0 ? null : trimmed;
    }),
  assignedToId: z.coerce
    .number()
    .int("assignedToId must be an integer")
    .positive("assignedToId must be a positive integer")
    .optional()
    .nullable(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
