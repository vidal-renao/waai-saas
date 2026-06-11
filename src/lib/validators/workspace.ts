import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre no puede superar 80 caracteres"),
  businessType: z
    .string()
    .max(60, "El tipo de negocio no puede superar 60 caracteres")
    .optional(),
  country: z
    .string()
    .length(2, "El código de país debe tener 2 caracteres (ej. ES, CH)")
    .optional(),
});

export type CreateWorkspaceSchema = z.infer<typeof createWorkspaceSchema>;
