# Prompt 05 — Lead Detection and Extraction Prompting

## Purpose

Extract structured lead data from a WhatsApp/sandbox conversation transcript.

## System Prompt

```
You are a precise lead extraction assistant for a WhatsApp AI Agent platform.
Your task is to analyze a conversation transcript and extract structured commercial lead information.

RULES:
- Respond ONLY with valid JSON. No markdown, no explanation, no extra text.
- Use null for fields that cannot be determined from the conversation.
- Do not invent or hallucinate data not present in the conversation.
- confidence_score should reflect how certain you are that this is a real commercial lead (0.0 to 1.0).
- detected_intent should be one of: quote_request, appointment_request, service_inquiry, contact_request, information_request, complaint, other
- priority should reflect urgency and value: low | medium | high | urgent
```

## User Prompt Template

```
Analyze the following conversation and extract lead information.

CONVERSATION:
{{conversation_transcript}}

Respond with a single JSON object matching this exact schema:
{
  "is_lead": boolean,
  "confidence_score": number between 0 and 1,
  "detected_intent": string or null,
  "priority": "low" | "medium" | "high" | "urgent" | null,
  "customer_name": string or null,
  "customer_phone": string or null,
  "customer_email": string or null,
  "requested_service": string or null,
  "location": string or null,
  "desired_date": string or null,
  "budget": string or null,
  "urgency": string or null,
  "summary": string (max 200 chars) or null,
  "handoff_recommended": boolean or null,
  "handoff_reason": string or null
}
```

## LLM Parameters

| Parameter   | Value                            |
|-------------|----------------------------------|
| temperature | 0.1                              |
| max_tokens  | 600                              |
| model       | process.env.ANTHROPIC_MODEL      |
| stop        | none                             |

## Conversation Transcript Format

```
user: [message content]
assistant: [message content]
user: [message content]
...
```

System messages are excluded. Maximum 20 most recent messages.

## Example Output

```json
{
  "is_lead": true,
  "confidence_score": 0.88,
  "detected_intent": "quote_request",
  "priority": "high",
  "customer_name": "María",
  "customer_phone": "+41 79 123 45 67",
  "customer_email": null,
  "requested_service": "Umzugsreinigung",
  "location": "Basel, Schweiz",
  "desired_date": "nächsten Freitag",
  "budget": null,
  "urgency": "diese Woche",
  "summary": "Customer requests a move-out cleaning quote in Basel for next Friday.",
  "handoff_recommended": false,
  "handoff_reason": null
}
```

## Non-Lead Example Output

```json
{
  "is_lead": false,
  "confidence_score": 0.05,
  "detected_intent": "information_request",
  "priority": null,
  "customer_name": null,
  "customer_phone": null,
  "customer_email": null,
  "requested_service": null,
  "location": null,
  "desired_date": null,
  "budget": null,
  "urgency": null,
  "summary": "Customer asked about opening hours only.",
  "handoff_recommended": false,
  "handoff_reason": null
}
```

## Zod Schema (TypeScript)

```typescript
import { z } from "zod";

export const leadExtractionOutputSchema = z.object({
  is_lead: z.boolean(),
  confidence_score: z.number().min(0).max(1),
  detected_intent: z.string().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).nullable(),
  customer_name: z.string().max(200).nullable(),
  customer_phone: z.string().max(30).nullable(),
  customer_email: z.string().email().nullable().catch(null),
  requested_service: z.string().max(200).nullable(),
  location: z.string().max(200).nullable(),
  desired_date: z.string().max(100).nullable(),
  budget: z.string().max(100).nullable(),
  urgency: z.string().max(100).nullable(),
  summary: z.string().max(300).nullable(),
  handoff_recommended: z.boolean().nullable(),
  handoff_reason: z.string().max(300).nullable(),
});

export type LeadExtractionOutput = z.infer<typeof leadExtractionOutputSchema>;
```

## Error Handling

If `JSON.parse()` throws or Zod validation fails:
1. Log error to `waai_lead_detection_runs` with `status: 'error'`
2. Fall back to rule-based minimal lead if rules matched
3. Never surface raw LLM output to the user or to the customer
