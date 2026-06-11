import { z } from "zod";

export const requestHandoffSchema = z.object({
  reason: z.string().max(500).nullable().optional(),
  triggerType: z
    .enum([
      "customer_request",
      "low_confidence",
      "angry_customer",
      "urgent_request",
      "sensitive_topic",
      "manual",
      "system_rule",
    ])
    .optional()
    .default("manual"),
});

export const resolveHandoffSchema = z.object({
  handoffId: z.string().uuid(),
});

export const assignConversationSchema = z.object({
  assignedTo: z.string().uuid(),
  reason: z.string().max(300).nullable().optional(),
});
