export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsageLimitsAnalyticsUseCase } from "@/server/use-cases/get-usage-limits-analytics";
import { UsageLimitCard } from "@/features/analytics/components/usage-limit-card";

export default async function UsageAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usage = await getUsageLimitsAnalyticsUseCase(supabase, user.id);

  if (!usage) redirect("/dashboard/analytics");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/analytics" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Analytics
        </Link>
        <h1 className="mt-2 text-xl font-bold text-white">Plan Usage</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Active plan:{" "}
          <span className="font-semibold capitalize text-zinc-300">{usage.plan_name}</span>
          {usage.human_handoff_enabled && (
            <span className="ml-2 rounded-full bg-green-900/40 px-2 py-0.5 text-xs text-green-400">
              Human Transfer enabled
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <UsageLimitCard
          label="Messages this month"
          used={usage.messages_used}
          limit={usage.messages_limit}
          pct={usage.messages_pct}
          severity={usage.messages_severity}
        />
        <UsageLimitCard
          label="AI Employees"
          used={usage.agents_used}
          limit={usage.agents_limit}
          pct={usage.agents_pct}
          severity={
            usage.agents_pct !== null && usage.agents_pct >= 95
              ? "critical"
              : usage.agents_pct !== null && usage.agents_pct >= 80
                ? "warning"
                : "ok"
          }
        />
        <UsageLimitCard
          label="Knowledge Documents"
          used={usage.documents_used}
          limit={usage.documents_limit}
          pct={usage.documents_pct}
          severity={
            usage.documents_pct !== null && usage.documents_pct >= 95
              ? "critical"
              : usage.documents_pct !== null && usage.documents_pct >= 80
                ? "warning"
                : "ok"
          }
        />
        <UsageLimitCard
          label="WhatsApp Connections"
          used={usage.whatsapp_connections_used}
          limit={usage.whatsapp_numbers_limit}
          pct={usage.connections_pct}
          severity={
            usage.connections_pct !== null && usage.connections_pct >= 95
              ? "critical"
              : usage.connections_pct !== null && usage.connections_pct >= 80
                ? "warning"
                : "ok"
          }
        />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Team</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Team members</span>
          <span className="text-sm font-bold text-white">{usage.members_count}</span>
        </div>
      </div>
    </div>
  );
}
