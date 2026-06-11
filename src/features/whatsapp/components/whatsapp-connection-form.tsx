"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WaaiAgent } from "@/types/database";

interface Props {
  agents: WaaiAgent[];
}

export function WhatsappConnectionForm({ agents }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    provider: "whapi" as "mock" | "whapi",
    displayName: "",
    phoneNumber: "",
    externalInstanceId: "",
    agentId: "" as string | null,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.displayName.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/whatsapp/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: form.provider,
          displayName: form.displayName,
          phoneNumber: form.phoneNumber || undefined,
          externalInstanceId: form.externalInstanceId || undefined,
          agentId: form.agentId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al crear la conexión.");
        return;
      }
      router.push(`/dashboard/whatsapp/${data.id}`);
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  const activeAgents = agents.filter((a) => a.status === "active");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Provider */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">Provider</label>
        <select
          value={form.provider}
          onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value as "mock" | "whapi" }))}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="whapi">Whapi.cloud (MVP)</option>
          <option value="mock">Mock (desarrollo local)</option>
        </select>
      </div>

      {/* Display name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">
          Nombre de la conexión <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.displayName}
          onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
          placeholder="Ej: WhatsApp Negocio Principal"
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          required
        />
      </div>

      {/* Phone number */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">
          Número de WhatsApp
        </label>
        <input
          type="text"
          value={form.phoneNumber}
          onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
          placeholder="Ej: 34612345678"
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <p className="text-xs text-zinc-500">Sin el símbolo +, solo dígitos.</p>
      </div>

      {/* Instance ID (Whapi channel ID) */}
      {form.provider === "whapi" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">
            Whapi Channel ID
          </label>
          <input
            type="text"
            value={form.externalInstanceId}
            onChange={(e) => setForm((p) => ({ ...p, externalInstanceId: e.target.value }))}
            placeholder="Ej: abc123-channel-id"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <p className="text-xs text-zinc-500">
            Encuéntralo en tu dashboard de Whapi.cloud → Canal → Detalles.
          </p>
        </div>
      )}

      {/* Agent assignment */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">
          Agente asignado
        </label>
        <select
          value={form.agentId ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, agentId: e.target.value || null }))}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="">Sin agente (asignar después)</option>
          {activeAgents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {activeAgents.length === 0 && (
          <p className="text-xs text-yellow-400">
            No hay agentes activos. Crea y activa un agente primero.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
      >
        {loading ? "Creando…" : "Crear conexión"}
      </button>
    </form>
  );
}
