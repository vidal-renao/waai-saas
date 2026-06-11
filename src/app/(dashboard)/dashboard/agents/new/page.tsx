export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgentService } from "@/server/services/agent-service";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AgentWizard } from "@/features/agents/components/agent-wizard";
import { AgentLimitWarning } from "@/features/agents/components/agent-limit-warning";

export default async function NewAgentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) redirect("/onboarding");

  const agentService = new AgentService(supabase);
  const limitCheck = await agentService.checkAgentLimit(workspaceId);

  if (!limitCheck.allowed) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Nuevo agente</h1>
        </div>
        <AgentLimitWarning
          current={limitCheck.current}
          limit={limitCheck.limit}
          variant="error"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Nuevo agente de WhatsApp</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configura tu agente respondiendo las preguntas del wizard.
        </p>
      </div>
      <AgentWizard />
    </div>
  );
}
