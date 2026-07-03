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
      label: "Database",
      status: (h ? "ok" : "down") as "ok" | "down",
      detail: h ? "Supabase connected" : "No response",
    },
    {
      label: "LLM (Anthropic)",
      status: (hasAnthropicKey ? "ok" : "down") as "ok" | "down",
      detail: hasAnthropicKey ? "API key configured" : "ANTHROPIC_API_KEY missing",
    },
    {
      label: "Embeddings (OpenAI)",
      status: (hasOpenAiKey ? "ok" : "down") as "ok" | "down",
      detail: hasOpenAiKey ? "API key configured" : "OPENAI_API_KEY missing",
    },
    {
      label: "Token encryption",
      status: (hasEncryptionKey ? "ok" : "degraded") as "ok" | "degraded",
      detail: hasEncryptionKey ? "ENCRYPTION_KEY configured" : "ENCRYPTION_KEY missing — WhatsApp tokens unencrypted",
    },
  ];

  const overallStatus: "ok" | "degraded" | "down" =
    !h ? "down" :
    !hasAnthropicKey || !hasOpenAiKey ? "degraded" :
    "ok";

  const readinessItems = [
    { label: "Supabase URL configured", status: (hasSupabaseUrl ? "pass" : "fail") as "pass" | "fail", detail: undefined },
    { label: "Anthropic API Key", status: (hasAnthropicKey ? "pass" : "fail") as "pass" | "fail", detail: undefined },
    { label: "OpenAI API Key (embeddings)", status: (hasOpenAiKey ? "pass" : "fail") as "pass" | "fail", detail: undefined },
    { label: "ENCRYPTION_KEY configured", status: (hasEncryptionKey ? "pass" : "warn") as "pass" | "warn", detail: "Required for WhatsApp in production" },
    { label: "INTERNAL_API_SECRET configured", status: (hasInternalSecret ? "pass" : "warn") as "pass" | "warn", detail: "Protects health check endpoints" },
    { label: "Active plan", status: (snapshot.subscriptionStatus === "active" || snapshot.planId ? "pass" : "fail") as "pass" | "fail", detail: `Plan: ${snapshot.planName}` },
    { label: "Database accessible", status: (h ? "pass" : "fail") as "pass" | "fail", detail: undefined },
    { label: "Stripe configured", status: (stripe.configured ? "pass" : "pending") as "pass" | "pending", detail: "Billing — not required for launch" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/settings/billing" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Billing
        </Link>
        <h1 className="mt-2 text-xl font-bold text-white">System Health</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Operational diagnostics for your workspace
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
            <h3 className="mb-4 text-sm font-semibold text-zinc-300">Workspace Metrics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Active AI Employees</span>
                <span className="text-xs font-mono text-zinc-300">{h.agents_active as number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Open conversations</span>
                <span className="text-xs font-mono text-zinc-300">{h.conversations_open as number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Pending transfers</span>
                <span className={`text-xs font-mono ${(h.handoffs_open as number) > 0 ? "text-yellow-400" : "text-zinc-300"}`}>
                  {h.handoffs_open as number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Failed documents</span>
                <span className={`text-xs font-mono ${(h.docs_failed as number) > 0 ? "text-red-400" : "text-zinc-300"}`}>
                  {h.docs_failed as number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Failed WA connections</span>
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
          Public health check available at{" "}
          <span className="font-mono text-zinc-400">/api/health</span>.
          Detailed checks require <span className="font-mono text-zinc-400">x-internal-secret</span>.
        </p>
      </div>
    </div>
  );
}
