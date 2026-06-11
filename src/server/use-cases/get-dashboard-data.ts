import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWorkspaceRole } from "@/types/database";
import { WorkspaceService } from "@/server/services/workspace.service";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { ProfilesRepository } from "@/server/repositories/profiles.repository";

type Client = SupabaseClient<Database>;

export interface DashboardData {
  profile: { id: string; full_name: string | null; email: string | null };
  workspace: { id: string; name: string; slug: string; status: string };
  role: WaaiWorkspaceRole;
  plan: {
    id: string;
    name: string;
    agents_limit: number;
    messages_limit: number;
    documents_limit: number;
    human_handoff_enabled: boolean;
  };
  usage: {
    messages_sent: number;
    documents_uploaded: number;
    agents_created: number;
  };
}

export async function getDashboardData(
  db: Client,
  userId: string
): Promise<DashboardData | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const profilesRepo = new ProfilesRepository(db);
  const workspaceService = new WorkspaceService(db);

  const [profile, workspaceId] = await Promise.all([
    profilesRepo.findById(userId),
    membersRepo.getUserWorkspaceId(userId),
  ]);

  if (!profile || !workspaceId) return null;

  const [membership, workspaceData] = await Promise.all([
    membersRepo.findMembership(workspaceId, userId),
    workspaceService.getWorkspaceWithSubscription(workspaceId),
  ]);

  if (!membership || !workspaceData?.workspace || !workspaceData.subscription) {
    return null;
  }

  return {
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
    },
    workspace: {
      id: workspaceData.workspace.id,
      name: workspaceData.workspace.name,
      slug: workspaceData.workspace.slug,
      status: workspaceData.workspace.status,
    },
    role: membership.role,
    plan: {
      id: workspaceData.subscription.plan.id,
      name: workspaceData.subscription.plan.name,
      agents_limit: workspaceData.subscription.plan.agents_limit,
      messages_limit: workspaceData.subscription.plan.messages_limit,
      documents_limit: workspaceData.subscription.plan.documents_limit,
      human_handoff_enabled:
        workspaceData.subscription.plan.human_handoff_enabled,
    },
    usage: {
      messages_sent: workspaceData.usage?.messages_sent ?? 0,
      documents_uploaded: workspaceData.usage?.documents_uploaded ?? 0,
      agents_created: workspaceData.usage?.agents_created ?? 0,
    },
  };
}
