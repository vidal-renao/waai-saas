export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { WhatsappConnectionRepository } from "@/server/repositories/whatsapp-connection-repository";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { WhatsappStatusBadge } from "@/features/whatsapp/components/whatsapp-status-badge";
import { WhatsappProviderBadge } from "@/features/whatsapp/components/whatsapp-provider-badge";
import { WhatsappWebhookInfo } from "@/features/whatsapp/components/whatsapp-webhook-info";
import { WhatsappTestPanel } from "@/features/whatsapp/components/whatsapp-test-panel";

export default async function WhatsappConnectionDetailPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) redirect("/onboarding");

  const connRepo = new WhatsappConnectionRepository(supabase);
  const connection = await connRepo.findById(connectionId);

  if (!connection || connection.workspace_id !== workspaceId) notFound();

  const membership = await membersRepo.findMembership(workspaceId, user.id);
  const canManage = membership && ["owner", "admin"].includes(membership.role);

  let assignedAgent = null;
  if (connection.agent_id) {
    const agentRepo = new AgentRepository(supabase);
    assignedAgent = await agentRepo.findById(connection.agent_id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourapp.com";

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/whatsapp"
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← WhatsApp
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              {connection.display_name ?? "WhatsApp Connection"}
            </h1>
            <WhatsappStatusBadge status={connection.status} />
            <WhatsappProviderBadge provider={connection.provider} />
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            {connection.phone_number
              ? `+${connection.phone_number}`
              : "No number configured"}
          </p>
        </div>
        {canManage && (
          <Link
            href={`/dashboard/whatsapp/${connectionId}/test`}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Test Connection
          </Link>
        )}
      </div>

      {/* Error banner */}
      {connection.last_error_message && (
        <div className="mb-4 rounded-xl border border-red-800 bg-red-950/20 p-4 text-sm text-red-400">
          <strong>Last error:</strong> {connection.last_error_message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agent assignment */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Assigned AI Employee
          </p>
          {assignedAgent ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{assignedAgent.name}</p>
                <p className="text-xs text-zinc-500 capitalize">{assignedAgent.status}</p>
              </div>
              <Link
                href={`/dashboard/agents/${assignedAgent.id}`}
                className="text-xs text-green-400 hover:text-green-300"
              >
                View AI Employee →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              No AI Employee assigned. Edit the connection to assign one.
            </p>
          )}
        </div>

        {/* Connection details */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-2 text-sm">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
            Details
          </p>
          <Row label="Provider" value={connection.provider} />
          {connection.phone_number && (
            <Row label="Phone" value={`+${connection.phone_number}`} />
          )}
          {connection.external_instance_id && (
            <Row label="Instance ID" value={connection.external_instance_id} />
          )}
          <Row
            label="Created"
            value={new Date(connection.created_at).toLocaleDateString("de-CH")}
          />
          {connection.last_connected_at && (
            <Row
              label="Last Connected"
              value={new Date(connection.last_connected_at).toLocaleString("de-CH")}
            />
          )}
        </div>
      </div>

      {/* Webhook info */}
      <div className="mt-6">
        <WhatsappWebhookInfo connectionId={connectionId} appUrl={appUrl} />
      </div>

      {/* Test panel */}
      <div className="mt-6">
        <WhatsappTestPanel
          connectionId={connectionId}
          agentAssigned={!!connection.agent_id}
          agentActive={assignedAgent?.status === "active"}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 flex-shrink-0 text-zinc-500">{label}</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}
