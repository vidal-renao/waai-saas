import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAuditLog } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface LogEventInput {
  workspaceId?: string;
  actorUserId?: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export class AuditLogsRepository {
  constructor(private readonly db: Client) {}

  async log(input: LogEventInput): Promise<void> {
    const { error } = await this.db.from("waai_audit_logs").insert({
      workspace_id: input.workspaceId ?? null,
      actor_user_id: input.actorUserId ?? null,
      event_type: input.eventType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    });

    if (error)
      throw new Error(`AuditLogsRepository.log: ${error.message}`);
  }

  async findByWorkspace(
    workspaceId: string,
    limit = 50
  ): Promise<WaaiAuditLog[]> {
    const { data, error } = await this.db
      .from("waai_audit_logs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`AuditLogsRepository.findByWorkspace: ${error.message}`);
    return data ?? [];
  }
}
