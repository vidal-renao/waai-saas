import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiProfile } from "@/types/database";

type Client = SupabaseClient<Database>;

export class ProfilesRepository {
  constructor(private readonly db: Client) {}

  async findById(userId: string): Promise<WaaiProfile | null> {
    const { data, error } = await this.db
      .from("waai_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) return null;
    return data;
  }

  async upsert(
    userId: string,
    profile: { full_name?: string; email?: string; avatar_url?: string }
  ): Promise<WaaiProfile> {
    const { data, error } = await this.db
      .from("waai_profiles")
      .upsert({ id: userId, ...profile }, { onConflict: "id" })
      .select()
      .single();

    if (error) throw new Error(`ProfilesRepository.upsert: ${error.message}`);
    return data;
  }
}
