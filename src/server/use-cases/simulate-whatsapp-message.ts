import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWorkspaceRole } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { WhatsappConnectionRepository } from "@/server/repositories/whatsapp-connection-repository";
import { WhatsappWebhookService } from "@/server/services/whatsapp-webhook-service";
import { MockWhatsAppProvider } from "@/lib/whatsapp/mock-whatsapp-provider";

type Client = SupabaseClient<Database>;

export interface SimulateMessageInput {
  connectionId: string;
  fromNumber: string;
  text: string;
}

export interface SimulateMessageResult {
  success: boolean;
  eventId?: string;
  reply?: string;
  errorMessage?: string;
}

const ALLOWED_ROLES: WaaiWorkspaceRole[] = ["owner", "admin", "agent_manager"];

export async function simulateWhatsappMessageUseCase(
  db: Client,
  userId: string,
  input: SimulateMessageInput
): Promise<SimulateMessageResult | { error: string; code: string }> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return { error: "Workspace no encontrado.", code: "FORBIDDEN" };

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership || !ALLOWED_ROLES.includes(membership.role as WaaiWorkspaceRole)) {
    return { error: "No tienes permisos para simular mensajes.", code: "FORBIDDEN" };
  }

  const connRepo = new WhatsappConnectionRepository(db);
  const connection = await connRepo.findById(input.connectionId);
  if (!connection || connection.workspace_id !== workspaceId) {
    return { error: "Conexión no encontrada.", code: "NOT_FOUND" };
  }

  // Build a mock webhook payload that MockWhatsAppProvider can normalize
  const mock = new MockWhatsAppProvider();
  const normalized = mock.normalizeIncomingMessage({
    from: input.fromNumber,
    text: input.text,
    chatId: `${input.fromNumber}@s.whatsapp.net`,
    toNumber: connection.phone_number ?? "WAAI",
  });

  if (!normalized) {
    return { success: false, errorMessage: "Could not normalize mock message" };
  }

  // Build raw body as if Whapi sent it (Mock provider accepts any payload)
  const mockPayload = {
    event: {
      type: "messages",
      data: {
        messages: [
          {
            id: normalized.externalMessageId,
            chatId: normalized.externalChatId,
            from: `${input.fromNumber}@s.whatsapp.net`,
            to: `${connection.phone_number ?? "WAAI"}@s.whatsapp.net`,
            type: "text",
            body: input.text,
            timestamp: Math.floor(Date.now() / 1000),
            fromMe: false,
          },
        ],
      },
    },
    channelId: connection.external_instance_id ?? "simulate",
  };

  // Temporarily force mock provider for simulation
  const originalProvider = process.env.WHATSAPP_PROVIDER;
  process.env.WHATSAPP_PROVIDER = "mock";

  const webhookSvc = new WhatsappWebhookService(db);
  const result = await webhookSvc.processWebhook({
    rawBody: JSON.stringify(mockPayload),
    headers: { "x-whapi-token": "mock" },
  });

  // Restore original provider setting
  if (originalProvider !== undefined) {
    process.env.WHATSAPP_PROVIDER = originalProvider;
  } else {
    delete process.env.WHATSAPP_PROVIDER;
  }

  return {
    success: result.status === "processed",
    eventId: result.eventId,
    errorMessage: result.errorMessage,
  };
}
