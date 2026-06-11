import { z } from "zod";

export const datePresetSchema = z.enum(["today", "7d", "30d", "month", "custom"]);

export const analyticsQuerySchema = z.object({
  preset: datePresetSchema.optional().default("30d"),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  agentId: z.string().uuid().optional(),
  channel: z.enum(["whatsapp", "sandbox", "web"]).optional(),
}).refine(
  (data) => {
    if (data.preset !== "custom") return true;
    if (!data.from || !data.to) return false;
    const fromDate = new Date(data.from);
    const toDate = new Date(data.to);
    if (fromDate >= toDate) return false;
    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 366;
  },
  {
    message: "Custom range requires valid from/to dates, from < to, and max 366 days",
  }
);

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
