"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HandoffRequestButton({
  conversationId,
}: {
  conversationId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleRequest() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/handoff/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ triggerType: "manual" }),
        }
      );
      if (res.ok) {
        setMessage("Handoff solicitado. Automatización pausada.");
        router.refresh();
      } else {
        const d = await res.json() as { error?: string };
        setMessage(d.error ?? "Error al solicitar handoff");
      }
    } catch {
      setMessage("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleRequest}
        disabled={loading}
        className="rounded-lg bg-yellow-700 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
      >
        {loading ? "Solicitando..." : "Solicitar Handoff"}
      </button>
      {message && <p className="mt-1 text-xs text-zinc-400">{message}</p>}
    </div>
  );
}
