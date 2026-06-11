export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { BillingEnforcementService } from "@/server/services/billing-enforcement-service";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const membership = await membersRepo.findMembership(workspaceId, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enforcementService = new BillingEnforcementService(supabase);
  const snapshot = await enforcementService.getUsageSnapshot(workspaceId);

  return NextResponse.json(snapshot);
}
