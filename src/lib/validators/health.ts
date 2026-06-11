import { z } from "zod";

export const healthStatusSchema = z.enum(["ok", "degraded", "down"]);

export const healthCheckResponseSchema = z.object({
  status: healthStatusSchema,
  checks: z.record(z.string(), healthStatusSchema).optional(),
  timestamp: z.string().datetime(),
  version: z.string().optional(),
  environment: z.string().optional(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;
