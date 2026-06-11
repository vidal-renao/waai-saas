# Architecture 27 — Leads Architecture

## Overview

The leads module captures and manages commercial opportunities extracted from conversations. It is NOT a generic CRM — it is the minimal commercial layer for a WhatsApp AI Agent SaaS.

## Data Model

### waai_leads
Primary table. One lead per conversation (enforced at service level, not DB constraint to allow future multi-lead).

Key fields:
- `source_channel`: whatsapp | sandbox | web | manual
- `status`: new → qualified → contacted → won/lost → archived
- `priority`: low | medium | high | urgent
- `extracted_data`: raw JSON from LLM extractor
- `confidence_score`: 0.0–1.0 float from LLM
- `assigned_to`: FK to auth.users

### waai_lead_events
Append-only audit log. Every status change, assignment, AI detection event is logged here.

### waai_lead_detection_runs
Stores each detection/extraction attempt. Records model used, latency, confidence, extracted data, errors. Enables debugging and quality improvement.

## Lead Detection Pipeline

```
Inbound message
      ↓
AgentRuntimeService.processMessage()
      ↓ (success)
AI response sent to customer
      ↓
LeadDetectionService.detectFromConversation()  ← non-blocking try/catch
      ↓
  Rule-based check  →  signals found?
      ↓ yes
  ANTHROPIC_API_KEY exists?
  ├── yes → LeadExtractionService.extractWithLLM()
  │           ↓
  │       Zod validate JSON
  │           ↓
  │       confidence ≥ 0.5?
  │       ├── yes → create/update lead
  │       └── no  → create minimal rule-based lead
  └── no  → create minimal rule-based lead
      ↓
  Save waai_lead_detection_run
  Create/update waai_lead
  Log waai_lead_event (lead_detected_by_ai)
```

### Non-Blocking Contract
`LeadDetectionService.detectFromConversation()` MUST:
- Never throw (wrap entirely in try/catch)
- Return a result object or null
- Never delay the HTTP response to the customer
- Be called AFTER the AI response has been stored and sent

## Repository Layer

```
LeadRepository
  findById(id, workspaceId)
  findByWorkspace(workspaceId, opts)
  findByConversation(conversationId)
  create(input)
  update(id, input)
  updateStatus(id, status)

LeadEventRepository
  log(input)
  findByLead(leadId, limit)

LeadDetectionRunRepository
  create(input)
  findByConversation(conversationId, limit)
```

## Service Layer

### LeadService
Business logic: create, update, status transition validation, workspace checks.

### LeadDetectionService
Rule-based detector. Returns `{ isLead: boolean; signals: string[]; priority: LeadPriority }`.
Never calls external APIs directly.

### LeadExtractionService  
Optional LLM extractor. Uses LLMProvider abstraction. Validates output with Zod. Saves detection run.
Returns `ExtractedLeadData | null`.

## Use Cases

| Use Case                      | Actor                | Description                                  |
|-------------------------------|----------------------|----------------------------------------------|
| list-leads                    | member               | List workspace leads with filters            |
| get-lead                      | member               | Get lead detail + events                     |
| update-lead-status            | owner/admin/manager/agent | Transition lead status                  |
| assign-lead                   | owner/admin/manager  | Assign lead to workspace member              |
| create-lead-from-conversation | member               | Manual lead creation from a conversation     |

## API Routes

```
GET  /api/leads                          List leads (workspace-scoped)
GET  /api/leads/[leadId]                 Lead detail
PUT  /api/leads/[leadId]                 Update lead fields
POST /api/leads/[leadId]/status          Update lead status
POST /api/leads/[leadId]/assign          Assign lead to member
POST /api/conversations/[id]/lead        Create lead from conversation
```

## Integration Points

- **WhatsAppWebhookService**: calls `LeadDetectionService` after AI response, non-blocking
- **Sandbox**: `create-lead-from-conversation` use case available from conversation detail page
- **Conversation detail page**: shows lead panel if lead exists, button to create manually
