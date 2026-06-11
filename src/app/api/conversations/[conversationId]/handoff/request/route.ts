import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestHandoffUseCase } from "@/server/use-cases/request-handoff";
import { requestHandoffSchema } from "@/lib/validators/handoff";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // empty body ok
  }

  const parsed = requestHandoffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  try {
    const handoff = await requestHandoffUseCase(
      supabase,
      user.id,
      conversationId,
      parsed.data.reason ?? null,
      parsed.data.triggerType ?? null
    );
    if (!handoff) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return NextResponse.json({ handoff }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    if (msg.startsWith("FORBIDDEN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (msg.includes("NOT_FOUND")) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (msg.includes("CONFLICT")) return NextResponse.json({ error: "Handoff already active" }, { status: 409 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
