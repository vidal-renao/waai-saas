"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegeneratePromptButton({ agentId }: { agentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRegenerate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/prompt`, {
        method: "POST",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to generate AI Instructions. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRegenerate}
        disabled={loading}
        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Generating..." : "Generate AI Instructions"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
