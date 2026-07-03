export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAgentBuilderDataUseCase } from "@/server/use-cases/get-agent-builder-data";
import { AgentPromptPreview } from "@/features/agents/components/agent-prompt-preview";
import { RegeneratePromptButton } from "./regenerate-button";

export default async function AgentPromptPage({
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

  const { agent, promptVersions, userRole } = data;
  const canGenerate = ["owner", "admin", "agent_manager"].includes(userRole);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/agents/${agentId}`}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← {agent.name}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">AI Instructions</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Version history of the AI Instructions generated for this employee.
          </p>
        </div>

        {canGenerate && (
          <RegeneratePromptButton agentId={agentId} />
        )}
      </div>

      {promptVersions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-400">No AI Instructions generated yet.</p>
          {canGenerate && (
            <p className="mt-2 text-sm text-zinc-500">
              Click &quot;Generate AI Instructions&quot; to create the first version.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {promptVersions.map((pv) => (
            <div
              key={pv.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <AgentPromptPreview
                prompt={pv.system_prompt}
                version={pv.version}
                isActive={pv.is_active}
              />
              <p className="mt-2 text-xs text-zinc-600">
                Generated:{" "}
                {new Date(pv.created_at).toLocaleString("de-CH", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
