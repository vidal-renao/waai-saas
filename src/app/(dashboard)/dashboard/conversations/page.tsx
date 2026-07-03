export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { ConversationRepository } from "@/server/repositories/conversation-repository";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  closed: "Closed",
  handoff_required: "Needs Attention",
  archived: "Archived",
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

const CHANNEL_LABELS: Record<string, string> = {
  sandbox: "AI Testing",
  whatsapp: "WhatsApp",
  web: "Web",
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

  const needsAttention = conversations.filter((c) => c.status === "handoff_required");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Inbox</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Customer conversations handled by your AI Employees.
        </p>
      </div>

      {needsAttention.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-yellow-700 bg-yellow-950/20 px-4 py-3">
          <span className="text-yellow-400">⚠</span>
          <p className="text-sm font-medium text-yellow-300">
            {needsAttention.length} conversation{needsAttention.length !== 1 ? "s" : ""} need{needsAttention.length === 1 ? "s" : ""} your attention
          </p>
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-400">No conversations yet.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Go to an AI Employee and open AI Testing to start a test conversation.
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
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-sm font-medium text-white">
                  {conv.title ?? "Conversation"}
                </span>
                <span className="text-xs text-zinc-500">
                  {conv.last_message_at
                    ? `Last message: ${new Date(conv.last_message_at).toLocaleString("de-CH", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : `Started: ${new Date(conv.created_at).toLocaleDateString("de-CH")}`}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                    CHANNEL_BADGES[conv.channel] ?? CHANNEL_BADGES.sandbox
                  }`}
                >
                  {CHANNEL_LABELS[conv.channel] ?? conv.channel}
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
