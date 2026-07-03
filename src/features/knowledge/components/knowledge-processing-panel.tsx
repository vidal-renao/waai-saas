"use client";

import { useState } from "react";
import type { WaaiKnowledgeDocumentStatus } from "@/types/database";

interface KnowledgeProcessingPanelProps {
  documentId: string;
  status: WaaiKnowledgeDocumentStatus;
  errorMessage?: string | null;
  chunkCount?: number;
}

export function KnowledgeProcessingPanel({
  documentId,
  status,
  errorMessage,
  chunkCount,
}: KnowledgeProcessingPanelProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentChunks, setCurrentChunks] = useState(chunkCount ?? 0);

  const canProcess = currentStatus === "draft" || currentStatus === "failed";

  async function handleProcess() {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge/documents/${documentId}/process`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to process document. Please try again.");
      } else {
        setCurrentStatus("ready");
        setCurrentChunks(data.chunksCount ?? 0);
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {currentStatus === "ready" && (
        <div className="rounded-lg border border-green-900/40 bg-green-950/20 p-3 text-sm text-green-400">
          Document indexed · {currentChunks} knowledge chunk{currentChunks !== 1 ? "s" : ""} ready.
        </div>
      )}

      {currentStatus === "failed" && (errorMessage || error) && (
        <div className="rounded-lg border border-red-800 bg-red-950/20 p-3 text-sm text-red-400">
          Indexing error: {errorMessage ?? error}
        </div>
      )}

      {error && currentStatus !== "failed" && (
        <div className="rounded-lg border border-red-800 bg-red-950/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {processing && (
        <div className="rounded-lg border border-yellow-800 bg-yellow-950/20 p-3 text-sm text-yellow-400">
          Indexing document — extracting text and building knowledge chunks…
        </div>
      )}

      {canProcess && (
        <button
          onClick={handleProcess}
          disabled={processing}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
        >
          {processing ? "Indexing…" : currentStatus === "failed" ? "Retry Indexing" : "Index Document"}
        </button>
      )}
    </div>
  );
}
