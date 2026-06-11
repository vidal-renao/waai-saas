export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAgentBuilderDataUseCase } from "@/server/use-cases/get-agent-builder-data";
import { startSandboxConversationUseCase } from "@/server/use-cases/start-sandbox-conversation";
import { AgentKnowledgeSourceRepository } from "@/server/repositories/agent-knowledge-source-repository";
import { ChatWindow } from "@/features/conversations/components/chat-window";

export default async function AgentSandboxPage({
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

  const { agent, activePrompt, userRole } = data;

  const canUseSandbox = ["owner", "admin", "agent_manager", "human_agent"].includes(userRole);
  if (!canUseSandbox) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-400">No tienes permisos para usar el sandbox.</p>
        </div>
      </div>
    );
  }

  // Check API key server-side (never expose to client)
  const apiKeyConfigured = !!process.env.ANTHROPIC_API_KEY;
  const ragConfigured = !!process.env.OPENAI_API_KEY;

  // Check linked knowledge sources
  const kbRepo = new AgentKnowledgeSourceRepository(supabase);
  const kbSources = await kbRepo.findByAgent(agentId);
  const linkedKbCount = kbSources.length;

  // Start conversation server-side so the client has a conversationId immediately
  const startResult = await startSandboxConversationUseCase(
    supabase,
    user.id,
    agentId
  );

  const conversationId =
    "conversationId" in startResult ? startResult.conversationId : null;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/agents/${agentId}`}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← {agent.name}
          </Link>
          <h1 className="mt-1 text-xl font-bold text-white">
            Sandbox · Modo prueba
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-yellow-800 bg-yellow-950/30 px-3 py-1 text-xs font-medium text-yellow-400">
            Solo pruebas — no es WhatsApp real
          </span>
          {linkedKbCount > 0 && ragConfigured && (
            <span className="rounded-full border border-blue-900/50 bg-blue-950/20 px-3 py-1 text-xs font-medium text-blue-400">
              RAG activo · {linkedKbCount} doc{linkedKbCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Warnings */}
      {!apiKeyConfigured && (
        <div className="mb-4 rounded-xl border border-red-800 bg-red-950/20 p-4 text-sm text-red-400">
          <strong>Sin API key:</strong> La variable{" "}
          <code className="rounded bg-red-950/40 px-1">ANTHROPIC_API_KEY</code>{" "}
          no está configurada. El sandbox no puede procesar mensajes.
        </div>
      )}

      {!activePrompt && (
        <div className="mb-4 rounded-xl border border-yellow-800 bg-yellow-950/20 p-4 text-sm text-yellow-400">
          <strong>Sin prompt activo:</strong> Este agente no tiene un system
          prompt generado.{" "}
          <Link
            href={`/dashboard/agents/${agentId}/prompt`}
            className="underline hover:text-yellow-300"
          >
            Genera uno primero
          </Link>
          .
        </div>
      )}

      {!conversationId && (
        <div className="mb-4 rounded-xl border border-red-800 bg-red-950/20 p-4 text-sm text-red-400">
          No se pudo iniciar la conversación. Recarga la página para intentarlo de nuevo.
        </div>
      )}

      {/* Chat */}
      {conversationId ? (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <ChatWindow
            agentId={agentId}
            agentName={agent.name}
            conversationId={conversationId}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-400">No se pudo iniciar la conversación.</p>
        </div>
      )}

      <p className="mt-3 text-center text-xs text-zinc-600">
        Los mensajes de sandbox se guardan con fines de auditoría.
        Cada mensaje consume cuota del plan.
      </p>
    </div>
  );
}
