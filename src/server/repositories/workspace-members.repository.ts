import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiWorkspaceMember,
  WaaiWorkspaceRole,
} from "@/types/database";

type Client = SupabaseClient<Database>;

export class WorkspaceMembersRepository {
  constructor(private readonly db: Client) {}

  async findByWorkspace(workspaceId: string): Promise<WaaiWorkspaceMember[]> {
    const { data, error } = await this.db
      .from("waai_workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (error) throw new Error(`WorkspaceMembersRepository.findByWorkspace: ${error.message}`);
    return data ?? [];
  }

  async findByUser(userId: string): Promise<WaaiWorkspaceMember[]> {
    const { data, error } = await this.db
      .from("waai_workspace_members")
      .select("*")
      .eq("user_id", userId);

    if (error) throw new Error(`WorkspaceMembersRepository.findByUser: ${error.message}`);
    return data ?? [];
  }

  async findMembership(
    workspaceId: string,
    userId: string
  ): Promise<WaaiWorkspaceMember | null> {
    const { data, error } = await this.db
      .from("waai_workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .single();

    if (error) return null;
    return data;
  }

  async getUserWorkspaceId(userId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from("waai_workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (error) return null;
    return data?.workspace_id ?? null;
  }

  async addMember(
    workspaceId: string,
    userId: string,
    role: WaaiWorkspaceRole,
    invitedBy?: string
  ): Promise<WaaiWorkspaceMember> {
    const { data, error } = await this.db
      .from("waai_workspace_members")
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        role,
        invited_by: invitedBy ?? null,
      })
      .select()
      .single();

    if (error)
      throw new Error(`WorkspaceMembersRepository.addMember: ${error.message}`);
    return data;
  }

  async updateRole(
    workspaceId: string,
    userId: string,
    role: WaaiWorkspaceRole
  ): Promise<void> {
    const { error } = await this.db
      .from("waai_workspace_members")
      .update({ role })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    if (error)
      throw new Error(
        `WorkspaceMembersRepository.updateRole: ${error.message}`
      );
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    const { count, error } = await this.db
      .from("waai_workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    if (error) return 0;
    return count ?? 0;
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from("waai_workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    if (error)
      throw new Error(
        `WorkspaceMembersRepository.removeMember: ${error.message}`
      );
  }
}
