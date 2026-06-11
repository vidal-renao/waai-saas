interface ErrorEventsCardProps {
  claudeErrors: number;
  whatsappFailed: number;
  docsFailed: number;
  period?: string;
}

export function ErrorEventsCard({ claudeErrors, whatsappFailed, docsFailed, period = "últimas 24h" }: ErrorEventsCardProps) {
  const total = claudeErrors + whatsappFailed + docsFailed;

  return (
    <div className={`rounded-xl border p-5 ${total > 0 ? "border-red-900 bg-red-950/10" : "border-zinc-800 bg-zinc-900"}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300">Errores recientes</h3>
        <span className="text-xs text-zinc-500">{period}</span>
      </div>
      {total === 0 ? (
        <p className="text-xs text-zinc-500">Sin errores en el período.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Errores Claude</span>
            <span className={`font-medium ${claudeErrors > 0 ? "text-red-400" : "text-zinc-500"}`}>
              {claudeErrors}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Envíos WhatsApp fallidos</span>
            <span className={`font-medium ${whatsappFailed > 0 ? "text-red-400" : "text-zinc-500"}`}>
              {whatsappFailed}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Documentos fallidos</span>
            <span className={`font-medium ${docsFailed > 0 ? "text-yellow-400" : "text-zinc-500"}`}>
              {docsFailed}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
