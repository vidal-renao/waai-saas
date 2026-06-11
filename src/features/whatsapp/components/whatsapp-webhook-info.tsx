"use client";

import { useState } from "react";

export function WhatsappWebhookInfo({
  connectionId,
  appUrl,
}: {
  connectionId: string;
  appUrl: string;
}) {
  const webhookUrl = `${appUrl}/api/webhooks/whatsapp`;
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  void connectionId;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs uppercase tracking-wider text-zinc-500">
        URL del Webhook
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-green-400 break-all">
          {webhookUrl}
        </code>
        <button
          onClick={copyUrl}
          className="flex-shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
        <p className="text-xs font-medium text-zinc-400 mb-2">
          Instrucciones para Whapi.cloud
        </p>
        <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
          <li>Accede a tu dashboard en whapi.cloud</li>
          <li>Ve a tu Canal → Webhooks</li>
          <li>Pega la URL anterior como Webhook URL</li>
          <li>Configura el Token (WHAPI_TOKEN de tu .env)</li>
          <li>Activa el evento: <code className="text-zinc-400">messages</code></li>
          <li>Guarda y envía un mensaje de prueba</li>
        </ol>
      </div>
    </div>
  );
}
