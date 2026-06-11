import type { WaaiWhatsappConnectionStatus } from "@/types/database";

const CONFIG: Record<
  WaaiWhatsappConnectionStatus,
  { label: string; className: string }
> = {
  draft:                { label: "Borrador",       className: "text-zinc-400 bg-zinc-800 border-zinc-700" },
  pending_verification: { label: "Verificando",    className: "text-yellow-400 bg-yellow-950/30 border-yellow-900/50" },
  active:               { label: "Activa",         className: "text-green-400 bg-green-950/30 border-green-900/50" },
  failed:               { label: "Error",          className: "text-red-400 bg-red-950/30 border-red-900/50" },
  suspended:            { label: "Suspendida",     className: "text-orange-400 bg-orange-950/30 border-orange-900/50" },
  disconnected:         { label: "Desconectada",   className: "text-zinc-400 bg-zinc-800 border-zinc-700" },
  archived:             { label: "Archivada",      className: "text-zinc-600 bg-zinc-900 border-zinc-800" },
};

export function WhatsappStatusBadge({
  status,
}: {
  status: WaaiWhatsappConnectionStatus;
}) {
  const { label, className } = CONFIG[status] ?? CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
