import type { WaaiConversationAssignment, WaaiHandoff } from "@/types/database";
import { HandoffStatusBadge } from "./handoff-status-badge";
import { HandoffRequestButton } from "./handoff-request-button";
import { HandoffResolveButton } from "./handoff-resolve-button";

export function ConversationAssignmentPanel({
  conversationId,
  activeHandoff,
  activeAssignment,
}: {
  conversationId: string;
  activeHandoff: WaaiHandoff | null;
  activeAssignment: WaaiConversationAssignment | null;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-300">Control de Automatización</h3>

      {/* Handoff section */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs font-medium text-zinc-400">Handoff</p>
          {activeHandoff && <HandoffStatusBadge status={activeHandoff.status} />}
        </div>

        {activeHandoff ? (
          <div className="space-y-2">
            <div className="rounded-lg bg-yellow-950/20 border border-yellow-900/40 px-3 py-2">
              <p className="text-xs font-medium text-yellow-400">Automatización pausada</p>
              {activeHandoff.reason && (
                <p className="mt-0.5 text-xs text-yellow-300/70">{activeHandoff.reason}</p>
              )}
            </div>
            <HandoffResolveButton
              conversationId={conversationId}
              handoffId={activeHandoff.id}
            />
          </div>
        ) : (
          <HandoffRequestButton conversationId={conversationId} />
        )}
      </div>

      {/* Assignment section */}
      <div className="border-t border-zinc-800 pt-4">
        <p className="text-xs font-medium text-zinc-400 mb-2">Asignación</p>
        {activeAssignment ? (
          <p className="text-xs text-zinc-400">
            Asignada · {new Date(activeAssignment.created_at).toLocaleDateString("es-ES")}
          </p>
        ) : (
          <p className="text-xs text-zinc-500">Sin asignar</p>
        )}
      </div>
    </div>
  );
}
