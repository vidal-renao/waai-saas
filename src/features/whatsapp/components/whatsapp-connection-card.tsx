import Link from "next/link";
import type { WaaiWhatsappConnection } from "@/types/database";
import { WhatsappStatusBadge } from "./whatsapp-status-badge";
import { WhatsappProviderBadge } from "./whatsapp-provider-badge";

export function WhatsappConnectionCard({
  connection,
}: {
  connection: WaaiWhatsappConnection;
}) {
  return (
    <Link
      href={`/dashboard/whatsapp/${connection.id}`}
      className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium text-white">
          {connection.display_name ?? "WhatsApp Connection"}
        </span>
        <span className="text-xs text-zinc-500">
          {connection.phone_number
            ? `+${connection.phone_number}`
            : "No number configured"}{" "}
          · {connection.provider}
        </span>
        {connection.last_error_message && (
          <span className="truncate text-xs text-red-400">
            {connection.last_error_message}
          </span>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <WhatsappProviderBadge provider={connection.provider} />
        <WhatsappStatusBadge status={connection.status} />
      </div>
    </Link>
  );
}
