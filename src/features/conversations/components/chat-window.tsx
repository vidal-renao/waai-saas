"use client";

import { useState, useCallback } from "react";
import { MessageList, type ChatMessage } from "./message-list";
import { MessageInput } from "./message-input";
import { AgentRunMetadata } from "./agent-run-metadata";
import { RagContextPreview } from "@/features/knowledge/components/rag-context-preview";

interface RunInfo {
  id: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  model: string;
  ragUsed?: boolean;
  retrievedChunksCount?: number;
  ragModel?: string;
  ragLatencyMs?: number;
}

interface ChatWindowProps {
  agentId: string;
  agentName: string;
  conversationId: string;
}

export function ChatWindow({ agentId, agentName, conversationId }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<RunInfo | null>(null);

  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || loading) return;

    setInput("");
    setLoading(true);
    setError(null);
    setLastRun(null);

    // Optimistic user message
    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content, created_at: new Date().toISOString() },
    ]);

    try {
      const res = await fetch(`/api/agents/${agentId}/sandbox/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al enviar el mensaje.");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        {
          id: data.userMessage.id,
          role: "user" as const,
          content: data.userMessage.content,
          created_at: data.userMessage.created_at,
        },
        {
          id: data.assistantMessage.id,
          role: "assistant" as const,
          content: data.assistantMessage.content,
          created_at: data.assistantMessage.created_at,
        },
      ]);

      if (data.run) {
        const meta = data.run.metadata ?? {};
        setLastRun({
          ...data.run,
          ragUsed: meta.rag_used === true,
          retrievedChunksCount: typeof meta.retrieved_chunks_count === "number" ? meta.retrieved_chunks_count : undefined,
          ragModel: typeof meta.rag_model === "string" ? meta.rag_model : undefined,
          ragLatencyMs: typeof meta.rag_latency_ms === "number" ? meta.rag_latency_ms : undefined,
        });
      }
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setLoading(false);
    }
  }, [agentId, conversationId, input, loading]);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 14rem)" }}>
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-700">
          <span className="text-xs font-bold text-white">
            {agentName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-white">{agentName}</p>
          <p className="text-xs text-zinc-500">Modo sandbox · Solo para pruebas</p>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} loading={loading} />

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-red-800 bg-red-950/30 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Last run metadata */}
      {lastRun && (
        <div className="mx-4 mb-2 flex flex-col gap-1">
          <AgentRunMetadata
            inputTokens={lastRun.inputTokens}
            outputTokens={lastRun.outputTokens}
            latencyMs={lastRun.latencyMs}
            model={lastRun.model}
          />
          <RagContextPreview
            ragUsed={lastRun.ragUsed ?? false}
            retrievedChunksCount={lastRun.retrievedChunksCount}
            ragModel={lastRun.ragModel}
            ragLatencyMs={lastRun.ragLatencyMs}
          />
        </div>
      )}

      {/* Input */}
      <MessageInput
        value={input}
        onChange={setInput}
        onSend={sendMessage}
        disabled={loading}
      />
    </div>
  );
}
