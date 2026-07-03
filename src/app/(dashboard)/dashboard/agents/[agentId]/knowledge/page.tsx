export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAgentKnowledgeSourcesUseCase } from "@/server/use-cases/get-agent-knowledge-sources";
import { AgentKnowledgeSelector } from "@/features/knowledge/components/agent-knowledge-selector";

export default async function AgentKnowledgePage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await getAgentKnowledgeSourcesUseCase(supabase, user.id, agentId);
  if (!data) notFound();

  const { agent, sources, workspaceDocuments, userRole } = data;
  const canManage = ["owner", "admin", "agent_manager"].includes(userRole);

  const linkedCount = sources.filter((s) => s.is_active).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/agents/${agentId}`}
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← {agent.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Company Knowledge</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Link indexed documents so your AI Employee can use them when answering customers.
          {linkedCount > 0 && (
            <span className="ml-2 text-green-400">{linkedCount} document{linkedCount !== 1 ? "s" : ""} linked</span>
          )}
        </p>
      </div>

      {workspaceDocuments.filter((d) => d.status === "ready").length === 0 && (
        <div className="mb-4 rounded-xl border border-yellow-800 bg-yellow-950/20 p-4 text-sm text-yellow-400">
          No indexed documents available.{" "}
          <Link href="/dashboard/knowledge/new" className="underline hover:text-yellow-300">
            Add and index a document
          </Link>{" "}
          first, then link it here.
        </div>
      )}

      <AgentKnowledgeSelector
        agentId={agentId}
        sources={sources}
        workspaceDocuments={workspaceDocuments}
        canManage={canManage}
      />
    </div>
  );
}
