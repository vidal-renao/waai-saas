"use client";

import { useState } from "react";

interface Props {
  connectionId: string;
  agentAssigned: boolean;
  agentActive: boolean;
}

export function WhatsappTestPanel({
  connectionId,
  agentAssigned,
  agentActive,
}: Props) {
  const [fromNumber, setFromNumber] = useState("41790000001");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    errorMessage?: string;
    eventId?: string;
  } | null>(null);

  const canSimulate = agentAssigned && agentActive;

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/whatsapp/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, fromNumber, text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, errorMessage: data.error ?? "Simulation failed. Please try again." });
      } else {
        setResult(data);
      }
    } catch {
      setResult({ success: false, errorMessage: "Connection error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs uppercase tracking-wider text-zinc-500">
        Message Simulator
      </p>

      {!agentAssigned && (
        <div className="rounded-lg border border-yellow-800 bg-yellow-950/20 p-3 text-sm text-yellow-400">
          Assign an AI Employee to this connection before simulating messages.
        </div>
      )}

      {agentAssigned && !agentActive && (
        <div className="rounded-lg border border-yellow-800 bg-yellow-950/20 p-3 text-sm text-yellow-400">
          The assigned AI Employee is not active. Activate them first.
        </div>
      )}

      <form onSubmit={handleSimulate} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">
            Sender number (simulated)
          </label>
          <input
            type="text"
            value={fromNumber}
            onChange={(e) => setFromNumber(e.target.value)}
            disabled={!canSimulate}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">Message</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!canSimulate}
            rows={3}
            placeholder="Type the message a customer would send..."
            className="resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={!canSimulate || loading || !text.trim()}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? "Processing…" : "Send Test Message"}
        </button>
      </form>

      {result && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            result.success
              ? "border-green-800 bg-green-950/20 text-green-400"
              : "border-red-800 bg-red-950/20 text-red-400"
          }`}
        >
          {result.success ? (
            <>
              Message processed successfully.{" "}
              {result.eventId && (
                <span className="text-xs opacity-70">Event: {result.eventId.substring(0, 8)}…</span>
              )}
            </>
          ) : (
            <>Error: {result.errorMessage ?? "Unknown error."}</>
          )}
        </div>
      )}
    </div>
  );
}
