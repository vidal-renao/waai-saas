import { NextRequest, NextResponse } from "next/server";

// Verifies AI config presence — does NOT make real API calls
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ status: "down", error: "unauthorized" }, { status: 401 });
  }

  const checks: Record<string, "ok" | "degraded" | "missing"> = {};

  checks.anthropic = process.env.ANTHROPIC_API_KEY ? "ok" : "missing";
  checks.anthropic_model = process.env.ANTHROPIC_MODEL ? "ok" : "missing";
  checks.openai = process.env.OPENAI_API_KEY ? "ok" : "missing";
  checks.openai_model = process.env.OPENAI_EMBEDDING_MODEL ? "ok" : "missing";

  const hasLlm = checks.anthropic === "ok";
  const hasEmbeddings = checks.openai === "ok";
  const overallStatus = hasLlm && hasEmbeddings
    ? "ok"
    : hasLlm || hasEmbeddings
    ? "degraded"
    : "down";

  return NextResponse.json(
    {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: overallStatus === "down" ? 503 : 200 }
  );
}
