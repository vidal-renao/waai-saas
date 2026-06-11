import { NextRequest, NextResponse } from "next/server";

// Verifies WhatsApp config presence — does NOT send real messages
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ status: "down", error: "unauthorized" }, { status: 401 });
  }

  const provider: string = process.env.WHATSAPP_PROVIDER ?? (process.env.WHAPI_TOKEN ? "whapi" : "mock");
  const checks: Record<string, "ok" | "missing"> = {};

  if (provider === "whapi") {
    checks.whapi_token = process.env.WHAPI_TOKEN ? "ok" : "missing";
    checks.whapi_base_url = process.env.WHAPI_BASE_URL ? "ok" : "missing";
    checks.whapi_webhook_secret = process.env.WHAPI_WEBHOOK_SECRET ? "ok" : "missing";
  } else if (provider === "meta") {
    checks.meta_app_id = process.env.META_APP_ID ? "ok" : "missing";
    checks.meta_app_secret = process.env.META_APP_SECRET ? "ok" : "missing";
    checks.meta_webhook_verify_token = process.env.META_WEBHOOK_VERIFY_TOKEN ? "ok" : "missing";
  } else {
    checks.mock_provider = "ok";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      provider,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
