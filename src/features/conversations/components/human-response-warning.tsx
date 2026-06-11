export function HumanResponseWarning() {
  return (
    <div className="rounded-xl border border-yellow-900/50 bg-yellow-950/20 px-4 py-3 flex items-start gap-3">
      <span className="mt-0.5 text-yellow-400 text-base leading-none">⚠</span>
      <div>
        <p className="text-sm font-medium text-yellow-400">Automatización pausada</p>
        <p className="mt-0.5 text-xs text-yellow-300/70">
          Esta conversación tiene un handoff activo. El agente de IA no responderá automáticamente hasta que se resuelva el handoff.
        </p>
      </div>
    </div>
  );
}
