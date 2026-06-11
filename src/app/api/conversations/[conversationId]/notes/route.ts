import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listConversationNotesUseCase } from "@/server/use-cases/list-conversation-notes";
import { addInternalNoteUseCase } from "@/server/use-cases/add-internal-note";
import { createNoteSchema } from "@/lib/validators/internal-note";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;
  const notes = await listConversationNotesUseCase(supabase, user.id, conversationId);
  return NextResponse.json({ notes });
}

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  try {
    const note = await addInternalNoteUseCase(supabase, user.id, conversationId, null, parsed.data.note);
    if (!note) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    if (msg.startsWith("FORBIDDEN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (msg.includes("BAD_REQUEST")) return NextResponse.json({ error: msg }, { status: 400 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
