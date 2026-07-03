export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AnalyticsService } from "@/server/services/analytics-service";
import { LeadFunnelCard } from "@/features/analytics/components/lead-funnel-card";
import { HandoffMetricsCard } from "@/features/analytics/components/handoff-metrics-card";
import { ChannelUsageCard } from "@/features/analytics/components/channel-usage-card";

export default async function LeadsAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) redirect("/onboarding");

  const service = new AnalyticsService(supabase);
  const [funnel, handoffs] = await Promise.all([
    service.getLeadFunnel(workspaceId),
    service.getHandoffMetrics(workspaceId),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/analytics" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Analytics
        </Link>
        <h1 className="mt-2 text-xl font-bold text-white">Leads & Conversion</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Sales funnel and transfer metrics
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LeadFunnelCard funnel={funnel} />
        <HandoffMetricsCard metrics={handoffs} />
      </div>

      <div className="mt-6">
        <ChannelUsageCard
          whatsapp={funnel.from_whatsapp}
          sandbox={funnel.from_sandbox}
          web={0}
          label="Leads by source channel"
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Urgent", count: funnel.urgent_count, color: "text-red-400" },
          { label: "High", count: funnel.high_count, color: "text-orange-400" },
          { label: "Medium", count: funnel.medium_count, color: "text-yellow-400" },
          { label: "Low", count: funnel.low_count, color: "text-zinc-400" },
        ].map(({ label, count, color }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-xs text-zinc-500">Priority: {label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
