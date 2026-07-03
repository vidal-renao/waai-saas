"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WaaiAgent } from "@/types/database";

interface Props {
  agents: WaaiAgent[];
  showMockProvider?: boolean;
}

export function WhatsappConnectionForm({ agents, showMockProvider = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    provider: "meta" as "mock" | "meta",
    displayName: "",
    phoneNumber: "",
    phoneNumberId: "",
    wabaId: "",
    accessToken: "",
    agentId: "" as string | null,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.displayName.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (form.provider === "meta" && !form.phoneNumberId.trim()) {
      setError("El Phone Number ID es obligatorio para Meta Cloud API.");
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
          phoneNumberId: form.phoneNumberId || undefined,
          wabaId: form.wabaId || undefined,
          accessToken: form.accessToken || undefined,
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

      {/* Provider — Mock option only visible in development */}
      {showMockProvider && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="provider" className="text-sm font-medium text-zinc-300">Connection type</label>
          <select
            id="provider"
            value={form.provider}
            onChange={(e) =>
              setForm((p) => ({ ...p, provider: e.target.value as "mock" | "meta" }))
            }
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="meta">WhatsApp Business (Official)</option>
            <option value="mock">Mock (dev only)</option>
          </select>
        </div>
      )}

      {/* Display name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">
          Connection name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.displayName}
          onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
          placeholder="e.g. Main Business WhatsApp"
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          required
        />
      </div>

      {/* Phone number */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">Phone number</label>
        <input
          type="text"
          value={form.phoneNumber}
          onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
          placeholder="e.g. 41791234567"
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <p className="text-xs text-zinc-500">Country code without the + symbol.</p>
      </div>

      {/* Meta-specific fields */}
      {form.provider === "meta" && (
        <>
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-xs text-zinc-400 mb-1">
            You&apos;ll find these values in{" "}
            <strong className="text-zinc-300">Meta Business Suite → WhatsApp → API Setup</strong>.
            Need help? Contact our support team and we&apos;ll guide you through it.
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">
              Phone Number ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.phoneNumberId}
              onChange={(e) => setForm((p) => ({ ...p, phoneNumberId: e.target.value }))}
              placeholder="e.g. 123456789012345"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <p className="text-xs text-zinc-500">
              Found in Meta Business Suite under WhatsApp → API Setup.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">
              WhatsApp Business Account ID
            </label>
            <input
              type="text"
              value={form.wabaId}
              onChange={(e) => setForm((p) => ({ ...p, wabaId: e.target.value }))}
              placeholder="e.g. 987654321098765"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">
              Access Token
            </label>
            <input
              type="password"
              value={form.accessToken}
              onChange={(e) => setForm((p) => ({ ...p, accessToken: e.target.value }))}
              placeholder="EAABqq..."
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <p className="text-xs text-zinc-500">
              Your token is encrypted at rest and never shared.
            </p>
          </div>
        </>
      )}

      {/* Agent assignment */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="agentId" className="text-sm font-medium text-zinc-300">AI Employee</label>
        <select
          id="agentId"
          value={form.agentId ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, agentId: e.target.value || null }))}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="">No AI Employee assigned (assign later)</option>
          {activeAgents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {activeAgents.length === 0 && (
          <p className="text-xs text-yellow-400">
            No active AI Employees. Create and activate one first.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
      >
        {loading ? "Connecting…" : "Connect WhatsApp"}
      </button>
    </form>
  );
}
