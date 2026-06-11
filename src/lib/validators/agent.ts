import { z } from "zod";

// ── Step schemas (used for per-step validation in the wizard) ─────────────────

export const agentStep1Schema = z.object({
  name: z
    .string()
    .min(2, "El nombre del agente debe tener al menos 2 caracteres")
    .max(80, "El nombre del agente no puede superar 80 caracteres"),
  business_name: z
    .string()
    .min(2, "El nombre del negocio es obligatorio")
    .max(100, "El nombre del negocio no puede superar 100 caracteres"),
  industry: z.string().min(1, "El sector es obligatorio"),
  business_description: z.string().max(500).optional(),
  country: z.string().length(2, "Código de país de 2 letras (ej. ES)").optional(),
  city: z.string().max(100).optional(),
});

export const agentStep2Schema = z.object({
  primary_language: z.string().min(2, "El idioma es obligatorio"),
  tone: z.string().min(1, "El tono es obligatorio"),
  target_audience: z.string().max(300).optional(),
  opening_message: z.string().max(500).optional(),
});

export const agentStep3Schema = z.object({
  services_raw: z
    .string()
    .min(1, "Añade al menos un servicio (uno por línea)"),
  service_areas_raw: z.string().optional(),
  working_hours_raw: z.string().optional(),
});

export const agentStep4Schema = z.object({
  primary_goal: z.string().min(1, "El objetivo principal es obligatorio"),
  lead_capture_fields_raw: z.string().optional(),
  handoff_rules_raw: z.string().optional(),
  human_handoff_message: z.string().max(300).optional(),
});

export const agentStep5Schema = z.object({
  faqs_raw: z.string().optional(),
  fallback_message: z
    .string()
    .min(5, "El mensaje de respaldo es obligatorio")
    .max(500),
  restrictions_raw: z.string().optional(),
});

// ── Combined wizard schema (used for API validation) ─────────────────────────

export const createAgentWizardSchema = agentStep1Schema
  .merge(agentStep2Schema)
  .merge(agentStep3Schema)
  .merge(agentStep4Schema)
  .merge(agentStep5Schema);

// ── Update agent name/status schema ──────────────────────────────────────────

export const updateAgentSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(300).optional(),
  status: z.enum(["draft", "active", "paused"]).optional(),
  primary_language: z.string().min(2).optional(),
});

// ── Update agent config schema (edit page) ────────────────────────────────────

export const updateAgentConfigSchema = z.object({
  business_name: z.string().min(2).max(100),
  industry: z.string().min(1),
  business_description: z.string().max(500).optional(),
  country: z.string().length(2).optional(),
  city: z.string().max(100).optional(),
  timezone: z.string().optional(),
  tone: z.string().min(1),
  primary_goal: z.string().min(1),
  target_audience: z.string().max(300).optional(),
  opening_message: z.string().max(500).optional(),
  fallback_message: z.string().max(500).optional(),
  human_handoff_message: z.string().max(300).optional(),
  services_raw: z.string().optional(),
  service_areas_raw: z.string().optional(),
  working_hours_raw: z.string().optional(),
  faqs_raw: z.string().optional(),
  lead_capture_fields_raw: z.string().optional(),
  handoff_rules_raw: z.string().optional(),
  restrictions_raw: z.string().optional(),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type AgentStep1 = z.infer<typeof agentStep1Schema>;
export type AgentStep2 = z.infer<typeof agentStep2Schema>;
export type AgentStep3 = z.infer<typeof agentStep3Schema>;
export type AgentStep4 = z.infer<typeof agentStep4Schema>;
export type AgentStep5 = z.infer<typeof agentStep5Schema>;
export type CreateAgentWizard = z.infer<typeof createAgentWizardSchema>;
export type UpdateAgent = z.infer<typeof updateAgentSchema>;
export type UpdateAgentConfig = z.infer<typeof updateAgentConfigSchema>;
