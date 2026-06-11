export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AiCostSnapshotsRepository } from "@/server/repositories/ai-cost-snapshots-repository";
import { resolveDateRange } from "@/server/services/analytics-service";
import type { DatePreset } from "@/server/services/analytics-service";

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const preset = (searchParams.get("preset") ?? "30d") as DatePreset;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const range = resolveDateRange(preset, from, to);
  // Convert ISO strings to date strings for the RPC (date type)
  const fromDate = range.from.slice(0, 10);
  const toDate = range.to.slice(0, 10);

  const repo = new AiCostSnapshotsRepository(supabase);
  const snapshot = await repo.getAiCostSnapshot(workspaceId, fromDate, toDate);

  return NextResponse.json({
    ...snapshot,
    period: { from: fromDate, to: toDate, preset },
  });
}
