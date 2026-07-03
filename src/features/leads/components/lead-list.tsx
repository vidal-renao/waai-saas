import type { WaaiLead } from "@/types/database";
import { LeadCard } from "./lead-card";
import Link from "next/link";

export function LeadList({ leads }: { leads: WaaiLead[] }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-400">No leads yet.</p>
        <p className="mt-2 text-sm text-zinc-500">
          Leads are created automatically when your AI Employee detects purchase intent, or you can create them manually from a conversation.
        </p>
        <Link
          href="/dashboard/conversations"
          className="mt-4 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          View Inbox
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {leads.map((lead) => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
