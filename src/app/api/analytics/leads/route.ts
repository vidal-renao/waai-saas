import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AnalyticsService } from "@/server/services/analytics-service";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const service = new AnalyticsService(supabase);
  const [funnel, handoffs] = await Promise.all([
    service.getLeadFunnel(workspaceId),
    service.getHandoffMetrics(workspaceId),
  ]);

  return NextResponse.json({ funnel, handoffs });
}
