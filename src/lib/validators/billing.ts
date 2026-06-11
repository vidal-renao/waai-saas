import { z } from "zod";
import { datePresetSchema } from "@/lib/validators/analytics";

export const billingUsageQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
});

export const billingCostsQuerySchema = z.object({
  preset: datePresetSchema.optional().default("30d"),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export type BillingUsageQuery = z.infer<typeof billingUsageQuerySchema>;
export type BillingCostsQuery = z.infer<typeof billingCostsQuerySchema>;
