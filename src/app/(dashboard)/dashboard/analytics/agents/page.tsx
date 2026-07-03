export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAgentPerformanceAnalyticsUseCase } from "@/server/use-cases/get-agent-performance-analytics";
import { AgentPerformanceTable } from "@/features/analytics/components/agent-performance-table";
import { AnalyticsDateFilter } from "@/features/analytics/components/analytics-date-filter";
import type { DatePreset } from "@/server/services/analytics-service";

export default async function AgentAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const { preset = "30d", from, to } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const agents = await getAgentPerformanceAnalyticsUseCase(
    supabase,
    user.id,
    preset as DatePreset,
    from,
    to
  );

  if (agents === null) redirect("/dashboard/analytics");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/dashboard/analytics"
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← Analytics
          </Link>
          <h1 className="mt-2 text-xl font-bold text-white">AI Employee Performance</h1>
        </div>
        <AnalyticsDateFilter currentPreset={preset} />
      </div>
      <AgentPerformanceTable agents={agents} />
    </div>
  );
}
