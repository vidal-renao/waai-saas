import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiWhatsappWebhookEvent,
  WaaiWebhookEventDirection,
  WaaiWebhookProcessingStatus,
} from "@/types/database";

type WebhookEventUpdateRow =
  Database["public"]["Tables"]["waai_whatsapp_webhook_events"]["Update"];

type Client = SupabaseClient<Database>;

export interface CreateWebhookEventInput {
  workspaceId?: string | null;
  connectionId?: string | null;
  provider: string;
  eventType: string;
  externalEventId?: string | null;
  externalMessageId?: string | null;
  direction?: WaaiWebhookEventDirection;
  rawPayload: Record<string, unknown>;
  normalizedPayload?: Record<string, unknown>;
}

export class WhatsappWebhookEventRepository {
  constructor(private readonly db: Client) {}

  async create(input: CreateWebhookEventInput): Promise<WaaiWhatsappWebhookEvent> {
    const { data, error } = await this.db
      .from("waai_whatsapp_webhook_events")
      .insert({
        workspace_id: input.workspaceId ?? null,
        connection_id: input.connectionId ?? null,
        provider: input.provider,
        event_type: input.eventType,
        external_event_id: input.externalEventId ?? null,
        external_message_id: input.externalMessageId ?? null,
        direction: input.direction ?? "unknown",
        raw_payload: input.rawPayload,
        normalized_payload: input.normalizedPayload ?? {},
        processing_status: "received",
      })
      .select()
      .single();
    if (error)
      throw new Error(`WhatsappWebhookEventRepository.create: ${error.message}`);
    return data;
  }

  async updateStatus(
    id: string,
    status: WaaiWebhookProcessingStatus,
    opts?: { errorMessage?: string; normalizedPayload?: Record<string, unknown>; connectionId?: string; workspaceId?: string }
  ): Promise<void> {
    const patch: WebhookEventUpdateRow = {
      processing_status: status,
      processed_at: ["processed", "ignored", "failed"].includes(status) ? new Date().toISOString() : null,
    };
    if (opts?.errorMessage !== undefined) patch.error_message = opts.errorMessage;
    if (opts?.normalizedPayload !== undefined) patch.normalized_payload = opts.normalizedPayload;
    if (opts?.connectionId !== undefined) patch.connection_id = opts.connectionId;
    if (opts?.workspaceId !== undefined) patch.workspace_id = opts.workspaceId;

    const { error } = await this.db
      .from("waai_whatsapp_webhook_events")
      .update(patch)
      .eq("id", id);
    if (error)
      throw new Error(`WhatsappWebhookEventRepository.updateStatus: ${error.message}`);
  }

  async findByConnection(
    connectionId: string,
    limit = 50
  ): Promise<WaaiWhatsappWebhookEvent[]> {
    const { data, error } = await this.db
      .from("waai_whatsapp_webhook_events")
      .select("*")
      .eq("connection_id", connectionId)
      .order("received_at", { ascending: false })
      .limit(limit);
    if (error)
      throw new Error(`WhatsappWebhookEventRepository.findByConnection: ${error.message}`);
    return data ?? [];
  }
}
