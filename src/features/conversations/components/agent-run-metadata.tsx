interface AgentRunMetadataProps {
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  model: string;
}

export function AgentRunMetadata({
  inputTokens,
  outputTokens,
  latencyMs,
  model,
}: AgentRunMetadataProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-500">
      <span>
        <span className="text-zinc-400">{model}</span>
      </span>
      <span>·</span>
      <span>
        {inputTokens + outputTokens} tokens ({inputTokens} in / {outputTokens} out)
      </span>
      <span>·</span>
      <span>{latencyMs}ms</span>
    </div>
  );
}
