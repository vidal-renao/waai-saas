import { z } from "zod";

export const WHATSAPP_PROVIDERS = ["mock", "whapi", "meta"] as const;

export const createConnectionSchema = z.object({
  provider: z.enum(WHATSAPP_PROVIDERS).default("meta"),
  displayName: z.string().min(1, "El nombre es obligatorio").max(100),
  phoneNumber: z.string().max(20).optional(),
  phoneNumberId: z.string().max(200).optional(),
  wabaId: z.string().max(200).optional(),
  accessToken: z.string().max(2000).optional(),
  externalInstanceId: z.string().max(200).optional(),
  agentId: z.string().uuid().nullable().optional(),
});

export const updateConnectionSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().max(20).optional().nullable(),
  phoneNumberId: z.string().max(200).optional().nullable(),
  externalInstanceId: z.string().max(200).optional().nullable(),
  status: z
    .enum([
      "draft",
      "pending_verification",
      "active",
      "failed",
      "suspended",
      "disconnected",
      "archived",
    ])
    .optional(),
  agentId: z.string().uuid().nullable().optional(),
  webhookSecretHash: z.string().max(500).optional().nullable(),
});

export const simulateMessageSchema = z.object({
  connectionId: z.string().uuid(),
  fromNumber: z.string().min(7).max(20),
  text: z.string().min(1, "El mensaje no puede estar vacío").max(4096),
});

export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>;
export type SimulateMessageInput = z.infer<typeof simulateMessageSchema>;
