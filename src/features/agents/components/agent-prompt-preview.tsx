interface AgentPromptPreviewProps {
  prompt: string;
  version?: number;
  isActive?: boolean;
}

export function AgentPromptPreview({
  prompt,
  version,
  isActive,
}: AgentPromptPreviewProps) {
  return (
    <div className="flex flex-col gap-2">
      {(version !== undefined || isActive !== undefined) && (
        <div className="flex items-center gap-2">
          {version !== undefined && (
            <span className="text-xs text-zinc-500">Version {version}</span>
          )}
          {isActive && (
            <span className="rounded-full bg-green-900/30 border border-green-800 px-2 py-0.5 text-xs text-green-400">
              Active
            </span>
          )}
        </div>
      )}
      <pre className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-xs text-zinc-300 font-mono overflow-auto max-h-96 leading-relaxed">
        {prompt}
      </pre>
    </div>
  );
}
