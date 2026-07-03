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
        Webhook URL
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-green-400 break-all">
          {webhookUrl}
        </code>
        <button
          onClick={copyUrl}
          className="flex-shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
        <p className="text-xs font-medium text-zinc-400 mb-2">
          Meta Cloud API setup instructions
        </p>
        <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
          <li>Go to Meta Business → WhatsApp → API Setup</li>
          <li>Under &laquo;Webhooks&raquo;, paste the URL above as the callback URL</li>
          <li>Enter the verification token and click &laquo;Verify and save&raquo;</li>
          <li>Enable the subscription field: <code className="text-zinc-400">messages</code></li>
          <li>Save and send a test message from Meta</li>
        </ol>
      </div>
    </div>
  );
}
