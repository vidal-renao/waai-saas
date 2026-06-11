"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  updateAgentConfigSchema,
  type UpdateAgentConfig,
} from "@/lib/validators/agent";
import type { WaaiAgentConfig } from "@/types/database";
import { Button } from "@/components/ui/button";

const TONES = [
  { value: "professional", label: "Profesional" },
  { value: "friendly", label: "Amigable" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "empathetic", label: "Empático" },
];

const GOALS = [
  { value: "Capturar leads", label: "Capturar leads" },
  { value: "Responder preguntas frecuentes", label: "Responder FAQs" },
  { value: "Agendar citas", label: "Agendar citas" },
  { value: "Derivar al equipo humano", label: "Derivar al equipo humano" },
  { value: "Proporcionar información", label: "Proporcionar información" },
  { value: "Tomar pedidos", label: "Tomar pedidos" },
];

interface AgentConfigFormProps {
  agentId: string;
  config: WaaiAgentConfig;
}

function listToRaw(arr: unknown[]): string {
  return (arr as string[]).filter(Boolean).join("\n");
}

function workingHoursToRaw(obj: Record<string, unknown>): string {
  return (obj?.raw as string) ?? "";
}

export function AgentConfigForm({ agentId, config }: AgentConfigFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateAgentConfig>({
    resolver: zodResolver(updateAgentConfigSchema),
    defaultValues: {
      business_name: config.business_name,
      industry: config.industry,
      country: config.country ?? undefined,
      city: config.city ?? undefined,
      timezone: config.timezone ?? undefined,
      tone: config.tone,
      primary_goal: config.primary_goal,
      target_audience: config.target_audience ?? undefined,
      business_description: config.business_description ?? undefined,
      opening_message: config.opening_message ?? undefined,
      fallback_message: config.fallback_message ?? undefined,
      human_handoff_message: config.human_handoff_message ?? undefined,
      working_hours_raw: workingHoursToRaw(
        config.working_hours as Record<string, unknown>
      ),
      services_raw: listToRaw(config.services as unknown[]),
      service_areas_raw: listToRaw(config.service_areas as unknown[]),
      faqs_raw: listToRaw(config.faqs as unknown[]),
      lead_capture_fields_raw: listToRaw(config.lead_capture_fields as unknown[]),
      handoff_rules_raw: listToRaw(config.handoff_rules as unknown[]),
      restrictions_raw: listToRaw(config.restrictions as unknown[]),
    },
  });

  async function onSubmit(values: UpdateAgentConfig) {
    setServerError(null);
    const res = await fetch(`/api/agents/${agentId}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setServerError(json.error ?? "Error al guardar la configuración");
      return;
    }

    router.push(`/dashboard/agents/${agentId}`);
    router.refresh();
  }

  const field = (
    name: keyof UpdateAgentConfig,
    label: string,
    opts?: { required?: boolean; placeholder?: string }
  ) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-zinc-300">
        {label} {opts?.required && <span className="text-red-400">*</span>}
      </label>
      <input
        type="text"
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
        placeholder={opts?.placeholder}
        {...register(name)}
      />
      {errors[name] && (
        <p className="text-xs text-red-400">{errors[name]?.message as string}</p>
      )}
    </div>
  );

  const textarea = (
    name: keyof UpdateAgentConfig,
    label: string,
    opts?: { required?: boolean; placeholder?: string; rows?: number }
  ) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-zinc-300">
        {label} {opts?.required && <span className="text-red-400">*</span>}
      </label>
      <textarea
        rows={opts?.rows ?? 3}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none resize-none"
        placeholder={opts?.placeholder}
        {...register(name)}
      />
      {errors[name] && (
        <p className="text-xs text-red-400">{errors[name]?.message as string}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Identidad del negocio
        </h2>
        {field("business_name", "Nombre del negocio", { required: true })}
        {field("industry", "Sector", { required: true })}
        {textarea("business_description", "Descripción del negocio", {
          placeholder: "Describe brevemente qué hace tu empresa...",
        })}
        {field("country", "País (código ISO)", { placeholder: "ES" })}
        {field("city", "Ciudad principal")}
        {field("timezone", "Zona horaria", { placeholder: "Europe/Madrid" })}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Comunicación
        </h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-300">
            Tono <span className="text-red-400">*</span>
          </label>
          <select
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
            {...register("tone")}
          >
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {errors.tone && (
            <p className="text-xs text-red-400">{errors.tone.message}</p>
          )}
        </div>
        {textarea("target_audience", "Público objetivo", {
          placeholder: "Ej: Propietarios de viviendas y oficinas en Madrid",
        })}
        {textarea("opening_message", "Mensaje de bienvenida", {
          placeholder: "¡Hola! Soy el asistente de...",
        })}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Servicios
        </h2>
        {textarea("services_raw", "Servicios (uno por línea)", {
          placeholder: "Limpieza de hogar\nLimpieza de oficinas\n...",
          rows: 4,
        })}
        {textarea("service_areas_raw", "Zonas de servicio (una por línea)", {
          placeholder: "Madrid\nPozuelo\n...",
        })}
        {field("working_hours_raw", "Horario de atención", {
          placeholder: "Lunes a Viernes 9:00-18:00",
        })}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Objetivo y leads
        </h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-300">
            Objetivo principal <span className="text-red-400">*</span>
          </label>
          <select
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
            {...register("primary_goal")}
          >
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          {errors.primary_goal && (
            <p className="text-xs text-red-400">{errors.primary_goal.message}</p>
          )}
        </div>
        {textarea("lead_capture_fields_raw", "Datos a recopilar (uno por línea)", {
          placeholder: "nombre\nteléfono\nemail",
        })}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Escalado humano
        </h2>
        {textarea("handoff_rules_raw", "Reglas de escalado (una por línea)", {
          placeholder: "Si el cliente está enfadado\nSi pide hablar con una persona",
        })}
        {textarea("human_handoff_message", "Mensaje antes de escalar", {
          placeholder: "Te conecto con nuestro equipo ahora mismo...",
        })}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Conocimiento y restricciones
        </h2>
        {textarea("faqs_raw", "Preguntas frecuentes (una por línea)", {
          placeholder: "¿Cuánto cuesta una limpieza? / Depende del tamaño",
          rows: 4,
        })}
        {textarea("fallback_message", "Mensaje cuando no sepa responder", {
          placeholder: "Lo siento, no tengo esa información...",
        })}
        {textarea("restrictions_raw", "Restricciones (una por línea)", {
          placeholder: "No prometer descuentos\nNo confirmar citas sin verificar disponibilidad",
        })}
      </section>

      {serverError && (
        <p className="rounded-lg bg-red-900/20 px-3 py-2 text-sm text-red-400">
          {serverError}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>
    </form>
  );
}
