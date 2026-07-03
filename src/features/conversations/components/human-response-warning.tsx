export function HumanResponseWarning() {
  return (
    <div className="rounded-xl border border-yellow-900/50 bg-yellow-950/20 px-4 py-3 flex items-start gap-3">
      <span className="mt-0.5 text-yellow-400 text-base leading-none">⚠</span>
      <div>
        <p className="text-sm font-medium text-yellow-400">AI automation paused</p>
        <p className="mt-0.5 text-xs text-yellow-300/70">
          This conversation has been escalated to a human agent. Your AI Employee will not respond automatically until the escalation is resolved.
        </p>
      </div>
    </div>
  );
}
