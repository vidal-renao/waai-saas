import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assignLeadUseCase } from "@/server/use-cases/assign-lead";
import { assignLeadSchema } from "@/lib/validators/lead";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = assignLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  try {
    const lead = await assignLeadUseCase(supabase, user.id, leadId, parsed.data.assignedTo);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ lead });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    if (msg.startsWith("FORBIDDEN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (msg.startsWith("NOT_FOUND")) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
