"use client";

import { useState } from "react";

export function LeadAssignmentPanel({
  leadId,
  currentAssignedTo,
}: {
  leadId: string;
  currentAssignedTo: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUnassign() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: null }),
      });
      if (res.ok) {
        setMessage("Lead desasignado.");
      } else {
        const d = await res.json() as { error?: string };
        setMessage(d.error ?? "Error");
      }
    } catch {
      setMessage("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h4 className="mb-3 text-sm font-medium text-zinc-300">Asignación</h4>
      {currentAssignedTo ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-400">Asignado</p>
          <button
            onClick={handleUnassign}
            disabled={loading}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          >
            Desasignar
          </button>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Sin asignar</p>
      )}
      {message && <p className="mt-2 text-xs text-zinc-400">{message}</p>}
    </div>
  );
}
