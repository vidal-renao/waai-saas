export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAnalyticsUseCase } from "@/server/use-cases/get-workspace-analytics";
import { getOperationalAlertsUseCase } from "@/server/use-cases/get-operational-alerts";
import { AnalyticsService } from "@/server/services/analytics-service";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { MetricCard } from "@/features/analytics/components/metric-card";
import { ChannelUsageCard } from "@/features/analytics/components/channel-usage-card";
import { HandoffMetricsCard } from "@/features/analytics/components/handoff-metrics-card";
import { RagUsageCard } from "@/features/analytics/components/rag-usage-card";
import { AiUsageCard } from "@/features/analytics/components/ai-usage-card";
import { ErrorEventsCard } from "@/features/analytics/components/error-events-card";
import { OperationalAlertsPanel } from "@/features/analytics/components/operational-alerts-panel";
import { AnalyticsDateFilter } from "@/features/analytics/components/analytics-date-filter";
import type { DatePreset } from "@/server/services/analytics-service";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const { preset = "30d", from, to } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) redirect("/onboarding");

  const membership = await membersRepo.findMembership(workspaceId, user.id);
  const role = membership?.role;

  const [overview, alerts, handoffs] = await Promise.all([
    getWorkspaceAnalyticsUseCase(supabase, user.id, {
      preset: preset as DatePreset,
      customFrom: from,
      customTo: to,
    }),
    getOperationalAlertsUseCase(supabase, user.id),
    new AnalyticsService(supabase).getHandoffMetrics(workspaceId),
  ]);

  const d = overview?.data;

  const canViewAi = role === "owner" || role === "admin";
  const canViewAgents = role === "owner" || role === "admin" || role === "agent_manager";

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Operational metrics for your AI workspace
          </p>
        </div>
        <AnalyticsDateFilter currentPreset={preset} currentFrom={from} currentTo={to} />
      </div>

      {/* Alerts */}
      {(alerts?.length ?? 0) > 0 && (
        <div className="mb-6">
          <OperationalAlertsPanel alerts={alerts ?? []} maxVisible={5} />
        </div>
      )}

      {/* Overview metrics */}
      {d ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <MetricCard label="Conversations" value={d.conversations_in_period} sub="In period" />
            <MetricCard label="Messages" value={d.messages_in_period} sub="In period" />
            <MetricCard label="Leads" value={d.leads_in_period} sub="Created in period" />
            <MetricCard
              label="Active Transfers"
              value={d.open_handoffs}
              sub="Need attention"
              highlight={d.open_handoffs > 0}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <MetricCard label="Total Conversations" value={d.total_conversations} sub="All time" />
            <MetricCard label="Active AI Employees" value={d.active_agents} />
            <MetricCard label="WhatsApp Connections" value={d.active_whatsapp_connections} />
            <MetricCard label="Open Conversations" value={d.open_conversations} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 mb-6">
            <ChannelUsageCard
              whatsapp={d.conversations_by_channel?.whatsapp ?? 0}
              sandbox={d.conversations_by_channel?.sandbox ?? 0}
              web={d.conversations_by_channel?.web ?? 0}
            />
            <HandoffMetricsCard
              metrics={handoffs}
              totalConversations={d.conversations_in_period}
            />
          </div>

          {canViewAgents && (
            <div className="grid gap-4 lg:grid-cols-2 mb-6">
              <RagUsageCard
                ragRuns={d.rag_runs}
                totalRuns={d.total_runs}
                docsReady={d.docs_ready}
                docsProcessing={d.docs_processing}
                docsFailed={d.docs_failed}
              />
              <ErrorEventsCard
                claudeErrors={d.error_runs}
                whatsappFailed={d.wa_failed}
                docsFailed={d.docs_failed}
                period="selected period"
              />
            </div>
          )}

          {canViewAi && (
            <div className="mb-6">
              <AiUsageCard
                totalRuns={d.total_runs}
                successRuns={d.success_runs}
                errorRuns={d.error_runs}
                totalTokens={d.total_tokens}
                totalInputTokens={d.total_input_tokens}
                totalOutputTokens={d.total_output_tokens}
                estimatedCostCents={d.estimated_cost_cents}
                avgLatencyMs={d.avg_latency_ms}
              />
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-400">No data available for the selected period.</p>
        </div>
      )}

      {/* Quick links */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {canViewAgents && (
          <Link
            href="/dashboard/analytics/agents"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
          >
            <p className="text-sm font-medium text-white">AI Employee Performance →</p>
            <p className="mt-1 text-xs text-zinc-500">Conversations, leads and errors per AI Employee</p>
          </Link>
        )}
        <Link
          href="/dashboard/analytics/leads"
          className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
        >
          <p className="text-sm font-medium text-white">Lead Funnel →</p>
          <p className="mt-1 text-xs text-zinc-500">Conversion and opportunity status</p>
        </Link>
        {canViewAi && (
          <Link
            href="/dashboard/analytics/usage"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
          >
            <p className="text-sm font-medium text-white">Plan Usage →</p>
            <p className="mt-1 text-xs text-zinc-500">Current limits and usage</p>
          </Link>
        )}
      </div>
    </div>
  );
}
