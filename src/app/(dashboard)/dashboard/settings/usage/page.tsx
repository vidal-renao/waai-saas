export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { BillingEnforcementService } from "@/server/services/billing-enforcement-service";
import { AiCostSnapshotsRepository } from "@/server/repositories/ai-cost-snapshots-repository";
import { PlanUsageSummary } from "@/features/billing/components/plan-usage-summary";
import { AiCostSummary } from "@/features/billing/components/ai-cost-summary";

export default async function UsageSettingsPage() {
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

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fromDate = thirtyDaysAgo.toISOString().slice(0, 10);
  const toDate = today.toISOString().slice(0, 10);

  const [snapshot, costData] = await Promise.all([
    new BillingEnforcementService(supabase).getUsageSnapshot(workspaceId),
    new AiCostSnapshotsRepository(supabase).getAiCostSnapshot(workspaceId, fromDate, toDate),
  ]);

  const cost = costData as Record<string, unknown> | null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/settings/billing" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Billing
        </Link>
        <h1 className="mt-2 text-xl font-bold text-white">Plan Usage</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Plan: <span className="font-semibold text-zinc-300 capitalize">{snapshot.planName}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 mb-6">
        <PlanUsageSummary
          messagesSent={snapshot.messagesSent}
          messagesLimit={snapshot.messagesLimit}
          agentsCreated={snapshot.agentsCreated}
          agentsLimit={snapshot.agentsLimit}
          documentsUploaded={snapshot.documentsUploaded}
          documentsLimit={snapshot.documentsLimit}
          whatsappConnections={snapshot.whatsappConnections}
          whatsappConnectionsLimit={snapshot.whatsappConnectionsLimit}
          membersCount={snapshot.membersCount}
        />
      </div>

      {cost && (
        <AiCostSummary
          totalRuns={(cost.total_runs as number) ?? 0}
          successRuns={(cost.success_runs as number) ?? 0}
          errorRuns={(cost.error_runs as number) ?? 0}
          totalInputTokens={(cost.total_input_tokens as number) ?? 0}
          totalOutputTokens={(cost.total_output_tokens as number) ?? 0}
          estimatedCostCents={(cost.estimated_cost_cents as number) ?? 0}
          period="Last 30 days"
        />
      )}

      <div className="mt-4 text-center">
        <Link
          href="/dashboard/analytics/usage"
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          View in Analytics →
        </Link>
      </div>
    </div>
  );
}
