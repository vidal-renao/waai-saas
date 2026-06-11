import { z } from "zod";

export const leadStatusSchema = z.enum([
  "new",
  "qualified",
  "contacted",
  "won",
  "lost",
  "archived",
]);

export const leadPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const updateLeadStatusSchema = z.object({
  status: leadStatusSchema,
});

export const assignLeadSchema = z.object({
  assignedTo: z.string().uuid().nullable(),
});

export const updateLeadSchema = z.object({
  priority: leadPrioritySchema.optional(),
  customerName: z.string().max(200).nullable().optional(),
  customerPhone: z.string().max(30).nullable().optional(),
  customerEmail: z.string().email().nullable().optional(),
  companyName: z.string().max(200).nullable().optional(),
  requestedService: z.string().max(200).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  desiredDate: z.string().max(100).nullable().optional(),
  budget: z.string().max(100).nullable().optional(),
  urgency: z.string().max(100).nullable().optional(),
  summary: z.string().max(500).nullable().optional(),
});

export const createLeadFromConversationSchema = z.object({
  conversationId: z.string().uuid(),
});
