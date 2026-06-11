"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HandoffResolveButton({
  conversationId,
  handoffId,
}: {
  conversationId: string;
  handoffId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleResolve() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/handoff/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handoffId }),
        }
      );
      if (res.ok) {
        setMessage("Handoff resuelto. Automatización reanudada.");
        router.refresh();
      } else {
        const d = await res.json() as { error?: string };
        setMessage(d.error ?? "Error al resolver handoff");
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
        onClick={handleResolve}
        disabled={loading}
        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
      >
        {loading ? "Resolviendo..." : "Resolver Handoff"}
      </button>
      {message && <p className="mt-1 text-xs text-zinc-400">{message}</p>}
    </div>
  );
}
