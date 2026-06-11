export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { SystemHealthRepository } from "@/server/repositories/system-health-repository";
import { BillingEnforcementService } from "@/server/services/billing-enforcement-service";
import { StripeReadinessService } from "@/server/services/stripe-readiness-service";
import { SystemHealthCard } from "@/features/health/components/system-health-card";
import { ProductionReadinessChecklist } from "@/features/health/components/production-readiness-checklist";

export default async function SystemHealthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) redirect("/onboarding");

  const membership = await membersRepo.findMembership(workspaceId, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    redirect("/dashboard");
  }

  const [healthData, snapshot] = await Promise.all([
    new SystemHealthRepository(supabase).getProductionHealth(workspaceId),
    new BillingEnforcementService(supabase).getUsageSnapshot(workspaceId),
  ]);

  const h = healthData as Record<string, number | boolean | string> | null;
  const stripe = new StripeReadinessService().getConfigStatus();

  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
  const hasEncryptionKey = Boolean(process.env.ENCRYPTION_KEY);
  const hasInternalSecret = Boolean(process.env.INTERNAL_API_SECRET);
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const systemChecks = [
    {
      label: "Base de datos",
      status: (h ? "ok" : "down") as "ok" | "down",
      detail: h ? "Supabase conectado" : "Sin respuesta",
    },
    {
      label: "LLM (Anthropic)",
      status: (hasAnthropicKey ? "ok" : "down") as "ok" | "down",
      detail: hasAnthropicKey ? "API key configurada" : "ANTHROPIC_API_KEY falta",
    },
    {
      label: "Embeddings (OpenAI)",
      status: (hasOpenAiKey ? "ok" : "down") as "ok" | "down",
      detail: hasOpenAiKey ? "API key configurada" : "OPENAI_API_KEY falta",
    },
    {
      label: "Cifrado de tokens",
      status: (hasEncryptionKey ? "ok" : "degraded") as "ok" | "degraded",
      detail: hasEncryptionKey ? "ENCRYPTION_KEY configurado" : "ENCRYPTION_KEY falta — WhatsApp tokens sin cifrar",
    },
  ];

  const overallStatus: "ok" | "degraded" | "down" =
    !h ? "down" :
    !hasAnthropicKey || !hasOpenAiKey ? "degraded" :
    "ok";

  const readinessItems = [
    { label: "Supabase URL configurado", status: (hasSupabaseUrl ? "pass" : "fail") as "pass" | "fail", detail: undefined },
    { label: "Anthropic API Key", status: (hasAnthropicKey ? "pass" : "fail") as "pass" | "fail", detail: undefined },
    { label: "OpenAI API Key (embeddings)", status: (hasOpenAiKey ? "pass" : "fail") as "pass" | "fail", detail: undefined },
    { label: "ENCRYPTION_KEY configurado", status: (hasEncryptionKey ? "pass" : "warn") as "pass" | "warn", detail: "Requerido para WhatsApp en producción" },
    { label: "INTERNAL_API_SECRET configurado", status: (hasInternalSecret ? "pass" : "warn") as "pass" | "warn", detail: "Protege los health check endpoints" },
    { label: "Plan activo", status: (snapshot.subscriptionStatus === "active" || snapshot.planId ? "pass" : "fail") as "pass" | "fail", detail: `Plan: ${snapshot.planName}` },
    { label: "Base de datos accesible", status: (h ? "pass" : "fail") as "pass" | "fail", detail: undefined },
    { label: "Stripe configurado", status: (stripe.configured ? "pass" : "pending") as "pass" | "pending", detail: "Fase 9 — no requerido ahora" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/settings/billing" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Billing
        </Link>
        <h1 className="mt-2 text-xl font-bold text-white">Estado del sistema</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Diagnóstico operativo del workspace
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <SystemHealthCard
          overallStatus={overallStatus}
          checks={systemChecks}
          lastChecked={new Date().toISOString()}
        />

        {h && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Métricas de workspace</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Agentes activos</span>
                <span className="text-xs font-mono text-zinc-300">{h.agents_active as number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Conversaciones abiertas</span>
                <span className="text-xs font-mono text-zinc-300">{h.conversations_open as number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Handoffs abiertos</span>
                <span className={`text-xs font-mono ${(h.handoffs_open as number) > 0 ? "text-yellow-400" : "text-zinc-300"}`}>
                  {h.handoffs_open as number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Docs fallidos</span>
                <span className={`text-xs font-mono ${(h.docs_failed as number) > 0 ? "text-red-400" : "text-zinc-300"}`}>
                  {h.docs_failed as number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">WA connections fallidas</span>
                <span className={`text-xs font-mono ${(h.wa_connections_failed as number) > 0 ? "text-red-400" : "text-zinc-300"}`}>
                  {h.wa_connections_failed as number}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <ProductionReadinessChecklist items={readinessItems} />

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-xs text-zinc-500">
          Health check público disponible en{" "}
          <span className="font-mono text-zinc-400">/api/health</span>.
          Los checks detallados requieren <span className="font-mono text-zinc-400">x-internal-secret</span>.
        </p>
      </div>
    </div>
  );
}
