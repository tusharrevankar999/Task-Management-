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

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Task title cannot be empty")
      .max(255, "Task title must not exceed 255 characters")
      .optional(),
    description: z
      .string()
      .max(2000, "Task description must not exceed 2000 characters")
      .optional()
      .nullable()
      .transform((val) => {
        if (val === undefined) return undefined;
        if (val === null) return null;
        const trimmed = val.trim();
        return trimmed.length === 0 ? null : trimmed;
      }),
    status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
    assignedToId: z.coerce
      .number()
      .int("assignedToId must be an integer")
      .positive("assignedToId must be a positive integer")
      .optional()
      .nullable(),
    position: z.coerce
      .number()
      .int("position must be an integer")
      .min(0, "position must be non-negative")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
