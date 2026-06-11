import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWorkspace } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  businessType?: string;
  country?: string;
  timezone?: string;
  createdBy: string;
}

export class WorkspacesRepository {
  constructor(private readonly db: Client) {}

  async findById(id: string): Promise<WaaiWorkspace | null> {
    const { data, error } = await this.db
      .from("waai_workspaces")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  }

  async findBySlug(slug: string): Promise<WaaiWorkspace | null> {
    const { data, error } = await this.db
      .from("waai_workspaces")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) return null;
    return data;
  }

  async findByUserId(userId: string): Promise<WaaiWorkspace | null> {
    const { data, error } = await this.db
      .from("waai_workspaces")
      .select("*, waai_workspace_members!inner(user_id)")
      .eq("waai_workspace_members.user_id", userId)
      .limit(1)
      .single();

    if (error) return null;
    return data as WaaiWorkspace;
  }

  async create(input: CreateWorkspaceInput): Promise<WaaiWorkspace> {
    const { data, error } = await this.db
      .from("waai_workspaces")
      .insert({
        name: input.name,
        slug: input.slug,
        business_type: input.businessType ?? null,
        country: input.country ?? "ES",
        timezone: input.timezone ?? "Europe/Madrid",
        created_by: input.createdBy,
      })
      .select()
      .single();

    if (error)
      throw new Error(`WorkspacesRepository.create: ${error.message}`);
    return data;
  }

  async updateStatus(
    id: string,
    status: WaaiWorkspace["status"]
  ): Promise<void> {
    const { error } = await this.db
      .from("waai_workspaces")
      .update({ status })
      .eq("id", id);

    if (error)
      throw new Error(
        `WorkspacesRepository.updateStatus: ${error.message}`
      );
  }
}
