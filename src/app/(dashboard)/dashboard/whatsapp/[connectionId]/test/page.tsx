export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { WhatsappConnectionRepository } from "@/server/repositories/whatsapp-connection-repository";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { WhatsappStatusBadge } from "@/features/whatsapp/components/whatsapp-status-badge";
import { WhatsappTestPanel } from "@/features/whatsapp/components/whatsapp-test-panel";

export default async function WhatsappTestPage({
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

  const membership = await membersRepo.findMembership(workspaceId, user.id);
  const canTest = membership && ["owner", "admin", "agent_manager"].includes(membership.role);

  if (!canTest) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-400">No tienes permisos para probar conexiones.</p>
        </div>
      </div>
    );
  }

  const connRepo = new WhatsappConnectionRepository(supabase);
  const connection = await connRepo.findById(connectionId);
  if (!connection || connection.workspace_id !== workspaceId) notFound();

  let assignedAgent = null;
  if (connection.agent_id) {
    const agentRepo = new AgentRepository(supabase);
    assignedAgent = await agentRepo.findById(connection.agent_id);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/whatsapp/${connectionId}`}
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← {connection.display_name ?? "Conexión"}
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Probar conexión</h1>
          <WhatsappStatusBadge status={connection.status} />
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Simula un mensaje entrante de WhatsApp para verificar que el agente responde.
        </p>
      </div>

      {/* Info box */}
      <div className="mb-4 rounded-xl border border-blue-900/50 bg-blue-950/10 p-4 text-sm text-blue-400">
        El simulador usa el provider <strong>Mock</strong> — el mensaje no llega a WhatsApp real.
        Es solo para validar que el agente, el RAG y Claude responden correctamente.
      </div>

      <WhatsappTestPanel
        connectionId={connectionId}
        agentAssigned={!!connection.agent_id}
        agentActive={assignedAgent?.status === "active"}
      />

      {assignedAgent && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm">
          <p className="text-zinc-500">
            Agente:{" "}
            <Link
              href={`/dashboard/agents/${assignedAgent.id}`}
              className="text-green-400 hover:text-green-300"
            >
              {assignedAgent.name}
            </Link>{" "}
            · Estado:{" "}
            <span
              className={
                assignedAgent.status === "active" ? "text-green-400" : "text-yellow-400"
              }
            >
              {assignedAgent.status}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
