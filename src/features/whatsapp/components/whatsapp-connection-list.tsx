import Link from "next/link";
import type { WaaiWhatsappConnection } from "@/types/database";
import { WhatsappConnectionCard } from "./whatsapp-connection-card";

export function WhatsappConnectionList({
  connections,
  canCreate,
}: {
  connections: WaaiWhatsappConnection[];
  canCreate: boolean;
}) {
  if (connections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-400">No WhatsApp connections yet.</p>
        {canCreate ? (
          <p className="mt-2 text-sm text-zinc-500">
            <Link
              href="/dashboard/whatsapp/new"
              className="text-green-400 hover:text-green-300 underline"
            >
              Create your first connection
            </Link>{" "}
            to connect your WhatsApp number.
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            Your plan does not include WhatsApp connections. Upgrade your plan.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {connections.map((conn) => (
        <WhatsappConnectionCard key={conn.id} connection={conn} />
      ))}
    </div>
  );
}
