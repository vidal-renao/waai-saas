# Architecture 30 — Lead Detection and Extraction

## Overview

Two-phase process:
1. **Detection**: determine if a conversation contains commercial intent (rule-based, fast).
2. **Extraction**: extract structured lead data from detected conversations (LLM, optional).

## LeadDetectionService

Pure TypeScript, no external APIs. Always available.

### Signals (multilingual: ES / EN / DE / FR / IT)

**Quote/Budget signals:**
- presupuesto, cotización, precio, cuánto cuesta, cuánto vale
- quote, price, how much, cost, budget
- offerte, preis, kosten, wie viel
- devis, prix, combien ça coûte

**Appointment/Booking signals:**
- cita, reserva, turno, agendar, disponibilidad
- appointment, booking, schedule, available, slot
- termin, buchung, verfügbar, reservieren
- rendez-vous, réserver, disponible

**Contact intent:**
- contactarme, me llame, quiero hablar
- call me, contact me, speak to someone, reach me
- rufen sie an, kontaktieren, ich möchte sprechen
- rappeler, parler à quelqu'un

**Service need:**
- necesito, quiero, quisiera, me interesa
- I need, I want, I'd like, interested in
- ich brauche, ich möchte, ich suche
- j'ai besoin, je veux, je cherche

**Urgency:**
- urgente, lo antes posible, ya
- urgent, asap, as soon as possible, right away
- dringend, so schnell wie möglich, sofort
- urgent, dès que possible

**Data patterns:**
- Phone: regex `\+?[\d\s\-\(\)]{7,15}`
- Email: regex `\S+@\S+\.\S+`

### Detection Result
```typescript
interface DetectionResult {
  isLead: boolean;
  signals: string[];
  priority: "low" | "medium" | "high" | "urgent";
  rulesMatched: string[];
}
```

**Priority scoring:**
- urgency signal → urgent
- 3+ different signal types → high
- appointment + service → high
- 1-2 signals → medium
- phone/email only → low

## LeadExtractionService (optional LLM)

Runs only if `process.env.ANTHROPIC_API_KEY` is set. Uses `LLMProvider` abstraction with low temperature (0.1).

### Prompt Strategy
- System: strict JSON extractor role
- User: conversation transcript + extraction schema
- Temperature: 0.1 (consistent, structured output)
- Max tokens: 600
- Model: from `ANTHROPIC_MODEL` env var

### Output Validation (Zod)
```typescript
const extractionSchema = z.object({
  is_lead: z.boolean(),
  confidence_score: z.number().min(0).max(1),
  detected_intent: z.string().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).nullable(),
  customer_name: z.string().nullable(),
  customer_phone: z.string().nullable(),
  customer_email: z.string().nullable(),
  requested_service: z.string().nullable(),
  location: z.string().nullable(),
  desired_date: z.string().nullable(),
  budget: z.string().nullable(),
  urgency: z.string().nullable(),
  summary: z.string().nullable(),
  handoff_recommended: z.boolean().nullable(),
  handoff_reason: z.string().nullable(),
});
```

### Failure Modes
| Failure              | Behavior                                                  |
|----------------------|-----------------------------------------------------------|
| No ANTHROPIC_API_KEY | Skip LLM, use rule-based minimal lead                    |
| JSON parse error     | Log error, use rule-based minimal lead                   |
| Zod validation fail  | Log error, use rule-based minimal lead                   |
| is_lead = false      | Do not create lead even if rules matched (trust LLM)     |
| confidence < 0.4     | Create lead as `new` with low priority                   |
| API timeout          | Use rule-based minimal lead                              |
| Rate limit           | Use rule-based minimal lead                              |

## Lead Detection Run Record

Every extraction attempt (success or failure) is saved to `waai_lead_detection_runs`:
- `status`: success | no_lead | error
- `input_messages_count`: number of messages analyzed
- `confidence_score`: from LLM or null for rule-based
- `extracted_data`: full JSON from LLM
- `error_message`: if failed
- `latency_ms`: LLM call duration
- `provider` / `model`: which LLM was used

## Deduplication Logic

Before creating a lead:
1. Check `LeadRepository.findByConversation(conversationId)`
2. If lead exists with status != 'archived': UPDATE extracted fields (merge, not replace)
3. If no lead: CREATE new lead
4. Always log `waai_lead_event` (lead_detected_by_ai or lead_extracted_from_conversation)

## Integration Point in WhatsApp Webhook

```typescript
// After step 14 (outbound message persisted) in WhatsappWebhookService:
try {
  await this.leadDetectionService.detectAndSave({
    workspaceId: connection.workspace_id,
    agentId: connection.agent_id,
    conversationId: conversation.id,
    channel: "whatsapp",
  });
} catch {
  // silently ignore — never block webhook response
}
```

## Message History for Extraction

Last N messages (default: 20) from `waai_messages` for the conversation.
Format: `role: content` pairs as conversation transcript.
System messages excluded.
