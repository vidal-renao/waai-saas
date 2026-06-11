import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveHandoffUseCase } from "@/server/use-cases/resolve-handoff";
import { resolveHandoffSchema } from "@/lib/validators/handoff";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  void params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = resolveHandoffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  try {
    const handoff = await resolveHandoffUseCase(supabase, user.id, parsed.data.handoffId);
    if (!handoff) return NextResponse.json({ error: "Handoff not found" }, { status: 404 });
    return NextResponse.json({ handoff });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    if (msg.startsWith("FORBIDDEN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (msg.includes("NOT_FOUND")) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (msg.includes("BAD_REQUEST")) return NextResponse.json({ error: "Handoff is not active" }, { status: 400 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
