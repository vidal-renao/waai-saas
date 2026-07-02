import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiBillingEvent } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface RecordBillingEventInput {
  workspaceId: string;
  subscriptionId?: string | null;
  eventType: string;
  provider?: string | null;
  providerEventId?: string | null;
  amountCents?: number | null;
  currency?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

// Postgres unique_violation — raised by the idempotency index on
// (provider, provider_event_id).
const UNIQUE_VIOLATION = "23505";

export class BillingEventsRepository {
  constructor(private readonly db: Client) {}

  async findByProviderEvent(
    provider: string,
    providerEventId: string
  ): Promise<WaaiBillingEvent | null> {
    const { data, error } = await this.db
      .from("waai_billing_events")
      .select("*")
      .eq("provider", provider)
      .eq("provider_event_id", providerEventId)
      .single();
    if (error || !data) return null;
    return data;
  }

  /**
   * Insert a billing event. Returns `{ duplicate: true }` when the provider
   * event was already recorded (idempotency index conflict) instead of
   * throwing, so webhook handlers can safely no-op on redelivery.
   */
  async recordEvent(
    input: RecordBillingEventInput
  ): Promise<{ event: WaaiBillingEvent | null; duplicate: boolean }> {
    const { data, error } = await this.db
      .from("waai_billing_events")
      .insert({
        workspace_id: input.workspaceId,
        subscription_id: input.subscriptionId ?? null,
        event_type: input.eventType,
        provider: input.provider ?? null,
        provider_event_id: input.providerEventId ?? null,
        amount_cents: input.amountCents ?? null,
        currency: input.currency ?? "usd",
        status: input.status ?? "received",
        metadata: input.metadata ?? {},
      })
      .select()
      .single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return { event: null, duplicate: true };
      }
      throw new Error(`BillingEventsRepository.recordEvent: ${error.message}`);
    }
    return { event: data, duplicate: false };
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const { error } = await this.db
      .from("waai_billing_events")
      .update({ status })
      .eq("id", id);
    if (error)
      throw new Error(`BillingEventsRepository.updateStatus: ${error.message}`);
  }

  async findByWorkspace(
    workspaceId: string,
    limit = 50
  ): Promise<WaaiBillingEvent[]> {
    const { data, error } = await this.db
      .from("waai_billing_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return data ?? [];
  }

  async getBillingReadinessSnapshot(
    workspaceId: string
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.db.rpc(
      "waai_get_billing_readiness_snapshot",
      { p_workspace_id: workspaceId }
    );
    if (error) return null;
    return data as unknown as Record<string, unknown>;
  }
}
