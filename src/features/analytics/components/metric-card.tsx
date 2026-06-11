interface MetricCardProps {
  label: string;
  value: number | string;
  sub?: string;
  highlight?: boolean;
}

export function MetricCard({ label, value, sub, highlight }: MetricCardProps) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight
          ? "border-green-800 bg-green-950/20"
          : "border-zinc-800 bg-zinc-900"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}
