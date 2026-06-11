import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiLeadPriority } from "@/types/database";
import { LeadRepository } from "@/server/repositories/lead-repository";
import { LeadEventRepository } from "@/server/repositories/lead-event-repository";
import { LeadDetectionRunRepository } from "@/server/repositories/lead-detection-run-repository";
import { MessageRepository } from "@/server/repositories/message-repository";
import { LeadExtractionService } from "@/server/services/lead-extraction-service";

type Client = SupabaseClient<Database>;

export interface DetectionResult {
  isLead: boolean;
  signals: string[];
  priority: WaaiLeadPriority;
  rulesMatched: string[];
}

export interface DetectAndSaveInput {
  workspaceId: string;
  agentId?: string | null;
  conversationId: string;
  channel?: string;
}

export interface DetectAndSaveResult {
  leadId: string | null;
  runId: string | null;
  status: "created" | "updated" | "no_lead" | "error";
}

// Signal patterns (multilingual: ES/EN/DE/FR/IT)
const QUOTE_SIGNALS = [
  "presupuesto", "cotización", "precio", "cuánto cuesta", "cuánto vale",
  "quote", "price", "how much", "cost", "budget",
  "offerte", "preis", "kosten", "wie viel",
  "devis", "prix", "combien",
];

const APPOINTMENT_SIGNALS = [
  "cita", "reserva", "turno", "agendar", "disponibilidad",
  "appointment", "booking", "schedule", "available", "slot",
  "termin", "buchung", "verfügbar", "reservieren",
  "rendez-vous", "réserver", "disponible",
];

const CONTACT_SIGNALS = [
  "contactarme", "me llame", "quiero hablar",
  "call me", "contact me", "speak to someone", "reach me",
  "rufen sie an", "kontaktieren",
  "rappeler", "parler à quelqu",
];

const SERVICE_SIGNALS = [
  "necesito", "quiero", "quisiera", "me interesa",
  "i need", "i want", "i'd like", "interested in",
  "ich brauche", "ich möchte", "ich suche",
  "j'ai besoin", "je veux", "je cherche",
];

const URGENCY_SIGNALS = [
  "urgente", "lo antes posible",
  "urgent", "asap", "as soon as possible", "right away",
  "dringend", "so schnell wie möglich", "sofort",
  "d'urgence", "dès que possible",
];

const PHONE_REGEX = /\+?[\d\s\-().]{7,15}/;
const EMAIL_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/;

export function detectLeadSignals(text: string): DetectionResult {
  const lower = text.toLowerCase();
  const matched: string[] = [];

  const hasQuote = QUOTE_SIGNALS.some((s) => lower.includes(s));
  const hasAppointment = APPOINTMENT_SIGNALS.some((s) => lower.includes(s));
  const hasContact = CONTACT_SIGNALS.some((s) => lower.includes(s));
  const hasService = SERVICE_SIGNALS.some((s) => lower.includes(s));
  const hasUrgency = URGENCY_SIGNALS.some((s) => lower.includes(s));
  const hasPhone = PHONE_REGEX.test(text);
  const hasEmail = EMAIL_REGEX.test(text);

  if (hasQuote) matched.push("quote_budget");
  if (hasAppointment) matched.push("appointment_booking");
  if (hasContact) matched.push("contact_intent");
  if (hasService) matched.push("service_need");
  if (hasUrgency) matched.push("urgency");
  if (hasPhone) matched.push("phone_detected");
  if (hasEmail) matched.push("email_detected");

  const isLead = matched.length > 0;

  let priority: WaaiLeadPriority = "low";
  if (hasUrgency) {
    priority = "urgent";
  } else if (matched.length >= 3 || (hasAppointment && hasService)) {
    priority = "high";
  } else if (matched.length >= 2) {
    priority = "medium";
  }

  return {
    isLead,
    signals: matched,
    priority,
    rulesMatched: matched,
  };
}

export class LeadDetectionService {
  private readonly leadRepo: LeadRepository;
  private readonly leadEventRepo: LeadEventRepository;
  private readonly detectionRunRepo: LeadDetectionRunRepository;
  private readonly msgRepo: MessageRepository;
  private readonly extractionService: LeadExtractionService;

  constructor(private readonly db: Client) {
    this.leadRepo = new LeadRepository(db);
    this.leadEventRepo = new LeadEventRepository(db);
    this.detectionRunRepo = new LeadDetectionRunRepository(db);
    this.msgRepo = new MessageRepository(db);
    this.extractionService = new LeadExtractionService(db);
  }

  async detectAndSave(input: DetectAndSaveInput): Promise<DetectAndSaveResult> {
    try {
      // Load recent messages
      const messages = await this.msgRepo.findByConversation(input.conversationId, 20);
      const userMessages = messages.filter((m) => m.role === "user" || m.role === "assistant");
      if (userMessages.length === 0) {
        return { leadId: null, runId: null, status: "no_lead" };
      }

      // Combine user messages into text for rule-based check
      const userText = userMessages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join(" ");

      const detection = detectLeadSignals(userText);

      if (!detection.isLead) {
        // Save no_lead run
        const run = await this.detectionRunRepo.create({
          workspaceId: input.workspaceId,
          agentId: input.agentId ?? null,
          conversationId: input.conversationId,
          status: "no_lead",
          inputMessagesCount: userMessages.length,
        }).catch(() => null);
        return { leadId: null, runId: run?.id ?? null, status: "no_lead" };
      }

      // Check if lead already exists
      const existingLead = await this.leadRepo.findByConversation(input.conversationId);

      // Try LLM extraction
      const extractionResult = await this.extractionService.extractWithLLM({
        workspaceId: input.workspaceId,
        agentId: input.agentId ?? null,
        conversationId: input.conversationId,
        messages: userMessages,
        rulesDetected: detection,
      });

      let leadId: string;
      let runId: string | null = extractionResult?.runId ?? null;
      let eventType: string;

      if (extractionResult?.data && extractionResult.data.is_lead) {
        // LLM extraction succeeded
        const d = extractionResult.data;
        const leadInput = {
          workspaceId: input.workspaceId,
          agentId: input.agentId ?? null,
          conversationId: input.conversationId,
          sourceChannel: (input.channel ?? "whatsapp") as "whatsapp" | "sandbox" | "web" | "manual",
          priority: (d.priority ?? detection.priority) as WaaiLeadPriority,
          customerName: d.customer_name,
          customerPhone: d.customer_phone,
          customerEmail: d.customer_email,
          requestedService: d.requested_service,
          location: d.location,
          desiredDate: d.desired_date,
          budget: d.budget,
          urgency: d.urgency,
          summary: d.summary,
          extractedData: { ...d, rules_matched: detection.rulesMatched },
          confidenceScore: d.confidence_score,
        };

        if (existingLead) {
          const updated = await this.leadRepo.update(existingLead.id, input.workspaceId, leadInput);
          leadId = updated.id;
          eventType = "lead_extracted_from_conversation";
        } else {
          const created = await this.leadRepo.create(leadInput);
          leadId = created.id;
          eventType = "lead_detected_by_ai";
        }
      } else {
        // Fallback: rule-based minimal lead
        const minimalInput = {
          workspaceId: input.workspaceId,
          agentId: input.agentId ?? null,
          conversationId: input.conversationId,
          sourceChannel: (input.channel ?? "whatsapp") as "whatsapp" | "sandbox" | "web" | "manual",
          priority: detection.priority,
          extractedData: { rules_matched: detection.rulesMatched, rule_based: true },
          confidenceScore: null as null,
        };

        if (existingLead) {
          leadId = existingLead.id;
          eventType = "lead_extracted_from_conversation";
        } else {
          const created = await this.leadRepo.create(minimalInput);
          leadId = created.id;
          eventType = "lead_detected_by_ai";
        }

        // Save detection run for rule-based
        if (!runId) {
          const run = await this.detectionRunRepo.create({
            workspaceId: input.workspaceId,
            agentId: input.agentId ?? null,
            conversationId: input.conversationId,
            leadId,
            status: "success",
            inputMessagesCount: userMessages.length,
            extractedData: { rules_matched: detection.rulesMatched, rule_based: true },
          }).catch(() => null);
          runId = run?.id ?? null;
        }
      }

      // Log lead event
      await this.leadEventRepo.log({
        workspaceId: input.workspaceId,
        leadId,
        actorUserId: null,
        eventType,
        metadata: { conversation_id: input.conversationId, signals: detection.rulesMatched },
      }).catch(() => null);

      return {
        leadId,
        runId,
        status: existingLead ? "updated" : "created",
      };
    } catch {
      return { leadId: null, runId: null, status: "error" };
    }
  }
}
