export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { WhatsappConnectionForm } from "@/features/whatsapp/components/whatsapp-connection-form";

export default async function NewWhatsappConnectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) redirect("/onboarding");

  const membership = await membersRepo.findMembership(workspaceId, user.id);
  const canCreate = membership && ["owner", "admin"].includes(membership.role);

  if (!canCreate) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-400">No tienes permisos para crear conexiones WhatsApp.</p>
        </div>
      </div>
    );
  }

  const bypassLimit =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_BYPASS_WHATSAPP_LIMIT === "true";

  if (!bypassLimit) {
    const { data: canCreateConnection } = await supabase.rpc(
      "waai_can_create_whatsapp_connection",
      { p_workspace_id: workspaceId }
    );

    if (!canCreateConnection) {
      return (
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-yellow-800 bg-yellow-950/20 p-8 text-center">
            <p className="text-yellow-400 font-medium">Límite de plan alcanzado</p>
            <p className="mt-2 text-sm text-zinc-400">
              Has alcanzado el límite de conexiones WhatsApp de tu plan actual.
              Actualiza para añadir más.
            </p>
          </div>
        </div>
      );
    }
  }

  // Load active agents for assignment
  const agentRepo = new AgentRepository(supabase);
  const agents = await agentRepo.findByWorkspace(workspaceId);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/whatsapp"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← WhatsApp
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">
          Nueva conexión WhatsApp
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Conecta tu número de WhatsApp y asigna un agente de IA.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <WhatsappConnectionForm agents={agents} />
      </div>
    </div>
  );
}
