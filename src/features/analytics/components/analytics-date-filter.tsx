"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Preset = "today" | "7d" | "30d" | "month" | "custom";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "month", label: "Este mes" },
  { value: "custom", label: "Personalizado" },
];

interface AnalyticsDateFilterProps {
  currentPreset?: string;
  currentFrom?: string;
  currentTo?: string;
}

export function AnalyticsDateFilter({
  currentPreset = "30d",
  currentFrom,
  currentTo,
}: AnalyticsDateFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectPreset(preset: Preset) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", preset);
    if (preset !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyCustomRange(from: string, to: string) {
    if (!from || !to) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", "custom");
    // Normalize to UTC ISO string — append T00:00:00Z for date-only inputs
    params.set("from", from.includes("T") ? from : `${from}T00:00:00Z`);
    params.set("to", to.includes("T") ? to : `${to}T23:59:59Z`);
    router.push(`${pathname}?${params.toString()}`);
  }

  const isCustom = currentPreset === "custom";
  const fromDate = currentFrom?.slice(0, 10) ?? "";
  const toDate = currentTo?.slice(0, 10) ?? "";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
        {PRESETS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => selectPreset(value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              currentPreset === value
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isCustom && (
        <CustomRangePicker
          from={fromDate}
          to={toDate}
          onApply={applyCustomRange}
        />
      )}
    </div>
  );
}

function CustomRangePicker({
  from,
  to,
  onApply,
}: {
  from: string;
  to: string;
  onApply: (from: string, to: string) => void;
}) {
  // Local state managed with uncontrolled inputs + form submit
  return (
    <form
      className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onApply(fd.get("from") as string, fd.get("to") as string);
      }}
    >
      <label className="text-xs text-zinc-500">Desde</label>
      <input
        type="date"
        name="from"
        defaultValue={from}
        max={to || undefined}
        required
        className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white scheme-dark"
      />
      <label className="text-xs text-zinc-500">Hasta</label>
      <input
        type="date"
        name="to"
        defaultValue={to}
        min={from || undefined}
        required
        className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white scheme-dark"
      />
      <button
        type="submit"
        className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-500"
      >
        Aplicar
      </button>
    </form>
  );
}
