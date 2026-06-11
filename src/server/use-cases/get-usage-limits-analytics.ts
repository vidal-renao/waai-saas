import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWorkspaceRole } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AnalyticsService, type UsageLimitWithPct } from "@/server/services/analytics-service";

type Client = SupabaseClient<Database>;

const CAN_VIEW_USAGE: WaaiWorkspaceRole[] = ["owner", "admin"];

export async function getUsageLimitsAnalyticsUseCase(
  db: Client,
  userId: string
): Promise<UsageLimitWithPct | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return null;

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership || !CAN_VIEW_USAGE.includes(membership.role)) return null;

  const service = new AnalyticsService(db);
  return service.getUsageLimits(workspaceId);
}
