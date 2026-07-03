interface AiCostSummaryProps {
  totalRuns: number;
  successRuns: number;
  errorRuns: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostCents: number;
  period: string;
}

function formatCents(cents: number): string {
  if (cents === 0) return "$0.00";
  const dollars = cents / 100;
  if (dollars < 0.01) return `<$0.01`;
  return `$${dollars.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function AiCostSummary({
  totalRuns,
  successRuns,
  errorRuns,
  totalInputTokens,
  totalOutputTokens,
  estimatedCostCents,
  period,
}: AiCostSummaryProps) {
  const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300">Estimated AI Cost</h3>
        <span className="text-xs text-zinc-500">{period}</span>
      </div>

      <div className="mb-4">
        <p className="text-2xl font-bold text-white">{formatCents(estimatedCostCents)}</p>
        <p className="text-xs text-zinc-500 mt-0.5">Approximate estimate in USD</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-zinc-800 px-3 py-2">
          <p className="text-xs text-zinc-500">Runs</p>
          <p className="text-sm font-semibold text-white">{totalRuns.toLocaleString()}</p>
          <p className="text-xs text-green-500">{successRate}% successful</p>
        </div>
        <div className="rounded-lg bg-zinc-800 px-3 py-2">
          <p className="text-xs text-zinc-500">Errors</p>
          <p className="text-sm font-semibold text-red-400">{errorRuns.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-zinc-800 px-3 py-2">
          <p className="text-xs text-zinc-500">Input tokens</p>
          <p className="text-sm font-semibold text-white">{formatTokens(totalInputTokens)}</p>
        </div>
        <div className="rounded-lg bg-zinc-800 px-3 py-2">
          <p className="text-xs text-zinc-500">Output tokens</p>
          <p className="text-sm font-semibold text-white">{formatTokens(totalOutputTokens)}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-600">
        * Approximate pricing. Verify against your Anthropic/OpenAI invoice.
      </p>
    </div>
  );
}
