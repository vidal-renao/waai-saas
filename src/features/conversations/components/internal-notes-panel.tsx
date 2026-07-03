"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WaaiInternalNote } from "@/types/database";

export function InternalNotesPanel({
  conversationId,
  notes,
}: {
  conversationId: string;
  notes: WaaiInternalNote[];
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: text }),
      });
      if (res.ok) {
        setText("");
        router.refresh();
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to save note");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-300">Internal Notes</h3>
      <p className="mb-3 text-xs text-zinc-500">Visible only to workspace members. Never sent to the customer.</p>

      {notes.length === 0 ? (
        <p className="mb-4 text-xs text-zinc-600">No notes yet.</p>
      ) : (
        <div className="mb-4 flex flex-col gap-2">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg bg-zinc-800 px-3 py-2.5">
              <p className="text-sm text-zinc-200 whitespace-pre-wrap">{note.note}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {new Date(note.created_at).toLocaleString("de-CH", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add internal note..."
          maxLength={2000}
          rows={3}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="self-end rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Note"}
        </button>
      </form>
    </div>
  );
}
