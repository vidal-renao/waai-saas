import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { WhatsappWebhookService } from "@/server/services/whatsapp-webhook-service";
import type { WebhookProcessInput, WebhookProcessResult } from "@/server/services/whatsapp-webhook-service";

type Client = SupabaseClient<Database>;

// Thin orchestration wrapper — real logic lives in WhatsappWebhookService
export async function processWhatsappWebhookUseCase(
  db: Client,
  input: WebhookProcessInput
): Promise<WebhookProcessResult> {
  const svc = new WhatsappWebhookService(db);
  return svc.processWebhook(input);
}
