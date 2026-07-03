export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAgentBuilderDataUseCase } from "@/server/use-cases/get-agent-builder-data";
import { AgentStatusBadge } from "@/features/agents/components/agent-status-badge";
import { AgentPromptPreview } from "@/features/agents/components/agent-prompt-preview";
import { AgentTestCta } from "@/features/agents/components/agent-test-cta";
import { AgentKnowledgeCta } from "@/features/knowledge/components/agent-knowledge-cta";
import { AgentKnowledgeSourceRepository } from "@/server/repositories/agent-knowledge-source-repository";
import type { WaaiAgentStatus } from "@/types/database";

export default async function AgentDetailPage({
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

  const { agent, config, activePrompt, userRole } = data;

  const canEdit = ["owner", "admin", "agent_manager"].includes(userRole);
  const canArchive = ["owner", "admin"].includes(userRole);

  const kbRepo = new AgentKnowledgeSourceRepository(supabase);
  const kbSources = await kbRepo.findByAgent(agentId);
  const linkedCount = kbSources.length;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/agents"
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              ← AI Employees
            </Link>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
            <AgentStatusBadge status={agent.status as WaaiAgentStatus} />
          </div>
          <p className="text-sm text-zinc-400">
            Channel: {agent.channel} · Language: {agent.primary_language.toUpperCase()}
          </p>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <Link
              href={`/dashboard/agents/${agent.id}/edit`}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
            >
              Edit Configuration
            </Link>
            <Link
              href={`/dashboard/agents/${agent.id}/prompt`}
              className="rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
            >
              AI Instructions
            </Link>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Business config */}
        {config && (
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Business Configuration
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Business" value={config.business_name} />
              <Row label="Industry" value={config.industry} />
              <Row label="Goal" value={config.primary_goal} />
              <Row label="Tone" value={config.tone} />
              {config.country && <Row label="Country" value={config.country} />}
              {config.city && <Row label="City" value={config.city} />}
            </div>
          </div>
        )}

        {/* Active prompt */}
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            AI Instructions (active)
          </p>
          {activePrompt ? (
            <AgentPromptPreview
              prompt={activePrompt.system_prompt}
              version={activePrompt.version}
              isActive
            />
          ) : (
            <p className="text-sm text-zinc-500">
              No AI Instructions generated yet.
              {canEdit && (
                <Link
                  href={`/dashboard/agents/${agent.id}/prompt`}
                  className="ml-1 text-green-400 hover:text-green-300"
                >
                  Generate now
                </Link>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Test CTA */}
      <div className="mt-6">
        <AgentTestCta agentId={agent.id} hasActivePrompt={!!activePrompt} />
      </div>

      {/* Knowledge CTA */}
      <div className="mt-4">
        <AgentKnowledgeCta agentId={agent.id} linkedCount={linkedCount} />
      </div>

      {/* Danger zone */}
      {canArchive && agent.status !== "archived" && (
        <div className="mt-8 rounded-xl border border-red-900/40 bg-zinc-900 p-5">
          <p className="text-sm font-medium text-red-400">Danger Zone</p>
          <p className="mt-1 text-xs text-zinc-500">
            Archiving this AI Employee will deactivate them. They won&apos;t be permanently deleted.
          </p>
          <ArchiveButton agentId={agent.id} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 flex-shrink-0 text-zinc-500">{label}</span>
      <span className="capitalize text-zinc-200">{value}</span>
    </div>
  );
}

function ArchiveButton({ agentId }: { agentId: string }) {
  return (
    <form
      action={`/api/agents/${agentId}/archive`}
      method="POST"
      className="mt-3"
    >
      <button
        type="submit"
        className="rounded-lg border border-red-800 bg-red-900/20 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/40"
      >
        Archive AI Employee
      </button>
    </form>
  );
}
