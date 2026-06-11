import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLeadFromConversationUseCase } from "@/server/use-cases/create-lead-from-conversation";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;

  try {
    const lead = await createLeadFromConversationUseCase(supabase, user.id, conversationId);
    if (!lead) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return NextResponse.json({ lead }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    if (msg.startsWith("FORBIDDEN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
