import { z } from "zod";

export const createConversationSchema = z.object({
  agentId: z.string().uuid(),
  channel: z.enum(["sandbox", "whatsapp", "web"]).optional(),
  title: z.string().max(200).optional(),
});

export const updateConversationSchema = z.object({
  status: z.enum(["open", "closed", "handoff_required", "archived"]).optional(),
  title: z.string().max(200).optional(),
});

export type CreateConversation = z.infer<typeof createConversationSchema>;
export type UpdateConversation = z.infer<typeof updateConversationSchema>;
