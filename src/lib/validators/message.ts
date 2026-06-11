import { z } from "zod";

export const createMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10_000),
});

export type CreateMessage = z.infer<typeof createMessageSchema>;
