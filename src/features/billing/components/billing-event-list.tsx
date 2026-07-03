import type { WaaiBillingEvent } from "@/types/database";

interface BillingEventListProps {
  events: WaaiBillingEvent[];
}

const STATUS_COLORS: Record<string, string> = {
  received:  "text-zinc-400",
  processed: "text-green-400",
  failed:    "text-red-400",
  ignored:   "text-zinc-600",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function BillingEventList({ events }: BillingEventListProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center">
        <p className="text-xs text-zinc-500">No billing events recorded yet.</p>
        <p className="text-xs text-zinc-600 mt-1">
          Events will appear here once Stripe is activated.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="divide-y divide-zinc-800">
        {events.map((ev) => (
          <div key={ev.id} className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white capitalize">
                {ev.event_type.replace(/_/g, " ")}
              </p>
              <p className="text-xs text-zinc-500">
                {ev.provider ?? "system"} · {formatDate(ev.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              {ev.amount_cents !== null && (
                <span className="text-sm font-mono text-zinc-300">
                  {ev.currency ?? "CHF"} {(ev.amount_cents / 100).toFixed(2)}
                </span>
              )}
              <span className={`text-xs font-medium ${STATUS_COLORS[ev.status] ?? "text-zinc-400"}`}>
                {ev.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
