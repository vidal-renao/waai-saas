import type { WaaiLead } from "@/types/database";
import { LeadCard } from "./lead-card";
import Link from "next/link";

export function LeadList({ leads }: { leads: WaaiLead[] }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-400">No hay leads todavía.</p>
        <p className="mt-2 text-sm text-zinc-500">
          Los leads se crean automáticamente cuando el agente detecta intención comercial, o puedes crearlos manualmente desde una conversación.
        </p>
        <Link
          href="/dashboard/conversations"
          className="mt-4 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Ver conversaciones
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
