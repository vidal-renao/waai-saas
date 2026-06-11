import { z } from "zod";

export const startSandboxSchema = z.object({
  title: z.string().max(200).optional(),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10_000),
});

export type StartSandbox = z.infer<typeof startSandboxSchema>;
export type SendMessage = z.infer<typeof sendMessageSchema>;
