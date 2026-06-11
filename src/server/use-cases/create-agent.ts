import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAgent } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AgentService } from "@/server/services/agent-service";
import { createAgentWizardSchema } from "@/lib/validators/agent";

type Client = SupabaseClient<Database>;

type Result =
  | { agent: WaaiAgent; error?: never }
  | { agent?: never; error: string; code?: "FORBIDDEN" | "PLAN_LIMIT" };

export async function createAgentUseCase(
  db: Client,
  userId: string,
  input: unknown
): Promise<Result> {
  const parsed = createAgentWizardSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) {
    return { error: "No workspace found for user" };
  }

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership) {
    return { error: "User is not a member of this workspace" };
  }

  const service = new AgentService(db);
  try {
    const agent = await service.createAgentWithWizard(
      workspaceId,
      userId,
      membership.role,
      parsed.data
    );
    return { agent };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create agent";
    if (message.startsWith("FORBIDDEN")) return { error: message, code: "FORBIDDEN" };
    if (message.startsWith("PLAN_LIMIT")) return { error: message, code: "PLAN_LIMIT" };
    return { error: message };
  }
}
