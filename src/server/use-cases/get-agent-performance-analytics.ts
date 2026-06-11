import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWorkspaceRole } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AnalyticsService, resolveDateRange, type DatePreset, type AgentPerformanceRow } from "@/server/services/analytics-service";

type Client = SupabaseClient<Database>;

const CAN_VIEW_AGENT_PERF: WaaiWorkspaceRole[] = ["owner", "admin", "agent_manager"];

export async function getAgentPerformanceAnalyticsUseCase(
  db: Client,
  userId: string,
  preset: DatePreset = "30d",
  customFrom?: string,
  customTo?: string
): Promise<AgentPerformanceRow[] | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return null;

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership || !CAN_VIEW_AGENT_PERF.includes(membership.role)) return null;

  const range = resolveDateRange(preset, customFrom, customTo);
  const service = new AnalyticsService(db);
  return service.getAgentPerformance(workspaceId, range);
}
