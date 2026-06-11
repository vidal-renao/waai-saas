export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { ConversationRepository } from "@/server/repositories/conversation-repository";

const STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  closed: "Cerrada",
  handoff_required: "Handoff",
  archived: "Archivada",
};

const STATUS_COLORS: Record<string, string> = {
  open: "text-green-400 bg-green-950/30 border-green-900/50",
  closed: "text-zinc-400 bg-zinc-800 border-zinc-700",
  handoff_required: "text-yellow-400 bg-yellow-950/30 border-yellow-900/50",
  archived: "text-zinc-600 bg-zinc-900 border-zinc-800",
};

const CHANNEL_BADGES: Record<string, string> = {
  sandbox:  "text-zinc-400 bg-zinc-800 border-zinc-700",
  whatsapp: "text-green-400 bg-green-950/20 border-green-900/40",
  web:      "text-blue-400 bg-blue-950/20 border-blue-900/40",
};

export default async function ConversationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) redirect("/onboarding");

  const convRepo = new ConversationRepository(supabase);
  const conversations = await convRepo.findByWorkspace(workspaceId, 50);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Conversaciones</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Historial de conversaciones de sandbox y futuras integraciones.
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-400">No hay conversaciones todavía.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Ve a un agente y abre el sandbox para iniciar una conversación de prueba.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/dashboard/conversations/${conv.id}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="truncate text-sm font-medium text-white">
                  {conv.title ?? "Conversación"}
                </span>
                <span className="text-xs text-zinc-500">
                  {conv.last_message_at
                    ? `Último mensaje: ${new Date(conv.last_message_at).toLocaleString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : `Creada: ${new Date(conv.created_at).toLocaleDateString("es-ES")}`}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                    CHANNEL_BADGES[conv.channel] ?? CHANNEL_BADGES.sandbox
                  }`}
                >
                  {conv.channel}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[conv.status] ?? STATUS_COLORS.closed
                  }`}
                >
                  {STATUS_LABELS[conv.status] ?? conv.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
