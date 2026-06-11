import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWhatsappProvider } from "@/types/database";
import { WhatsappConnectionRepository } from "@/server/repositories/whatsapp-connection-repository";
import { WhatsappWebhookEventRepository } from "@/server/repositories/whatsapp-webhook-event-repository";
import { WhatsappMessageRepository } from "@/server/repositories/whatsapp-message-repository";
import { WhatsappConnectionEventRepository } from "@/server/repositories/whatsapp-connection-event-repository";
import { ConversationRepository } from "@/server/repositories/conversation-repository";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { AgentRuntimeService } from "@/server/services/agent-runtime-service";
import { WhatsappMessageService } from "@/server/services/whatsapp-message-service";
import { LeadDetectionService } from "@/server/services/lead-detection-service";
import { createWhatsAppProvider } from "@/lib/whatsapp/whatsapp-provider-factory";
import type { VerifyWebhookInput } from "@/lib/whatsapp/types";

type Client = SupabaseClient<Database>;

export interface WebhookProcessInput {
  rawBody: string;
  headers: Record<string, string>;
  query?: Record<string, string>;
}

export interface WebhookProcessResult {
  status: "processed" | "ignored" | "failed" | "invalid";
  eventId?: string;
  errorMessage?: string;
}

export class WhatsappWebhookService {
  private readonly connRepo: WhatsappConnectionRepository;
  private readonly webhookEventRepo: WhatsappWebhookEventRepository;
  private readonly waaMsgRepo: WhatsappMessageRepository;
  private readonly connEventRepo: WhatsappConnectionEventRepository;
  private readonly convRepo: ConversationRepository;
  private readonly agentRepo: AgentRepository;
  private readonly runtime: AgentRuntimeService;
  private readonly msgService: WhatsappMessageService;
  private readonly leadDetectionService: LeadDetectionService;

  constructor(private readonly db: Client) {
    this.connRepo = new WhatsappConnectionRepository(db);
    this.webhookEventRepo = new WhatsappWebhookEventRepository(db);
    this.waaMsgRepo = new WhatsappMessageRepository(db);
    this.connEventRepo = new WhatsappConnectionEventRepository(db);
    this.convRepo = new ConversationRepository(db);
    this.agentRepo = new AgentRepository(db);
    this.runtime = new AgentRuntimeService(db);
    this.msgService = new WhatsappMessageService(db);
    this.leadDetectionService = new LeadDetectionService(db);
  }

  async processWebhook(input: WebhookProcessInput): Promise<WebhookProcessResult> {
    // 1. Instantiate provider
    let provider;
    try {
      provider = createWhatsAppProvider();
    } catch {
      return { status: "failed", errorMessage: "provider_not_configured" };
    }

    // 2. Verify webhook signature
    const verifyInput: VerifyWebhookInput = {
      headers: input.headers,
      rawBody: input.rawBody,
      query: input.query,
    };
    const verification = provider.verifyWebhook(verifyInput);
    if (!verification.valid) {
      return { status: "invalid", errorMessage: "invalid_webhook_signature" };
    }

    // 3. Parse payload
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(input.rawBody) as Record<string, unknown>;
    } catch {
      return { status: "invalid", errorMessage: "invalid_json_payload" };
    }

    // 4. Persist raw event (no workspace_id yet — will update after connection lookup)
    let webhookEvent;
    try {
      webhookEvent = await this.webhookEventRepo.create({
        provider: provider.getProviderName(),
        eventType: "messages",
        rawPayload: payload,
        direction: "inbound",
      });
    } catch {
      // If persistence fails, still return ok to prevent Whapi retries
      return { status: "failed", errorMessage: "event_persistence_failed" };
    }

    const eventId = webhookEvent.id;

    // 5. Normalize
    const normalized = provider.normalizeIncomingMessage(payload);
    if (!normalized) {
      await this.webhookEventRepo.updateStatus(eventId, "ignored", {
        normalizedPayload: {},
      });
      return { status: "ignored", eventId };
    }

    // 6. Skip non-text messages
    if (normalized.messageType !== "text" || !normalized.text) {
      await this.webhookEventRepo.updateStatus(eventId, "ignored", {
        normalizedPayload: this.toRecord(normalized),
        errorMessage: `unsupported_message_type:${normalized.messageType}`,
      });
      return { status: "ignored", eventId };
    }

    // 7. Find active connection
    const providerName = provider.getProviderName() as WaaiWhatsappProvider;
    const connection = await this.connRepo.findActiveByInstanceId(
      providerName,
      normalized.externalChatId.split("@")[0] ?? ""
    ) ?? await this.connRepo.findActiveByInstanceId(
      providerName,
      normalized.toNumber
    );

    if (!connection) {
      await this.webhookEventRepo.updateStatus(eventId, "failed", {
        normalizedPayload: this.toRecord(normalized),
        errorMessage: "active_connection_not_found",
      });
      return { status: "failed", eventId, errorMessage: "active_connection_not_found" };
    }

    // Update event with workspace + connection
    await this.webhookEventRepo.updateStatus(eventId, "processing", {
      connectionId: connection.id,
      workspaceId: connection.workspace_id,
      normalizedPayload: this.toRecord(normalized),
    } as Parameters<typeof this.webhookEventRepo.updateStatus>[2]);

    // 8. Idempotency check
    const isDuplicate = await this.msgService.isDuplicate(
      connection.id,
      normalized.externalMessageId
    );
    if (isDuplicate) {
      await this.webhookEventRepo.updateStatus(eventId, "ignored", {
        errorMessage: "duplicate_message",
      });
      return { status: "ignored", eventId };
    }

    // 9. Validate agent
    if (!connection.agent_id) {
      await this.webhookEventRepo.updateStatus(eventId, "ignored", {
        errorMessage: "no_agent_assigned",
      });
      return { status: "ignored", eventId };
    }

    const agent = await this.agentRepo.findById(connection.agent_id);
    if (!agent || agent.status !== "active") {
      await this.webhookEventRepo.updateStatus(eventId, "ignored", {
        errorMessage: `agent_not_active:${agent?.status ?? "not_found"}`,
      });
      return { status: "ignored", eventId };
    }

    // 10. Find or create conversation
    let conversation = await this.convRepo.findByExternalConversationId(
      connection.workspace_id,
      connection.agent_id,
      "whatsapp",
      normalized.externalChatId
    );

    if (!conversation) {
      conversation = await this.convRepo.create({
        workspaceId: connection.workspace_id,
        agentId: connection.agent_id,
        channel: "whatsapp",
        externalConversationId: normalized.externalChatId,
        title: `WhatsApp · ${normalized.fromNumber}`,
        createdBy: null,
      });
    }

    // 11. Persist inbound WhatsApp message
    const inboundWaMsg = await this.msgService.createInbound({
      workspaceId: connection.workspace_id,
      connectionId: connection.id,
      conversationId: conversation.id,
      externalMessageId: normalized.externalMessageId,
      externalChatId: normalized.externalChatId,
      fromNumber: normalized.fromNumber,
      toNumber: normalized.toNumber,
      messageType: normalized.messageType,
      textContent: normalized.text,
      providerMetadata: { raw: normalized.rawPayload },
    });

    // ── FASE 6: Check active handoff before calling Claude ──────────────────
    // 11b. Check if automation is paused
    const { data: hasHandoff } = await this.db.rpc("waai_has_active_handoff", {
      p_conversation_id: conversation.id,
    });

    if (hasHandoff) {
      // Store inbound message (already done above), skip Claude, mark processed
      await this.webhookEventRepo.updateStatus(eventId, "processed");
      await this.connEventRepo.log(
        connection.workspace_id,
        connection.id,
        null,
        "inbound_message_received",
        {
          from: normalized.fromNumber,
          conversation_id: conversation.id,
          automation_paused: true,
        }
      );
      return { status: "processed", eventId };
    }
    // ────────────────────────────────────────────────────────────────────────

    // 12. Call AgentRuntimeService
    const runtimeResult = await this.runtime.processMessage({
      workspaceId: connection.workspace_id,
      agentId: connection.agent_id,
      conversationId: conversation.id,
      externalConversationId: normalized.externalChatId,
      userMessage: normalized.text,
      channel: "whatsapp",
      userId: null,
      userRole: null,
      metadata: { from_number: normalized.fromNumber },
    });

    if ("code" in runtimeResult) {
      await this.webhookEventRepo.updateStatus(eventId, "failed", {
        errorMessage: `runtime_error:${runtimeResult.code}`,
      });
      await this.connEventRepo.log(
        connection.workspace_id,
        connection.id,
        null,
        "inbound_message_received",
        { error: runtimeResult.code }
      );
      return { status: "failed", eventId, errorMessage: runtimeResult.code };
    }

    const replyText = runtimeResult.assistantMessage.content;

    // 13. Send reply via provider
    const sendResult = await provider.sendTextMessage({
      connection,
      to: normalized.fromNumber,
      text: replyText,
    });

    // 14. Persist outbound WhatsApp message
    const outboundWaMsg = await this.msgService.createOutbound({
      workspaceId: connection.workspace_id,
      connectionId: connection.id,
      conversationId: conversation.id,
      messageId: runtimeResult.assistantMessage.id,
      externalMessageId: sendResult.externalMessageId,
      externalChatId: normalized.externalChatId,
      fromNumber: normalized.toNumber,
      toNumber: normalized.fromNumber,
      messageType: "text",
      textContent: replyText,
      providerMetadata: { raw_response: sendResult.rawResponse },
      sentAt: sendResult.success ? new Date().toISOString() : null,
      deliveryStatus: sendResult.success ? "sent" : "failed",
    });

    if (!sendResult.success) {
      await this.msgService.markOutboundFailed(
        outboundWaMsg.id,
        sendResult.errorMessage ?? "send_failed"
      );
      await this.webhookEventRepo.updateStatus(eventId, "failed", {
        errorMessage: `send_failed:${sendResult.errorMessage}`,
      });
      return { status: "failed", eventId, errorMessage: "send_failed" };
    }

    // 15. Update inbound delivery status
    await this.waaMsgRepo.updateDeliveryStatus(inboundWaMsg.id, "received");

    // 16. Mark event processed
    await this.webhookEventRepo.updateStatus(eventId, "processed");

    // 17. Log connection event
    await this.connEventRepo.log(
      connection.workspace_id,
      connection.id,
      null,
      "inbound_message_received",
      {
        from: normalized.fromNumber,
        conversation_id: conversation.id,
        run_id: runtimeResult.run.id,
      }
    );

    // ── FASE 6: Lead detection — non-blocking, runs after response ──────────
    // 18. Run lead detection asynchronously (inline try/catch — never blocks)
    this.leadDetectionService.detectAndSave({
      workspaceId: connection.workspace_id,
      agentId: connection.agent_id,
      conversationId: conversation.id,
      channel: "whatsapp",
    }).catch(() => {
      // Silently ignore — detection must never break the webhook response
    });
    // ────────────────────────────────────────────────────────────────────────

    return { status: "processed", eventId };
  }

  private toRecord(obj: unknown): Record<string, unknown> {
    if (obj && typeof obj === "object") {
      return obj as Record<string, unknown>;
    }
    return {};
  }
}
