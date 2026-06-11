export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/server/use-cases/get-dashboard-data";
import { listAgentsUseCase } from "@/server/use-cases/list-agents";
import { getWorkspaceAnalyticsUseCase } from "@/server/use-cases/get-workspace-analytics";
import { getOperationalAlertsUseCase } from "@/server/use-cases/get-operational-alerts";
import { OperationalAlertsPanel } from "@/features/analytics/components/operational-alerts-panel";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  agent_manager: "Gestor de Agentes",
  human_agent: "Agente Humano",
  viewer: "Observador",
};

function limitLabel(value: number): string {
  return value === -1 ? "Ilimitado" : value.toString();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getDashboardData(supabase, user.id);
  if (!data) redirect("/onboarding");

  const [agentsResult, analyticsResult, alerts] = await Promise.all([
    listAgentsUseCase(supabase, user.id),
    getWorkspaceAnalyticsUseCase(supabase, user.id, { preset: "30d" }),
    getOperationalAlertsUseCase(supabase, user.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Bienvenido, {data.profile.full_name ?? data.profile.email}
        </h1>
        <p className="mt-1 text-zinc-400">
          Workspace:{" "}
          <span className="text-zinc-200">{data.workspace.name}</span> ·{" "}
          <span className="text-zinc-400">
            {ROLE_LABELS[data.role] ?? data.role}
          </span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Plan card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Plan activo
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            {data.plan.name}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {data.plan.human_handoff_enabled
              ? "Human handoff activado"
              : "Sin human handoff"}
          </p>
        </div>

        {/* Messages card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Mensajes este mes
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            {data.usage.messages_sent}
            <span className="ml-1 text-sm font-normal text-zinc-400">
              / {limitLabel(data.plan.messages_limit)}
            </span>
          </p>
        </div>

        {/* Agents card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Agentes creados
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            {data.usage.agents_created}
            <span className="ml-1 text-sm font-normal text-zinc-400">
              / {limitLabel(data.plan.agents_limit)}
            </span>
          </p>
        </div>

        {/* Documents card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Documentos subidos
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            {data.usage.documents_uploaded}
            <span className="ml-1 text-sm font-normal text-zinc-400">
              / {limitLabel(data.plan.documents_limit)}
            </span>
          </p>
        </div>

        {/* Workspace status card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Estado workspace
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                data.workspace.status === "active"
                  ? "bg-green-400"
                  : data.workspace.status === "trial"
                    ? "bg-yellow-400"
                    : "bg-zinc-400"
              }`}
            />
            <span className="text-base font-medium capitalize text-white">
              {data.workspace.status}
            </span>
          </div>
        </div>

          {/* Analytics quick metrics */}
        {analyticsResult?.data && (
          <>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Conversaciones (30d)
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {analyticsResult.data.conversations_in_period}
              </p>
              <Link href="/dashboard/analytics" className="mt-1 block text-xs text-zinc-500 hover:text-zinc-300">
                Ver analytics →
              </Link>
            </div>
            <div className={`rounded-xl border p-5 ${analyticsResult.data.open_handoffs > 0 ? "border-yellow-800 bg-yellow-950/20" : "border-zinc-800 bg-zinc-900"}`}>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Handoffs activos
              </p>
              <p className={`mt-2 text-xl font-semibold ${analyticsResult.data.open_handoffs > 0 ? "text-yellow-400" : "text-white"}`}>
                {analyticsResult.data.open_handoffs}
              </p>
              <Link href="/dashboard/conversations" className="mt-1 block text-xs text-zinc-500 hover:text-zinc-300">
                Ver conversaciones →
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Operational Alerts */}
      {(alerts?.length ?? 0) > 0 && (
        <div className="mt-6">
          <OperationalAlertsPanel alerts={alerts ?? []} maxVisible={3} />
        </div>
      )}

      {/* Agent Builder CTA */}
      <div className="mt-8 rounded-xl border border-green-900/50 bg-green-950/20 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Agentes de WhatsApp
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {agentsResult
                ? `${agentsResult.limitCheck.current} agente${agentsResult.limitCheck.current !== 1 ? "s" : ""} creado${agentsResult.limitCheck.current !== 1 ? "s" : ""}`
                : "Crea tu primer agente inteligente"}
              {agentsResult && agentsResult.limitCheck.limit !== -1
                ? ` / ${agentsResult.limitCheck.limit} disponibles`
                : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/agents"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
            >
              Ver agentes
            </Link>
            {(!agentsResult || agentsResult.limitCheck.allowed) && (
              <Link
                href="/dashboard/agents/new"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
              >
                + Nuevo agente
              </Link>
            )}
          </div>
        </div>

        {/* Next steps */}
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {[
            { step: "1", label: "Crear agente", done: (agentsResult?.limitCheck.current ?? 0) > 0, href: "/dashboard/agents/new" },
            { step: "2", label: "Configurar negocio", done: false, href: "/dashboard/agents" },
            { step: "3", label: "Probar en sandbox", done: false, href: "#" },
            { step: "4", label: "Conectar WhatsApp", done: false, href: "#" },
          ].map(({ step, label, done, href }) => (
            <Link
              key={step}
              href={href}
              className={`rounded-lg border p-3 text-center transition-colors ${
                done
                  ? "border-green-800 bg-green-900/20 text-green-400"
                  : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
              }`}
            >
              <span className="block text-xs font-medium uppercase tracking-wider">
                Paso {step}
              </span>
              <span className="mt-1 block text-sm">{label}</span>
              {done && (
                <span className="mt-1 block text-xs text-green-500">✓ Completado</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
