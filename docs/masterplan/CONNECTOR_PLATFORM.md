# WAAI v3 — Connector Platform Design
**Document Type:** Architecture Reference  
**Date:** 2026-06-30  
**Status:** Authoritative

---

## Overview

The Connector Platform is the abstraction layer between WAAI's execution engine and all external communication channels and enterprise systems. It extends the existing WhatsApp provider pattern (ADR-0003) into a universal, pluggable connector architecture.

**Design principle:** Business logic never knows which connector is active. Adding a new connector requires implementing one interface — no changes to agent runtime, workflow engine, or any other domain.

---

## Connector Registry

### Architecture

```
ConnectorRegistry (singleton, initialized at startup)
├── ConnectorFactory       — creates instances from workspace config
├── ConnectorHealthMonitor — periodic health checks, circuit breaker
└── ConnectorCatalog       — available connectors (registered at build time)
```

```typescript
// src/lib/connectors/connector-registry.ts
export class ConnectorRegistry {
  private connectors: Map<string, ConnectorFactory> = new Map();

  register(type: ConnectorType, factory: ConnectorFactory): void {
    this.connectors.set(type, factory);
  }

  create(config: WorkspaceConnectorConfig): Connector {
    const factory = this.connectors.get(config.type);
    if (!factory) throw new ConnectorNotFoundError(config.type);
    return factory.create(config);
  }

  listAvailable(): ConnectorType[] {
    return Array.from(this.connectors.keys());
  }
}
```

### Connector Interface (v3)

Extends and replaces the current `WhatsappProvider` interface:

```typescript
// src/lib/connectors/types.ts
export interface Connector {
  // Identity
  readonly type: ConnectorType;
  readonly capabilities: ConnectorCapability[];  // 'send' | 'receive' | 'read' | 'write'

  // Lifecycle
  initialize(config: ConnectorConfig): Promise<void>;
  health(): Promise<ConnectorHealth>;
  disconnect(): Promise<void>;

  // Messaging
  send(message: OutboundMessage): Promise<SendResult>;
  verify(payload: string | Buffer, signature: string, config: ConnectorConfig): boolean;

  // Normalization (provider-specific → canonical)
  normalize(raw: unknown): InboundMessage | null;
}

export type ConnectorType =
  | 'whatsapp_whapi'
  | 'whatsapp_meta'
  | 'email_resend'
  | 'email_imap'
  | 'teams'
  | 'slack'
  | 'telegram'
  | 'salesforce'
  | 'hubspot'
  | 'google_calendar'
  | 'outlook_calendar'
  | 'google_drive'
  | 'sharepoint'
  | 'generic_webhook'
  | 'mcp';

export type ConnectorCapability = 'send' | 'receive' | 'read' | 'write' | 'schedule';
```

---

## Connector 1 — WhatsApp (Whapi)

### Status
Production-ready. Webhook verification working. Send/receive working.

### Missing
Token encryption at rest (`ENCRYPTION_KEY` defined but never used).

### Phase A action
```typescript
// src/lib/connectors/whatsapp/whapi-connector.ts
// Add: encrypt access_token before insert, decrypt before use
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function encryptToken(plaintext: string): string { ... }
function decryptToken(ciphertext: string): string { ... }
```

---

## Connector 2 — WhatsApp (Meta Cloud API)

### Status
**MISSING.** No `MetaCloudApiProvider` class. Factory has no `"meta"` case. ADR-0007 documents migration intent.

### Implementation Plan

```typescript
// src/lib/connectors/whatsapp/meta-connector.ts
export class MetaCloudApiConnector implements Connector {
  readonly type = 'whatsapp_meta';
  readonly capabilities: ConnectorCapability[] = ['send', 'receive'];

  private phoneNumberId: string;
  private accessToken: string;
  private appSecret: string;
  private readonly API_BASE = 'https://graph.facebook.com/v19.0';

  async send(message: OutboundMessage): Promise<SendResult> {
    const response = await fetch(`${this.API_BASE}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: message.to,
        type: 'text',
        text: { body: message.text },
      }),
    });
    const data = await response.json();
    return { messageId: data.messages[0].id, status: 'sent' };
  }

  verify(payload: string, signature: string, config: ConnectorConfig): boolean {
    const hmac = createHmac('sha256', config.appSecret);
    hmac.update(payload, 'utf-8');
    const expected = `sha256=${hmac.digest('hex')}`;
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  normalize(raw: unknown): InboundMessage | null {
    // Meta Cloud API webhook format → canonical InboundMessage
    const entry = (raw as MetaWebhookPayload).entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message) return null;

    return {
      from: message.from,
      text: message.text?.body ?? '',
      timestamp: new Date(parseInt(message.timestamp) * 1000),
      externalId: message.id,
      contactName: change.value.contacts?.[0]?.profile?.name,
    };
  }
}
```

### DB: Add Meta fields to `waai_whatsapp_connections`

```sql
ALTER TABLE waai_whatsapp_connections
  ADD COLUMN IF NOT EXISTS phone_number_id text,
  ADD COLUMN IF NOT EXISTS waba_id text,
  ADD COLUMN IF NOT EXISTS app_secret_encrypted text;
```

---

## Connector 3 — Email

### Architecture

```
EmailConnector
├── ResendSendConnector   — outbound transactional (Phase E)
├── SendGridConnector     — outbound bulk (Phase F)
└── IMAPConnector         — inbound polling (Phase F)
```

### Inbound Email → Agent Flow

```
Customer Email → Resend Inbound Webhook → /api/webhooks/email
                                              ↓
                                     EmailNormalizer
                                              ↓
                                   (same agent pipeline)
                                              ↓
                                   Email Reply via Resend
```

### DB
```sql
CREATE TABLE waai_email_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references waai_workspaces(id) on delete cascade,
  agent_id uuid references waai_agents(id) on delete cascade,
  provider text not null check (provider in ('resend', 'sendgrid', 'imap')),
  from_email text not null,
  from_name text,
  resend_api_key_encrypted text,
  inbound_webhook_secret text,
  is_active bool default true,
  created_at timestamptz default now()
);
```

---

## Connector 4 — Microsoft Teams

### Architecture

```
Teams Bot Framework Registration (Azure)
     ↓
/api/webhooks/teams (Bot Framework Activity handler)
     ↓
TeamsConnector.normalize() → canonical InboundMessage
     ↓
(same agent pipeline)
     ↓
TeamsConnector.send() → Bot Framework reply activity
```

### Auth
Service principal with Teams Admin consent. Bot token refreshed automatically via Azure AD.

### Constraints
- Teams limits bot messages to 1,500 chars (vs WhatsApp 1,600)
- Supports rich cards (Adaptive Cards) for structured responses — use for booking confirmations
- Threading: reply in-thread to preserve conversation context

---

## Connector 5 — Slack

### Architecture

```
Slack App with Event Subscriptions + Bot Token
     ↓
/api/webhooks/slack (POST from Slack Events API)
     ↓
SlackConnector.normalize() → canonical InboundMessage
     ↓
(same agent pipeline)
     ↓
SlackConnector.send() → chat.postMessage API
```

### Signature verification
```typescript
verify(payload: string, signature: string): boolean {
  const timestamp = this.extractTimestamp(signature);
  const baseString = `v0:${timestamp}:${payload}`;
  const computed = createHmac('sha256', this.signingSecret).update(baseString).digest('hex');
  return timingSafeEqual(Buffer.from(`v0=${computed}`), Buffer.from(signature));
}
```

---

## Connector 6 — Telegram

### Architecture
```
Telegram Bot API (polling or webhook)
     ↓
/api/webhooks/telegram
     ↓
TelegramConnector.normalize()
     ↓
(same agent pipeline)
     ↓
TelegramConnector.send() → sendMessage API
```

No signature verification native to Telegram — use secret_token in webhook registration.

---

## Connector 7 — CRM Connectors

### Salesforce
```typescript
export class SalesforceConnector implements Connector {
  readonly type = 'salesforce';
  readonly capabilities: ConnectorCapability[] = ['read', 'write'];

  async read(query: CRMQuery): Promise<CRMRecord[]> {
    // SOQL query via REST API
  }

  async write(record: CRMRecord): Promise<CRMWriteResult> {
    // Create/Update via REST API, with approval gate if configured
  }
}
```

### HubSpot
Same pattern. OAuth2 authentication stored encrypted per workspace.

### CRM Tool Integration
When a CRM connector is active, these tools become available to agents:
- `lookup_contact(phone)` — find contact in CRM
- `create_lead(data)` — create lead record
- `update_deal_stage(id, stage)` — advance deal (approval required)
- `get_company(id)` — read company data

---

## Connector 8 — Calendar Connectors

### Google Calendar
```typescript
createEvent(details: CalendarEventDetails): Promise<CalendarEvent>
getAvailableSlots(attendees: string[], duration: number): Promise<TimeSlot[]>
```

### Microsoft Outlook Calendar
Same interface via Microsoft Graph API. Auth via Azure AD service principal or delegated OAuth.

### Agent Use Case
Customer asks "book me an appointment for Thursday". Agent uses `getAvailableSlots()`, proposes options, books on confirmation via `createEvent()`. Human approval configurable per workspace.

---

## Connector 9 — Document Connectors

### Google Drive
```typescript
export class GoogleDriveConnector implements Connector {
  readonly capabilities = ['read'];

  async readDocument(fileId: string): Promise<DocumentContent>;
  async listDocuments(folderId: string): Promise<DocumentMetadata[]>;
}
```

Documents pulled from Drive are ingested into the Knowledge Domain's RAG pipeline. Auto-refresh on file change via Drive webhook.

### SharePoint
Same pattern via Microsoft Graph API. Supports SharePoint sites and OneDrive.

---

## Connector 10 — MCP (Model Context Protocol)

### Role
WAAI acts as both an MCP **client** (consuming external MCP servers) and an MCP **server** (exposing WAAI capabilities to external agents).

### As MCP Client
External MCP servers (database tools, code executors, search engines) registered as tools in the Tool Registry. Agents discover and call MCP tools transparently.

### As MCP Server
WAAI exposes:
```
mcp://waai.ai/tools/
├── search_knowledge   — search agent's knowledge base
├── create_lead        — create a lead in workspace
├── get_agent_config   — read agent configuration
└── send_message       — trigger agent message
```

---

## Connector Isolation Pattern

```
Each connector is isolated:
├── Its own credentials (encrypted per workspace in DB)
├── Its own error handling (never fails silently)
├── Its own health check (circuit breaker aware)
└── Its own normalization (never leaks provider format into business logic)

Adding a new connector:
1. Implement Connector interface
2. Register in ConnectorRegistry at startup
3. Add migration for connector config table
4. Add UI for connection setup
No changes to agent runtime, workflow engine, or any other domain.
```

---

## Connector Rollout Phases

| Phase | Connector | Priority |
|---|---|---|
| A (now) | Implement MetaCloudApiProvider | 🔴 P0 |
| A (now) | Encrypt WhatsApp tokens at rest | 🔴 P0 |
| E | Email (Resend inbound) | 🟠 P1 |
| E | Telegram | 🟠 P1 |
| E | HubSpot CRM (read) | 🟠 P1 |
| F | Microsoft Teams | 🟡 P2 |
| F | Slack | 🟡 P2 |
| F | Salesforce | 🟡 P2 |
| F | Google Calendar | 🟡 P2 |
| G | SharePoint | 🟢 P3 |
| G | MCP Server | 🟢 P3 |
| G | Google Drive | 🟢 P3 |
