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
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "empathetic", label: "Empathetic" },
];

const GOALS = [
  { value: "Capture Leads", label: "Capture Leads" },
  { value: "Answer FAQs", label: "Answer FAQs" },
  { value: "Book Appointments", label: "Book Appointments" },
  { value: "Transfer to Human Agent", label: "Transfer to Human Agent" },
  { value: "Provide Information", label: "Provide Information" },
  { value: "Take Orders", label: "Take Orders" },
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
      setServerError(json.error ?? "Failed to save configuration. Please try again.");
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
          Business Identity
        </h2>
        {field("business_name", "Business name", { required: true })}
        {field("industry", "Industry", { required: true })}
        {textarea("business_description", "Business description", {
          placeholder: "Briefly describe what your business does and who your customers are...",
        })}
        {field("country", "Country (ISO code)", { placeholder: "CH" })}
        {field("city", "City")}
        {field("timezone", "Timezone", { placeholder: "Europe/Zurich" })}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Communication
        </h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-300">
            Tone <span className="text-red-400">*</span>
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
        {textarea("target_audience", "Target audience", {
          placeholder: "e.g. Homeowners and office managers in the Zürich area",
        })}
        {textarea("opening_message", "Welcome message", {
          placeholder: "e.g. Hello! I'm your assistant at...",
        })}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Services
        </h2>
        {textarea("services_raw", "Services offered (one per line)", {
          placeholder: "Home cleaning\nOffice cleaning\n...",
          rows: 4,
        })}
        {textarea("service_areas_raw", "Service areas (one per line)", {
          placeholder: "Zürich\nWinterthur\n...",
        })}
        {field("working_hours_raw", "Business hours", {
          placeholder: "Monday–Friday 08:00–18:00",
        })}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Goal & Lead Capture
        </h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-300">
            Primary goal <span className="text-red-400">*</span>
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
        {textarea("lead_capture_fields_raw", "Customer data to collect (one per line)", {
          placeholder: "Name\nPhone number\nEmail address",
        })}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Human Escalation
        </h2>
        {textarea("handoff_rules_raw", "Escalate to human when (one rule per line)", {
          placeholder: "Customer is upset or angry\nCustomer asks to speak with a person",
        })}
        {textarea("human_handoff_message", "Message before escalating", {
          placeholder: "I'm connecting you with one of our team members right now...",
        })}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Knowledge & Restrictions
        </h2>
        {textarea("faqs_raw", "Frequently asked questions (one per line)", {
          placeholder: "What does a cleaning cost? / Prices vary by service size.",
          rows: 4,
        })}
        {textarea("fallback_message", "Fallback message (when AI doesn't know the answer)", {
          placeholder: "I'm sorry, I don't have that information. Let me connect you with a team member.",
        })}
        {textarea("restrictions_raw", "Restrictions (one per line)", {
          placeholder: "Do not promise discounts without manager approval\nDo not confirm appointments without checking availability",
        })}
      </section>

      {serverError && (
        <p className="rounded-lg bg-red-900/20 px-3 py-2 text-sm text-red-400">
          {serverError}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </form>
  );
}
