import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLeadUseCase } from "@/server/use-cases/get-lead";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { LeadService } from "@/server/services/lead-service";
import { updateLeadSchema } from "@/lib/validators/lead";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId } = await params;
  const result = await getLeadUseCase(supabase, user.id, leadId);
  if (!result) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  return NextResponse.json(result);
}

export async function PUT(
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

  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const membership = await membersRepo.findByUser(user.id);
  if (!membership.length) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const workspaceId = membership[0].workspace_id;
  const userRole = membership[0].role;

  const leadService = new LeadService(supabase);
  try {
    const updated = await leadService.updateLead(leadId, workspaceId, parsed.data, user.id, userRole);
    return NextResponse.json({ lead: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    if (msg.startsWith("FORBIDDEN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (msg.startsWith("NOT_FOUND")) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
