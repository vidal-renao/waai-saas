interface ChannelUsageCardProps {
  whatsapp: number;
  sandbox: number;
  web: number;
  label?: string;
}

export function ChannelUsageCard({ whatsapp, sandbox, web, label = "Conversaciones por canal" }: ChannelUsageCardProps) {
  const total = whatsapp + sandbox + web;

  const channels = [
    { name: "WhatsApp", count: whatsapp, color: "bg-green-500" },
    { name: "Sandbox", count: sandbox, color: "bg-blue-500" },
    { name: "Web", count: web, color: "bg-purple-500" },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-300">{label}</h3>
      {total === 0 ? (
        <p className="text-xs text-zinc-500">Sin datos en el período seleccionado.</p>
      ) : (
        <div className="space-y-3">
          {channels.map(({ name, count, color }) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-400">{name}</span>
                  <span className="text-zinc-300 font-medium">{count} ({pct}%)</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800">
                  <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
