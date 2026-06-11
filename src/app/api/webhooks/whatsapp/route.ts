import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { processWhatsappWebhookUseCase } from "@/server/use-cases/process-whatsapp-webhook";

export const maxDuration = 60;

// GET: optional Meta-style hub.challenge verification
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const challenge = url.searchParams.get("hub.challenge");
  const token = url.searchParams.get("hub.verify_token");

  if (mode === "subscribe" && challenge) {
    const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (expected && token === expected) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  return Response.json({ status: "ok" });
}

export async function POST(request: Request) {
  // Read raw body for signature validation
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return Response.json({ error: "Could not read body" }, { status: 400 });
  }

  // Collect headers as lowercase map
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  // Use service role client — no user session in webhook context
  let db;
  try {
    db = createServiceRoleClient();
  } catch {
    // Service role not configured — return 503 but no stack trace
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }

  const result = await processWhatsappWebhookUseCase(db, {
    rawBody,
    headers,
  });

  // Always return 200 to prevent provider retries, except for invalid signatures
  if (result.status === "invalid") {
    return new Response(null, { status: 401 });
  }

  return Response.json({ status: result.status, eventId: result.eventId });
}
