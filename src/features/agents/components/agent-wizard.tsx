"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  agentStep1Schema,
  agentStep2Schema,
  agentStep3Schema,
  agentStep4Schema,
  agentStep5Schema,
  type AgentStep1,
  type AgentStep2,
  type AgentStep3,
  type AgentStep4,
  type AgentStep5,
  type CreateAgentWizard,
} from "@/lib/validators/agent";
import { buildSystemPrompt, parseList } from "@/lib/prompt-builder";
import { AgentPromptPreview } from "./agent-prompt-preview";
import { Button } from "@/components/ui/button";

// ── Step labels ───────────────────────────────────────────────────────────────
const STEPS = [
  "Identidad",
  "Comunicación",
  "Servicios",
  "Lead Capture",
  "Vista previa",
];

const INDUSTRIES = [
  "Limpieza",
  "Restaurante / Cafetería",
  "Clínica / Salud",
  "Inmobiliaria",
  "Academia / Formación",
  "Construcción / Reformas",
  "Ecommerce",
  "Consultoría / Coaching",
  "Logística",
  "Tecnología / IT",
  "Belleza / Estética",
  "Jardinería / Paisajismo",
  "Otro",
];

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "ca", label: "Català" },
  { value: "it", label: "Italiano" },
];

const TONES = [
  { value: "professional", label: "Profesional" },
  { value: "friendly", label: "Amigable" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "empathetic", label: "Empático" },
];

const GOALS = [
  "Capturar leads",
  "Responder preguntas frecuentes",
  "Agendar citas",
  "Derivar al equipo humano",
  "Proporcionar información",
  "Tomar pedidos",
];

// ── Progress indicator ────────────────────────────────────────────────────────
function WizardProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-1 flex-1">
          <div
            className={`h-1.5 w-full rounded-full transition-colors ${
              i < current ? "bg-green-500" : i === current ? "bg-green-700" : "bg-zinc-800"
            }`}
          />
        </div>
      ))}
      <span className="ml-2 text-xs text-zinc-500 whitespace-nowrap">
        {current + 1}/{total}
      </span>
    </div>
  );
}

// ── Step 1 — Business Identity ────────────────────────────────────────────────
function Step1({
  defaultValues,
  onNext,
}: {
  defaultValues: Partial<AgentStep1>;
  onNext: (d: AgentStep1) => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<AgentStep1>({
    resolver: zodResolver(agentStep1Schema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Identidad del negocio</h2>
        <p className="text-sm text-zinc-400 mt-1">Cuéntanos sobre ti y tu empresa.</p>
      </div>

      <Field label="Nombre del agente *" error={errors.name?.message}>
        <input type="text" className={inputCls} placeholder="Ej. D'NAMAR Assistant" {...register("name")} />
      </Field>

      <Field label="Nombre del negocio *" error={errors.business_name?.message}>
        <input type="text" className={inputCls} placeholder="Ej. D'NAMAR Limpiezas" {...register("business_name")} />
      </Field>

      <Field label="Sector *" error={errors.industry?.message}>
        <select className={inputCls} {...register("industry")}>
          <option value="">Selecciona el sector</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </Field>

      <Field label="Descripción breve" error={errors.business_description?.message}>
        <textarea rows={3} className={inputCls} placeholder="Describe brevemente qué hace tu empresa..." {...register("business_description")} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="País (ej. ES, CH)" error={errors.country?.message}>
          <input type="text" maxLength={2} className={inputCls} placeholder="ES" {...register("country")} />
        </Field>
        <Field label="Ciudad principal" error={errors.city?.message}>
          <input type="text" className={inputCls} placeholder="Madrid" {...register("city")} />
        </Field>
      </div>

      <Button type="submit" className="mt-2 w-full">Siguiente →</Button>
    </form>
  );
}

// ── Step 2 — Communication Style ─────────────────────────────────────────────
function Step2({
  defaultValues,
  onNext,
  onBack,
}: {
  defaultValues: Partial<AgentStep2>;
  onNext: (d: AgentStep2) => void;
  onBack: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<AgentStep2>({
    resolver: zodResolver(agentStep2Schema),
    defaultValues: { primary_language: "es", tone: "professional", ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Estilo de comunicación</h2>
        <p className="text-sm text-zinc-400 mt-1">¿Cómo debe hablar tu agente?</p>
      </div>

      <Field label="Idioma principal *" error={errors.primary_language?.message}>
        <select className={inputCls} {...register("primary_language")}>
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Tono de comunicación *" error={errors.tone?.message}>
        <select className={inputCls} {...register("tone")}>
          {TONES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Público objetivo" error={errors.target_audience?.message}>
        <textarea rows={2} className={inputCls} placeholder="Ej. Propietarios de viviendas y oficinas en Madrid..." {...register("target_audience")} />
      </Field>

      <Field label="Mensaje de bienvenida" error={errors.opening_message?.message}>
        <textarea rows={2} className={inputCls} placeholder="¡Hola! Soy el asistente de..." {...register("opening_message")} />
      </Field>

      <div className="flex gap-3 mt-2">
        <button type="button" onClick={onBack} className={backBtnCls}>← Anterior</button>
        <Button type="submit" className="flex-1">Siguiente →</Button>
      </div>
    </form>
  );
}

// ── Step 3 — Services & Availability ─────────────────────────────────────────
function Step3({
  defaultValues,
  onNext,
  onBack,
}: {
  defaultValues: Partial<AgentStep3>;
  onNext: (d: AgentStep3) => void;
  onBack: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<AgentStep3>({
    resolver: zodResolver(agentStep3Schema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Servicios y disponibilidad</h2>
        <p className="text-sm text-zinc-400 mt-1">¿Qué ofreces y cuándo?</p>
      </div>

      <Field label="Servicios * (uno por línea)" error={errors.services_raw?.message}>
        <textarea rows={4} className={inputCls} placeholder={"Limpieza de hogar\nLimpieza de oficinas\nDesinfección"} {...register("services_raw")} />
      </Field>

      <Field label="Zonas de servicio (una por línea)" error={errors.service_areas_raw?.message}>
        <textarea rows={3} className={inputCls} placeholder={"Madrid\nPozuelo\nMajadahonda"} {...register("service_areas_raw")} />
      </Field>

      <Field label="Horario de atención" error={errors.working_hours_raw?.message}>
        <input type="text" className={inputCls} placeholder="Lunes a Viernes 9:00-18:00, Sábado 10:00-14:00" {...register("working_hours_raw")} />
      </Field>

      <div className="flex gap-3 mt-2">
        <button type="button" onClick={onBack} className={backBtnCls}>← Anterior</button>
        <Button type="submit" className="flex-1">Siguiente →</Button>
      </div>
    </form>
  );
}

// ── Step 4 — Lead Capture & Handoff ──────────────────────────────────────────
function Step4({
  defaultValues,
  onNext,
  onBack,
}: {
  defaultValues: Partial<AgentStep4>;
  onNext: (d: AgentStep4) => void;
  onBack: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<AgentStep4>({
    resolver: zodResolver(agentStep4Schema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Lead capture y escalado</h2>
        <p className="text-sm text-zinc-400 mt-1">¿Qué debe conseguir y cuándo escalar?</p>
      </div>

      <Field label="Objetivo principal *" error={errors.primary_goal?.message}>
        <select className={inputCls} {...register("primary_goal")}>
          <option value="">Selecciona el objetivo</option>
          {GOALS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </Field>

      <Field label="Datos a recopilar (uno por línea)" error={errors.lead_capture_fields_raw?.message}>
        <textarea rows={3} className={inputCls} placeholder={"nombre\nteléfono\nemail"} {...register("lead_capture_fields_raw")} />
      </Field>

      <Field label="Reglas de escalado a humano (una por línea)" error={errors.handoff_rules_raw?.message}>
        <textarea rows={3} className={inputCls} placeholder={"Si el cliente está enfadado\nSi pide hablar con una persona"} {...register("handoff_rules_raw")} />
      </Field>

      <Field label="Mensaje antes de escalar" error={errors.human_handoff_message?.message}>
        <textarea rows={2} className={inputCls} placeholder="Te conecto con nuestro equipo ahora mismo..." {...register("human_handoff_message")} />
      </Field>

      <div className="flex gap-3 mt-2">
        <button type="button" onClick={onBack} className={backBtnCls}>← Anterior</button>
        <Button type="submit" className="flex-1">Siguiente →</Button>
      </div>
    </form>
  );
}

// ── Step 5 — Safety & Preview ─────────────────────────────────────────────────
function Step5({
  accumulated,
  defaultValues,
  onSubmit,
  onBack,
  isSubmitting,
}: {
  accumulated: Partial<CreateAgentWizard>;
  defaultValues: Partial<AgentStep5>;
  onSubmit: (d: AgentStep5) => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<AgentStep5>({
    resolver: zodResolver(agentStep5Schema),
    defaultValues,
  });

  function generatePreview() {
    const vals = getValues();
    const all = { ...accumulated, ...vals };
    const prompt = buildSystemPrompt({
      agentName: all.name ?? "Agente",
      businessName: all.business_name ?? "Mi empresa",
      industry: all.industry ?? "",
      primaryLanguage: all.primary_language ?? "es",
      tone: all.tone ?? "professional",
      primaryGoal: all.primary_goal ?? "",
      targetAudience: all.target_audience,
      businessDescription: all.business_description,
      services: parseList(all.services_raw),
      serviceAreas: parseList(all.service_areas_raw),
      workingHoursRaw: all.working_hours_raw,
      faqs: parseList(vals.faqs_raw),
      leadCaptureFields: parseList(all.lead_capture_fields_raw),
      handoffRules: parseList(all.handoff_rules_raw),
      fallbackMessage: vals.fallback_message || "Lo siento, no tengo esa información.",
      humanHandoffMessage: all.human_handoff_message,
      restrictions: parseList(vals.restrictions_raw),
      openingMessage: all.opening_message,
    });
    setPreview(prompt);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Seguridad y vista previa</h2>
        <p className="text-sm text-zinc-400 mt-1">Últimos detalles y revisa el prompt generado.</p>
      </div>

      <Field label="Preguntas frecuentes (una por línea)" error={errors.faqs_raw?.message}>
        <textarea rows={4} className={inputCls} placeholder={"¿Cuánto cuesta una limpieza? / Depende del servicio\n¿Traéis el material? / Sí, incluido"} {...register("faqs_raw")} />
      </Field>

      <Field label="Mensaje cuando no sepa responder *" error={errors.fallback_message?.message}>
        <textarea rows={2} className={inputCls} placeholder="Lo siento, no tengo esa información. Te pongo en contacto con nuestro equipo." {...register("fallback_message")} />
      </Field>

      <Field label="Restricciones (una por línea)" error={errors.restrictions_raw?.message}>
        <textarea rows={3} className={inputCls} placeholder={"No prometer descuentos\nNo confirmar citas sin verificar disponibilidad"} {...register("restrictions_raw")} />
      </Field>

      <button
        type="button"
        onClick={generatePreview}
        className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
      >
        Vista previa del prompt
      </button>

      {preview && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-500">Vista previa del system prompt (generado localmente):</p>
          <AgentPromptPreview prompt={preview} />
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <button type="button" onClick={onBack} className={backBtnCls} disabled={isSubmitting}>
          ← Anterior
        </button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Creando agente..." : "Crear agente"}
        </Button>
      </div>
    </form>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-zinc-300">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputCls =
  "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none w-full";

const backBtnCls =
  "rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors";

// ── Main Wizard Component ─────────────────────────────────────────────────────
export function AgentWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<CreateAgentWizard>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleNext<T extends Partial<CreateAgentWizard>>(stepData: T) {
    setData((prev) => ({ ...prev, ...stepData }));
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  async function handleFinalSubmit(step5Data: AgentStep5) {
    setSubmitError(null);
    setIsSubmitting(true);
    const fullData = { ...data, ...step5Data };

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullData),
      });

      const json = (await res.json()) as { error?: string; agent?: { id: string } };

      if (!res.ok) {
        setSubmitError(
          res.status === 402
            ? "Has alcanzado el límite de agentes de tu plan. Actualiza tu plan para crear más."
            : json.error ?? "Error al crear el agente"
        );
        return;
      }

      if (json.agent?.id) {
        router.push(`/dashboard/agents/${json.agent.id}`);
        router.refresh();
      }
    } catch {
      setSubmitError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <WizardProgress current={step} total={STEPS.length} />

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        {step === 0 && (
          <Step1 defaultValues={data} onNext={handleNext} />
        )}
        {step === 1 && (
          <Step2 defaultValues={data} onNext={handleNext} onBack={handleBack} />
        )}
        {step === 2 && (
          <Step3 defaultValues={data} onNext={handleNext} onBack={handleBack} />
        )}
        {step === 3 && (
          <Step4 defaultValues={data} onNext={handleNext} onBack={handleBack} />
        )}
        {step === 4 && (
          <Step5
            accumulated={data}
            defaultValues={data}
            onSubmit={handleFinalSubmit}
            onBack={handleBack}
            isSubmitting={isSubmitting}
          />
        )}

        {submitError && (
          <p className="mt-4 rounded-lg bg-red-900/20 px-3 py-2 text-sm text-red-400">
            {submitError}
          </p>
        )}
      </div>
    </div>
  );
}
