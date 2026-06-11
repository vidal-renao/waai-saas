interface ResourceRow {
  label: string;
  used: number;
  limit: number;
}

interface PlanUsageSummaryProps {
  messagesSent: number;
  messagesLimit: number;
  agentsCreated: number;
  agentsLimit: number;
  documentsUploaded: number;
  documentsLimit: number;
  whatsappConnections: number;
  whatsappConnectionsLimit: number;
  membersCount: number;
}

function limitLabel(limit: number): string {
  return limit === -1 ? "∞" : String(limit);
}

function pctColor(used: number, limit: number): string {
  if (limit === -1) return "bg-green-600";
  const p = limit === 0 ? 100 : Math.round((used / limit) * 100);
  if (p >= 95) return "bg-red-500";
  if (p >= 80) return "bg-yellow-500";
  return "bg-green-600";
}

function pctValue(used: number, limit: number): number {
  if (limit === -1 || limit === 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function ResourceBar({ label, used, limit }: ResourceRow) {
  const color = pctColor(used, limit);
  const pct = pctValue(used, limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-xs font-mono text-zinc-300">
          {used} / {limitLabel(limit)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-700 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PlanUsageSummary({
  messagesSent,
  messagesLimit,
  agentsCreated,
  agentsLimit,
  documentsUploaded,
  documentsLimit,
  whatsappConnections,
  whatsappConnectionsLimit,
  membersCount,
}: PlanUsageSummaryProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Uso actual del plan</h3>
      <div className="space-y-4">
        <ResourceBar label="Mensajes este mes" used={messagesSent} limit={messagesLimit} />
        <ResourceBar label="Agentes activos" used={agentsCreated} limit={agentsLimit} />
        <ResourceBar label="Documentos Knowledge" used={documentsUploaded} limit={documentsLimit} />
        <ResourceBar label="Conexiones WhatsApp" used={whatsappConnections} limit={whatsappConnectionsLimit} />
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
          <span className="text-xs text-zinc-400">Miembros del workspace</span>
          <span className="text-xs font-mono text-zinc-300">{membersCount}</span>
        </div>
      </div>
    </div>
  );
}
