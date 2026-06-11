import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWorkspaceRole } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AnalyticsService, type OperationalAlert } from "@/server/services/analytics-service";

type Client = SupabaseClient<Database>;

const CAN_VIEW_ALERTS: WaaiWorkspaceRole[] = [
  "owner",
  "admin",
  "agent_manager",
  "human_agent",
];

export async function getOperationalAlertsUseCase(
  db: Client,
  userId: string
): Promise<OperationalAlert[] | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return null;

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership) return null;
  if (!CAN_VIEW_ALERTS.includes(membership.role)) return [];

  const service = new AnalyticsService(db);
  return service.getOperationalAlerts(workspaceId);
}
