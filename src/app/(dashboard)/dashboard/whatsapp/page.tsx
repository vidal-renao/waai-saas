export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listWhatsappConnectionsUseCase } from "@/server/use-cases/list-whatsapp-connections";
import { WhatsappConnectionList } from "@/features/whatsapp/components/whatsapp-connection-list";

export default async function WhatsappPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await listWhatsappConnectionsUseCase(supabase, user.id);
  if (!data) redirect("/onboarding");

  const { connections, canCreate, connectionCount } = data;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">WhatsApp</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {connectionCount} conexión{connectionCount !== 1 ? "es" : ""} activa
            {connectionCount !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/whatsapp/new"
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
          >
            + Nueva conexión
          </Link>
        )}
        {!canCreate && connections.length === 0 && (
          <span className="rounded-full border border-yellow-800 bg-yellow-950/20 px-3 py-1 text-xs text-yellow-400">
            Límite del plan alcanzado
          </span>
        )}
      </div>

      <WhatsappConnectionList connections={connections} canCreate={canCreate} />

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="text-xs font-medium text-zinc-400 mb-3">¿Cómo funciona?</p>
        <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
          <li>Crea una conexión y asigna un agente.</li>
          <li>Copia la URL del webhook y configúrala en Whapi.cloud.</li>
          <li>Usa el simulador para probar sin necesidad de WhatsApp real.</li>
          <li>Cuando todo funcione, activa la conexión y recibe mensajes reales.</li>
        </ol>
      </div>
    </div>
  );
}
