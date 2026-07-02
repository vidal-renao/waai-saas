import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiWhatsappConnection,
  WaaiWhatsappConnectionStatus,
  WaaiWhatsappProvider,
} from "@/types/database";
import { encryptSecret, decryptSecret } from "@/lib/security/encryption";

type ConnectionUpdateRow =
  Database["public"]["Tables"]["waai_whatsapp_connections"]["Update"];

type Client = SupabaseClient<Database>;

export interface CreateConnectionInput {
  workspaceId: string;
  agentId?: string | null;
  provider?: WaaiWhatsappProvider;
  displayName?: string | null;
  phoneNumber?: string | null;
  phoneNumberId?: string | null;
  wabaId?: string | null;
  accessToken?: string | null;
  externalInstanceId?: string | null;
  webhookSecretHash?: string | null;
  createdBy?: string | null;
}

export interface UpdateConnectionInput {
  agentId?: string | null;
  displayName?: string | null;
  phoneNumber?: string | null;
  phoneNumberId?: string | null;
  externalInstanceId?: string | null;
  status?: WaaiWhatsappConnectionStatus;
  webhookUrl?: string | null;
  webhookSecretHash?: string | null;
  providerMetadata?: Record<string, unknown>;
  lastConnectedAt?: string | null;
  lastErrorMessage?: string | null;
}

export class WhatsappConnectionRepository {
  constructor(private readonly db: Client) {}

  async findById(id: string): Promise<WaaiWhatsappConnection | null> {
    const { data, error } = await this.db
      .from("waai_whatsapp_connections")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data;
  }

  async findByWorkspace(workspaceId: string): Promise<WaaiWhatsappConnection[]> {
    const { data, error } = await this.db
      .from("waai_whatsapp_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived")
      .order("created_at", { ascending: false });
    if (error)
      throw new Error(`WhatsappConnectionRepository.findByWorkspace: ${error.message}`);
    return data ?? [];
  }

  async findActiveByInstanceId(
    provider: WaaiWhatsappProvider,
    externalInstanceId: string
  ): Promise<WaaiWhatsappConnection | null> {
    const { data, error } = await this.db
      .from("waai_whatsapp_connections")
      .select("*")
      .eq("provider", provider)
      .eq("external_instance_id", externalInstanceId)
      .eq("status", "active")
      .limit(1)
      .single();
    if (error) return null;
    return data;
  }

  async findActiveByPhoneNumberId(
    provider: WaaiWhatsappProvider,
    phoneNumberId: string
  ): Promise<WaaiWhatsappConnection | null> {
    const { data, error } = await this.db
      .from("waai_whatsapp_connections")
      .select("*")
      .eq("provider", provider)
      .eq("phone_number_id", phoneNumberId)
      .eq("status", "active")
      .limit(1)
      .single();
    if (error) return null;
    return data;
  }

  async create(input: CreateConnectionInput): Promise<WaaiWhatsappConnection> {
    const providerMetadata: Record<string, unknown> = {};
    if (input.wabaId) providerMetadata.waba_id = input.wabaId;
    // Encrypt the provider access token at rest (AES-256-GCM). It is only
    // ever read back through getAccessToken(), which decrypts it. (DEBT-002)
    if (input.accessToken) {
      providerMetadata.access_token = encryptSecret(input.accessToken);
    }

    const { data, error } = await this.db
      .from("waai_whatsapp_connections")
      .insert({
        workspace_id: input.workspaceId,
        agent_id: input.agentId ?? null,
        provider: input.provider ?? "meta",
        display_name: input.displayName ?? null,
        phone_number: input.phoneNumber ?? null,
        phone_number_id: input.phoneNumberId ?? null,
        external_instance_id: input.externalInstanceId ?? null,
        webhook_secret_hash: input.webhookSecretHash ?? null,
        created_by: input.createdBy ?? null,
        provider_metadata: providerMetadata,
        status: "draft",
      })
      .select()
      .single();
    if (error)
      throw new Error(`WhatsappConnectionRepository.create: ${error.message}`);
    return data;
  }

  async update(id: string, input: UpdateConnectionInput): Promise<WaaiWhatsappConnection> {
    const patch: ConnectionUpdateRow = { updated_at: new Date().toISOString() };
    if (input.agentId !== undefined) patch.agent_id = input.agentId;
    if (input.displayName !== undefined) patch.display_name = input.displayName;
    if (input.phoneNumber !== undefined) patch.phone_number = input.phoneNumber;
    if (input.phoneNumberId !== undefined) patch.phone_number_id = input.phoneNumberId;
    if (input.externalInstanceId !== undefined) patch.external_instance_id = input.externalInstanceId;
    if (input.status !== undefined) patch.status = input.status;
    if (input.webhookUrl !== undefined) patch.webhook_url = input.webhookUrl;
    if (input.webhookSecretHash !== undefined) patch.webhook_secret_hash = input.webhookSecretHash;
    if (input.providerMetadata !== undefined) patch.provider_metadata = input.providerMetadata;
    if (input.lastConnectedAt !== undefined) patch.last_connected_at = input.lastConnectedAt;
    if (input.lastErrorMessage !== undefined) patch.last_error_message = input.lastErrorMessage;

    const { data, error } = await this.db
      .from("waai_whatsapp_connections")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error)
      throw new Error(`WhatsappConnectionRepository.update: ${error.message}`);
    return data;
  }

  /**
   * Return the decrypted provider access token for a connection, or null when
   * none is stored. Tolerates legacy plaintext values (pre-DEBT-002 rows) so
   * reads keep working before the migration has run. This is the only
   * supported way to read the token — callers must never read
   * provider_metadata.access_token directly.
   */
  getAccessToken(connection: WaaiWhatsappConnection): string | null {
    const meta = connection.provider_metadata as Record<string, unknown> | null;
    const raw = meta?.access_token;
    if (typeof raw !== "string" || raw.length === 0) return null;
    return decryptSecret(raw);
  }

  async updateStatus(id: string, status: WaaiWhatsappConnectionStatus): Promise<void> {
    const { error } = await this.db
      .from("waai_whatsapp_connections")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error)
      throw new Error(`WhatsappConnectionRepository.updateStatus: ${error.message}`);
  }
}
