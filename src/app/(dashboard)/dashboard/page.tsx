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
  owner: "Owner",
  admin: "Admin",
  agent_manager: "Manager",
  human_agent: "Agent",
  viewer: "Viewer",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getDashboardData(supabase, user.id);
  if (!data) redirect("/onboarding");

  const [agentsResult, analytics30d, analyticsToday, alerts] = await Promise.all([
    listAgentsUseCase(supabase, user.id),
    getWorkspaceAnalyticsUseCase(supabase, user.id, { preset: "30d" }),
    getWorkspaceAnalyticsUseCase(supabase, user.id, { preset: "today" }),
    getOperationalAlertsUseCase(supabase, user.id),
  ]);

  const ad = analytics30d?.data;
  const td = analyticsToday?.data;

  const openHandoffs = ad?.open_handoffs ?? 0;
  const activeAgents = ad?.active_agents ?? 0;
  const activeConnections = ad?.active_whatsapp_connections ?? 0;
  const docsReady = ad?.docs_ready ?? 0;

  const conversationsToday = td?.conversations_in_period ?? 0;
  const leadsGenerated = ad?.leads_in_period ?? 0;
  const humanTransfers = ad?.handoffs_in_period ?? 0;
  const conversations30d = ad?.conversations_in_period ?? 0;
  const timeSavedHours = Math.max(1, Math.round(conversations30d * 5 / 60));

  const agentCount = agentsResult?.limitCheck.current ?? 0;
  const activeAgentCount = agentsResult?.agents.filter((a) => a.status === "active").length ?? 0;

  type ActionType = "action" | "warning" | "success" | "neutral";
  const recommendedAction: {
    title: string;
    description: string;
    href: string;
    cta: string;
    type: ActionType;
  } = (() => {
    if (agentCount === 0) {
      return {
        title: "Hire your first AI Employee",
        description: "Create an AI Employee to start handling customer conversations automatically — 24/7, no breaks.",
        href: "/dashboard/agents/new",
        cta: "Get Started →",
        type: "action" as ActionType,
      };
    }
    if (activeAgentCount === 0) {
      return {
        title: "Your AI Employee needs AI Instructions",
        description: "Generate AI Instructions for your employee so they know how to respond to customers.",
        href: "/dashboard/agents",
        cta: "View AI Employees →",
        type: "warning" as ActionType,
      };
    }
    if (activeConnections === 0) {
      return {
        title: "Connect WhatsApp to go live",
        description: "Your AI Employee is ready. Link a WhatsApp Business number to start handling real customer conversations.",
        href: "/dashboard/whatsapp/new",
        cta: "Connect WhatsApp →",
        type: "action" as ActionType,
      };
    }
    if (openHandoffs > 0) {
      return {
        title: `${openHandoffs} customer${openHandoffs !== 1 ? "s" : ""} need${openHandoffs === 1 ? "s" : ""} your attention`,
        description: "These conversations were escalated and are waiting for a human response in your Inbox.",
        href: "/dashboard/conversations",
        cta: "View Inbox →",
        type: "warning" as ActionType,
      };
    }
    return {
      title: "Your AI Employee is live and working",
      description: conversations30d > 0
        ? `${conversations30d} conversation${conversations30d !== 1 ? "s" : ""} handled automatically in the last 30 days.`
        : "Monitor your results in Analytics.",
      href: "/dashboard/analytics",
      cta: "View Analytics →",
      type: "success" as ActionType,
    };
  })();

  const accountStatus =
    data.workspace.status === "active"
      ? "Active"
      : data.workspace.status === "trial"
        ? "Trial"
        : "Inactive";

  const statusDot =
    data.workspace.status === "active"
      ? "bg-green-400"
      : data.workspace.status === "trial"
        ? "bg-yellow-400"
        : "bg-zinc-400";

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome, {data.profile.full_name ?? data.profile.email}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {data.workspace.name}
            {" · "}
            {ROLE_LABELS[data.role] ?? data.role}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusDot}`} />
          <span className="text-sm text-zinc-400">{accountStatus}</span>
        </div>
      </div>

      {/* Urgent: open handoffs */}
      {openHandoffs > 0 && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-yellow-700 bg-yellow-950/20 px-5 py-4">
          <div>
            <p className="font-semibold text-yellow-300">
              {openHandoffs} customer{openHandoffs !== 1 ? "s" : ""} waiting for your reply
            </p>
            <p className="mt-0.5 text-xs text-yellow-500">
              These conversations were escalated and need a human response
            </p>
          </div>
          <Link
            href="/dashboard/conversations"
            className="shrink-0 rounded-lg bg-yellow-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-yellow-600"
          >
            View Inbox →
          </Link>
        </div>
      )}

      {/* Business Impact */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Business Impact
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Conversations Today"
            value={conversationsToday}
            sub="handled by AI"
          />
          <MetricCard
            label="Leads Generated"
            value={leadsGenerated}
            sub="last 30 days"
            href="/dashboard/analytics"
          />
          <MetricCard
            label="Human Transfers"
            value={humanTransfers}
            sub="last 30 days"
            href="/dashboard/conversations"
          />
          <MetricCard
            label="Hours Saved"
            value={`${timeSavedHours}h`}
            sub="estimated this month"
          />
        </div>
      </section>

      {/* Current Status */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Current Status
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatusCard
            label="AI Employees Active"
            value={activeAgents}
            href="/dashboard/agents"
            linkLabel="View AI Employees"
            active={activeAgents > 0}
          />
          <StatusCard
            label="WhatsApp Connected"
            value={activeConnections}
            href="/dashboard/whatsapp"
            linkLabel="Manage Channels"
            active={activeConnections > 0}
          />
          <StatusCard
            label="Company Knowledge"
            value={docsReady}
            valueSuffix={docsReady === 1 ? " doc" : " docs"}
            href="/dashboard/knowledge"
            linkLabel="Manage Knowledge"
            active={docsReady > 0}
          />
        </div>
      </section>

      {/* Recommended Next Action */}
      <section className="mb-6">
        <div
          className={`rounded-xl border p-5 ${
            recommendedAction.type === "warning"
              ? "border-yellow-800 bg-yellow-950/20"
              : recommendedAction.type === "success"
                ? "border-green-900/50 bg-green-950/20"
                : "border-zinc-700 bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p
                className={`font-semibold ${
                  recommendedAction.type === "warning"
                    ? "text-yellow-300"
                    : recommendedAction.type === "success"
                      ? "text-green-300"
                      : "text-white"
                }`}
              >
                {recommendedAction.title}
              </p>
              <p className="mt-1 text-sm text-zinc-400">{recommendedAction.description}</p>
            </div>
            <Link
              href={recommendedAction.href}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                recommendedAction.type === "warning"
                  ? "bg-yellow-700 hover:bg-yellow-600"
                  : "bg-green-700 hover:bg-green-600"
              }`}
            >
              {recommendedAction.cta}
            </Link>
          </div>
        </div>
      </section>

      {/* Operational Alerts */}
      {(alerts?.length ?? 0) > 0 && (
        <section className="mb-6">
          <OperationalAlertsPanel alerts={alerts ?? []} maxVisible={3} />
        </section>
      )}

      {/* AI Employees quick access */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">AI Employees</h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              {agentsResult
                ? `${agentsResult.limitCheck.current} AI Employee${agentsResult.limitCheck.current !== 1 ? "s" : ""} created`
                : "Hire your first AI Employee to get started"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/agents"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
            >
              View All
            </Link>
            {(!agentsResult || agentsResult.limitCheck.allowed) && (
              <Link
                href="/dashboard/agents/new"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500"
              >
                + Hire AI Employee
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          {[
            { step: "1", label: "Hire AI Employee", done: agentCount > 0, href: "/dashboard/agents/new" },
            { step: "2", label: "Configure your business", done: agentCount > 0, href: "/dashboard/agents" },
            { step: "3", label: "Test your AI", done: activeAgentCount > 0, href: "/dashboard/agents" },
            { step: "4", label: "Connect WhatsApp", done: activeConnections > 0, href: "/dashboard/whatsapp" },
          ].map(({ step, label, done, href }) => (
            <Link
              key={step}
              href={href}
              className={`rounded-lg border p-3 text-center transition-colors ${
                done
                  ? "border-green-800 bg-green-900/20 text-green-400"
                  : "border-zinc-800 bg-zinc-800/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
              }`}
            >
              <span className="block text-xs font-medium uppercase tracking-wider">
                Step {step}
              </span>
              <span className="mt-1 block text-sm">{label}</span>
              {done && <span className="mt-1 block text-xs text-green-500">✓ Done</span>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function StatusCard({
  label,
  value,
  valueSuffix,
  href,
  linkLabel,
  active,
}: {
  label: string;
  value: string | number;
  valueSuffix?: string;
  href: string;
  linkLabel: string;
  active: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${active ? "text-white" : "text-zinc-500"}`}>
        {value}{valueSuffix}
      </p>
      <Link href={href} className="mt-1 block text-xs text-zinc-500 transition-colors hover:text-zinc-300">
        {linkLabel} →
      </Link>
    </div>
  );
}
