interface ChecklistItem {
  label: string;
  status: "pass" | "fail" | "warn" | "pending";
  detail?: string;
}

interface ProductionReadinessChecklistProps {
  items: ChecklistItem[];
}

const STATUS_ICON: Record<string, { icon: string; color: string }> = {
  pass:    { icon: "✓", color: "text-green-500" },
  fail:    { icon: "✗", color: "text-red-500" },
  warn:    { icon: "⚠", color: "text-yellow-500" },
  pending: { icon: "○", color: "text-zinc-500" },
};

export function ProductionReadinessChecklist({ items }: ProductionReadinessChecklistProps) {
  const passed = items.filter((i) => i.status === "pass").length;
  const total = items.length;
  const allGood = passed === total;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300">Production Readiness</h3>
        <span className={`text-xs font-semibold ${allGood ? "text-green-400" : "text-yellow-400"}`}>
          {passed}/{total} checks
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => {
          const { icon, color } = STATUS_ICON[item.status] ?? STATUS_ICON.pending;
          return (
            <div key={i} className="flex items-start gap-3">
              <span className={`mt-0.5 text-sm font-bold flex-shrink-0 ${color}`}>{icon}</span>
              <div>
                <p className="text-sm text-zinc-300">{item.label}</p>
                {item.detail && (
                  <p className="text-xs text-zinc-500">{item.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
