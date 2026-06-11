export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { BillingEnforcementService } from "@/server/services/billing-enforcement-service";
import { BillingEventsRepository } from "@/server/repositories/billing-events-repository";
import { StripeReadinessService } from "@/server/services/stripe-readiness-service";
import { BillingReadinessCard } from "@/features/billing/components/billing-readiness-card";
import { BillingEventList } from "@/features/billing/components/billing-event-list";

export default async function BillingSettingsPage() {
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

  const [snapshot, events] = await Promise.all([
    new BillingEnforcementService(supabase).getUsageSnapshot(workspaceId),
    new BillingEventsRepository(supabase).findByWorkspace(workspaceId, 20),
  ]);

  const stripe = new StripeReadinessService().getConfigStatus();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-xl font-bold text-white">Billing</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Estado del plan y preparación para facturación real
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <BillingReadinessCard
          planId={snapshot.planId}
          planName={snapshot.planName}
          stripeConfigured={stripe.configured}
          humanHandoffEnabled={false}
        />

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Resumen de uso</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-zinc-400">Mensajes este mes</span>
              <span className="text-xs font-mono text-zinc-300">
                {snapshot.messagesSent} / {snapshot.messagesLimit === -1 ? "∞" : snapshot.messagesLimit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-zinc-400">Agentes activos</span>
              <span className="text-xs font-mono text-zinc-300">
                {snapshot.agentsCreated} / {snapshot.agentsLimit === -1 ? "∞" : snapshot.agentsLimit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-zinc-400">Documentos</span>
              <span className="text-xs font-mono text-zinc-300">
                {snapshot.documentsUploaded} / {snapshot.documentsLimit === -1 ? "∞" : snapshot.documentsLimit}
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/settings/usage"
            className="mt-4 block text-xs text-green-500 hover:text-green-400"
          >
            Ver uso detallado →
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Eventos de billing
        </h2>
        <BillingEventList events={events} />
      </div>

      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
        <p className="text-xs text-zinc-500">
          <strong className="text-zinc-400">Stripe:</strong> {stripe.message}
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Ver <Link href="/dashboard/settings/system-health" className="text-zinc-500 hover:text-zinc-300">estado del sistema</Link> para más detalles operativos.
        </p>
      </div>
    </div>
  );
}
