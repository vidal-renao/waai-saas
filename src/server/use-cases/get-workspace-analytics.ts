import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWorkspaceRole } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AnalyticsService, resolveDateRange, type DatePreset, type WorkspaceAnalyticsData } from "@/server/services/analytics-service";

type Client = SupabaseClient<Database>;

const CAN_VIEW_ANALYTICS: WaaiWorkspaceRole[] = [
  "owner",
  "admin",
  "agent_manager",
  "human_agent",
  "viewer",
];

export interface GetWorkspaceAnalyticsInput {
  preset?: DatePreset;
  customFrom?: string;
  customTo?: string;
}

export interface GetWorkspaceAnalyticsResult {
  data: WorkspaceAnalyticsData;
  workspaceId: string;
  role: WaaiWorkspaceRole;
  from: string;
  to: string;
}

export async function getWorkspaceAnalyticsUseCase(
  db: Client,
  userId: string,
  input: GetWorkspaceAnalyticsInput = {}
): Promise<GetWorkspaceAnalyticsResult | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return null;

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership || !CAN_VIEW_ANALYTICS.includes(membership.role)) return null;

  const range = resolveDateRange(input.preset ?? "30d", input.customFrom, input.customTo);
  const service = new AnalyticsService(db);
  const data = await service.getWorkspaceOverview(workspaceId, range);
  if (!data) return null;

  return { data, workspaceId, role: membership.role, from: range.from, to: range.to };
}
