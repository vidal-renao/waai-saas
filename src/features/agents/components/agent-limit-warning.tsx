import Link from "next/link";

interface AgentLimitWarningProps {
  current: number;
  limit: number;
  variant?: "warning" | "error";
}

export function AgentLimitWarning({
  current,
  limit,
  variant = "warning",
}: AgentLimitWarningProps) {
  const isError = variant === "error" || current >= limit;
  const limitLabel = limit === -1 ? "Ilimitado" : limit.toString();

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        isError
          ? "border-red-800 bg-red-900/20 text-red-400"
          : "border-yellow-800 bg-yellow-900/20 text-yellow-400"
      }`}
    >
      {isError ? (
        <>
          <span className="font-medium">Límite de agentes alcanzado</span>
          <span className="text-xs ml-2">
            ({current}/{limitLabel})
          </span>
          <span className="ml-2">
            Para crear más agentes,{" "}
            <Link
              href="/dashboard"
              className="underline hover:no-underline"
            >
              actualiza tu plan
            </Link>
            .
          </span>
        </>
      ) : (
        <span>
          Usando {current} de {limitLabel} agentes disponibles en tu plan.
        </span>
      )}
    </div>
  );
}
