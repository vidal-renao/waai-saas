"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateLeadFromConversationButton({
  conversationId,
  hasLead,
}: {
  conversationId: string;
  hasLead: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  if (hasLead) {
    return (
      <span className="rounded-lg bg-green-950/30 px-3 py-1.5 text-xs font-medium text-green-400 border border-green-900/40">
        Lead creado
      </span>
    );
  }

  async function handleCreate() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/lead`, {
        method: "POST",
      });
      if (res.ok) {
        setMessage("Lead creado.");
        router.refresh();
      } else {
        const d = await res.json() as { error?: string };
        setMessage(d.error ?? "Error al crear lead");
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
        onClick={handleCreate}
        disabled={loading}
        className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear Lead"}
      </button>
      {message && <p className="text-xs text-zinc-400">{message}</p>}
    </div>
  );
}
