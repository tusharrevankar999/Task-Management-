import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().default(true),
  startDate: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
  endDate: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
  assignedToId: z.coerce.number().int().positive().optional().nullable(),
  assignedUserIds: z.array(z.coerce.number().int().positive()).optional().default([]),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
  startDate: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
  endDate: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
  assignedToId: z.coerce.number().int().positive().optional().nullable(),
  assignedUserIds: z.array(z.coerce.number().int().positive()).optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
