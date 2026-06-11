import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWorkspace } from "@/types/database";
import { WorkspaceService } from "@/server/services/workspace.service";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { createWorkspaceSchema } from "@/lib/validators/workspace";
import type { z } from "zod";

type Client = SupabaseClient<Database>;

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export async function createWorkspaceUseCase(
  db: Client,
  userId: string,
  input: CreateWorkspaceInput
): Promise<{ workspace: WaaiWorkspace; error?: never } | { workspace?: never; error: string }> {
  // Validate input
  const parsed = createWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Check user doesn't already have a workspace
  const membersRepo = new WorkspaceMembersRepository(db);
  const existingWorkspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (existingWorkspaceId) {
    return { error: "User already has a workspace" };
  }

  const service = new WorkspaceService(db);
  try {
    const workspace = await service.createWorkspace(userId, parsed.data);
    return { workspace };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create workspace";
    return { error: message };
  }
}
