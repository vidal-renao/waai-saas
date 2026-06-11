import Link from "next/link";
import type { WaaiConversation } from "@/types/database";

interface ConversationSidebarProps {
  conversations: WaaiConversation[];
  activeConversationId?: string;
  agentId: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-500",
  closed: "bg-zinc-500",
  handoff_required: "bg-yellow-500",
  archived: "bg-zinc-700",
};

export function ConversationSidebar({
  conversations,
  activeConversationId,
  agentId,
}: ConversationSidebarProps) {
  if (conversations.length === 0) {
    return (
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-4">
        <p className="text-xs uppercase tracking-wider text-zinc-600">
          Conversaciones
        </p>
        <p className="mt-4 text-xs text-zinc-600">Sin conversaciones previas.</p>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="px-4 py-3">
        <p className="text-xs uppercase tracking-wider text-zinc-600">
          Conversaciones
        </p>
      </div>
      <div className="flex flex-col overflow-y-auto">
        {conversations.map((conv) => (
          <Link
            key={conv.id}
            href={`/dashboard/agents/${agentId}/sandbox`}
            className={`flex flex-col gap-1 border-b border-zinc-800 px-4 py-3 transition-colors hover:bg-zinc-900 ${
              conv.id === activeConversationId ? "bg-zinc-900" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${STATUS_COLORS[conv.status] ?? "bg-zinc-500"}`}
              />
              <span className="truncate text-sm text-zinc-300">
                {conv.title ?? "Conversación"}
              </span>
            </div>
            <span className="text-xs text-zinc-600">
              {conv.last_message_at
                ? new Date(conv.last_message_at).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : new Date(conv.created_at).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                  })}
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
