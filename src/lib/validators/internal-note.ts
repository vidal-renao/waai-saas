import { z } from "zod";

export const createNoteSchema = z.object({
  note: z
    .string()
    .min(1, "Note cannot be empty")
    .max(2000, "Note exceeds 2000 characters")
    .transform((v) => v.trim()),
  visibility: z.enum(["internal", "owner_admin"]).optional().default("internal"),
});
