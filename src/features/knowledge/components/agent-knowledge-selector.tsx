"use client";

import { useState } from "react";
import Link from "next/link";
import { KnowledgeStatusBadge } from "./knowledge-status-badge";
import type { WaaiKnowledgeDocument, WaaiAgentKnowledgeSource } from "@/types/database";

interface AgentKnowledgeSelectorProps {
  agentId: string;
  sources: WaaiAgentKnowledgeSource[];
  workspaceDocuments: WaaiKnowledgeDocument[];
  canManage: boolean;
}

export function AgentKnowledgeSelector({
  agentId,
  sources,
  workspaceDocuments,
  canManage,
}: AgentKnowledgeSelectorProps) {
  const [linkedIds, setLinkedIds] = useState<Set<string>>(
    new Set(sources.filter((s) => s.is_active).map((s) => s.document_id))
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const readyDocs = workspaceDocuments.filter((d) => d.status === "ready");

  async function toggle(documentId: string) {
    if (!canManage || loadingId) return;
    const isLinked = linkedIds.has(documentId);
    setLoadingId(documentId);
    setErrorId(null);

    try {
      const endpoint = isLinked ? "unlink" : "link";
      const res = await fetch(`/api/agents/${agentId}/knowledge/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorId(data.error ?? "Error al cambiar vínculo.");
      } else {
        setLinkedIds((prev) => {
          const next = new Set(prev);
          if (isLinked) next.delete(documentId);
          else next.add(documentId);
          return next;
        });
      }
    } catch {
      setErrorId("Error de conexión.");
    } finally {
      setLoadingId(null);
    }
  }

  if (readyDocs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center">
        <p className="text-sm text-zinc-400">
          No hay documentos listos para vincular.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Crea y procesa documentos en{" "}
          <Link href="/dashboard/knowledge" className="text-green-400 hover:text-green-300 underline">
            Knowledge Base
          </Link>{" "}
          primero.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {errorId && (
        <div className="rounded-lg border border-red-800 bg-red-950/20 p-3 text-sm text-red-400">
          {errorId}
        </div>
      )}
      {readyDocs.map((doc) => {
        const isLinked = linkedIds.has(doc.id);
        const isLoading = loadingId === doc.id;
        return (
          <div
            key={doc.id}
            className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors ${
              isLinked
                ? "border-green-900/50 bg-green-950/10"
                : "border-zinc-800 bg-zinc-900"
            }`}
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-white">{doc.title}</span>
              <span className="text-xs text-zinc-500">
                {doc.source_type.toUpperCase()} ·{" "}
                {doc.text_content
                  ? `${doc.text_content.length.toLocaleString()} chars`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <KnowledgeStatusBadge status={doc.status} />
              {canManage && (
                <button
                  onClick={() => toggle(doc.id)}
                  disabled={isLoading}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    isLinked
                      ? "border-red-800 bg-red-950/20 text-red-400 hover:bg-red-900/30"
                      : "border-green-800 bg-green-950/20 text-green-400 hover:bg-green-900/30"
                  }`}
                >
                  {isLoading ? "…" : isLinked ? "Desvincular" : "Vincular"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
