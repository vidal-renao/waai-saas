export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSandboxConversationUseCase } from "@/server/use-cases/get-sandbox-conversation";
import { LeadRepository } from "@/server/repositories/lead-repository";
import { HandoffRepository } from "@/server/repositories/handoff-repository";
import { ConversationAssignmentRepository } from "@/server/repositories/conversation-assignment-repository";
import { InternalNoteRepository } from "@/server/repositories/internal-note-repository";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { LeadDetailPanel } from "@/features/leads/components/lead-detail-panel";
import { CreateLeadFromConversationButton } from "@/features/leads/components/create-lead-from-conversation-button";
import { ConversationAssignmentPanel } from "@/features/handoff/components/conversation-assignment-panel";
import { HumanResponseWarning } from "@/features/conversations/components/human-response-warning";
import { InternalNotesPanel } from "@/features/conversations/components/internal-notes-panel";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await getSandboxConversationUseCase(supabase, user.id, conversationId);
  if (!data) notFound();

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);

  const { messages, ...conversation } = data;
  const userMessages = messages.filter(
    (m) => m.role === "user" || m.role === "assistant"
  );

  // Load Fase 6 data in parallel
  const [lead, activeHandoff, activeAssignment, notes] = await Promise.all([
    workspaceId
      ? new LeadRepository(supabase).findByConversation(conversationId)
      : null,
    new HandoffRepository(supabase).findActiveByConversation(conversationId),
    new ConversationAssignmentRepository(supabase).findActiveByConversation(conversationId),
    new InternalNoteRepository(supabase).findByConversation(conversationId),
  ]);

  const isHandoffActive = activeHandoff !== null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href="/dashboard/conversations"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← Conversaciones
        </Link>
        <h1 className="mt-2 text-xl font-bold text-white">
          {conversation.title ?? "Conversación"}
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          Canal: {conversation.channel} · Estado: {conversation.status} ·{" "}
          {messages.length} mensajes
        </p>
      </div>

      {/* Handoff warning banner */}
      {isHandoffActive && (
        <div className="mb-4">
          <HumanResponseWarning />
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Chat messages */}
        <div className="flex-1 min-w-0">
          {userMessages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
              <p className="text-zinc-400">Sin mensajes en esta conversación.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {userMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "rounded-br-sm bg-green-600 text-white"
                        : "rounded-bl-sm bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={`mt-1 text-xs ${
                        msg.role === "user" ? "text-green-200" : "text-zinc-500"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar: lead + handoff + notes */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
          {/* Lead panel */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-300">Lead</h3>
              <CreateLeadFromConversationButton
                conversationId={conversationId}
                hasLead={lead !== null}
              />
            </div>
            {lead ? (
              <div className="mt-2">
                <LeadDetailPanel lead={lead} />
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="mt-2 block text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Ver detalle completo →
                </Link>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Sin lead detectado aún.</p>
            )}
          </div>

          {/* Handoff + Assignment panel */}
          <ConversationAssignmentPanel
            conversationId={conversationId}
            activeHandoff={activeHandoff}
            activeAssignment={activeAssignment}
          />

          {/* Internal notes */}
          <InternalNotesPanel
            conversationId={conversationId}
            notes={notes}
          />
        </div>
      </div>
    </div>
  );
}
