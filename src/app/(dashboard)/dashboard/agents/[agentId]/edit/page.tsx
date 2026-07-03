export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAgentBuilderDataUseCase } from "@/server/use-cases/get-agent-builder-data";
import { AgentConfigForm } from "@/features/agents/components/agent-config-form";

export default async function AgentEditPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getAgentBuilderDataUseCase(supabase, user.id, agentId);
  if (!data) notFound();

  const { agent, config, userRole } = data;

  const canEdit = ["owner", "admin", "agent_manager"].includes(userRole);
  if (!canEdit) redirect(`/dashboard/agents/${agentId}`);

  if (!config) {
    redirect(`/dashboard/agents/${agentId}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/agents/${agentId}`}
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← {agent.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Edit Configuration</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Update your AI Employee&apos;s settings. You can regenerate their AI Instructions afterwards.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <AgentConfigForm agentId={agentId} config={config} />
      </div>
    </div>
  );
}
