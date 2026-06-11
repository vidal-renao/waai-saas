import type { WaaiWhatsappProvider } from "@/types/database";

const LABELS: Record<WaaiWhatsappProvider, string> = {
  mock:  "Mock",
  whapi: "Whapi.cloud",
  meta:  "Meta Cloud API",
};

export function WhatsappProviderBadge({ provider }: { provider: WaaiWhatsappProvider }) {
  return (
    <span className="inline-flex items-center rounded border border-blue-900/50 bg-blue-950/20 px-2 py-0.5 text-xs font-medium text-blue-400">
      {LABELS[provider] ?? provider}
    </span>
  );
}
