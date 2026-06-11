interface RagContextPreviewProps {
  ragUsed: boolean;
  retrievedChunksCount?: number;
  ragModel?: string;
  ragLatencyMs?: number;
}

export function RagContextPreview({
  ragUsed,
  retrievedChunksCount,
  ragModel,
  ragLatencyMs,
}: RagContextPreviewProps) {
  if (!ragUsed) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-900/40 bg-blue-950/10 px-3 py-2 text-xs text-blue-400">
      <span className="font-medium">RAG activo</span>
      {retrievedChunksCount !== undefined && (
        <>
          <span>·</span>
          <span>{retrievedChunksCount} chunks recuperados</span>
        </>
      )}
      {ragModel && (
        <>
          <span>·</span>
          <span>{ragModel}</span>
        </>
      )}
      {ragLatencyMs !== undefined && (
        <>
          <span>·</span>
          <span>{ragLatencyMs}ms</span>
        </>
      )}
    </div>
  );
}
