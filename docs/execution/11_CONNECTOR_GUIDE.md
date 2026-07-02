# WAAI — Connector Engineering Guide
**Document Type:** Engineering Standard  
**Version:** 1.0  
**Date:** 2026-07-02  
**Status:** Authoritative  
**Reference:** ADR-0003 (WhatsApp Provider Abstraction), docs/masterplan/CONNECTOR_PLATFORM.md

---

## Connector Philosophy

A connector is the boundary between WAAI's business logic and the outside world. The Connector's job is exclusively: translate external messages into WAAI's canonical format, and translate WAAI's responses back into the external format.

**The connector must never:**
- Call the agent runtime
- Make business decisions
- Store conversation state
- Access workspace data directly (except its own credentials)

**The connector must always:**
- Verify signatures before processing
- Normalize payloads to the canonical `InboundMessage` type
- Encrypt credentials before storage
- Implement `health()` so circuit breakers work
- Handle rate limits from the external provider gracefully

---

## 1. The Connector Interface

All connectors implement this interface (Phase E: `src/lib/connectors/connector.ts`):

```typescript
export interface Connector {
  readonly type: ConnectorType;
  readonly capabilities: ConnectorCapability[];
  
  // Lifecycle
  initialize(credentials: ConnectorCredentials): Promise<void>;
  health(): Promise<ConnectorHealth>;
  disconnect(): Promise<void>;
  
  // Messaging
  send(message: OutboundMessage): Promise<SendResult>;
  
  // Inbound webhook
  verify(request: Request): Promise<boolean>;      // verify signature
  normalize(payload: unknown): Promise<InboundMessage | null>; // transform to canonical
  
  // Optional (implement if capability is declared)
  sendTemplate?(templateMessage: TemplateMessage): Promise<SendResult>;
}

export type ConnectorType = 
  | 'whatsapp_whapi' 
  | 'whatsapp_meta' 
  | 'email_resend' 
  | 'telegram' 
  | 'teams' 
  | 'slack'
  | 'hubspot'
  | 'salesforce'
  | 'google_calendar'
  | 'google_drive'
  | 'sharepoint'
  | 'mcp';

export type ConnectorCapability = 
  | 'send_text'
  | 'send_template'
  | 'receive_text'
  | 'receive_media'
  | 'create_contact'
  | 'search_contact'
  | 'create_event'
  | 'search_document';

export interface ConnectorHealth {
  status: 'ok' | 'degraded' | 'down';
  latencyMs?: number;
  message?: string;
  checkedAt: Date;
}

export interface InboundMessage {
  externalId: string;          // provider's message ID (for dedup)
  channelType: ConnectorType;
  channelId: string;           // workspace's connection ID in waai_whatsapp_connections
  senderIdentifier: string;    // phone number, email address, Slack user ID, etc.
  senderName?: string;
  content: string;             // plain text representation
  mediaUrls?: string[];        // if message contains media
  receivedAt: Date;
  rawPayload: unknown;         // original provider payload for debugging
}
```

---

## 2. ConnectorRegistry

The `ConnectorRegistry` is a singleton that replaces the current `WhatsappProviderFactory`:

```typescript
// src/lib/connectors/connector-registry.ts
export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors = new Map<ConnectorType, () => Connector>();
  
  static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
      ConnectorRegistry.instance.registerDefaults();
    }
    return ConnectorRegistry.instance;
  }
  
  register(type: ConnectorType, factory: () => Connector): void {
    this.connectors.set(type, factory);
  }
  
  get(type: ConnectorType): Connector {
    const factory = this.connectors.get(type);
    if (!factory) throw new Error(`No connector registered for type: ${type}`);
    return factory();
  }
  
  private registerDefaults(): void {
    this.register('whatsapp_whapi', () => new WhapiCloudConnector());
    this.register('whatsapp_meta', () => new MetaCloudApiConnector());
    // Each Phase E connector registered here
  }
}
```

---

## 3. Connector Implementations

### 3.1 WhatsApp — Whapi Cloud (Existing, Phase A Refactor)

**Location:** `src/lib/whatsapp/whapi-cloud-provider.ts` → refactor to `src/lib/connectors/whatsapp-whapi-connector.ts`

**Current issue:** Token stored plaintext. Fix required in Phase A (TASK-001.9.1.2).

```typescript
export class WhapiCloudConnector implements Connector {
  readonly type = 'whatsapp_whapi' as const;
  readonly capabilities: ConnectorCapability[] = ['send_text', 'send_template', 'receive_text', 'receive_media'];

  async verify(request: Request): Promise<boolean> {
    // Whapi uses a static token, not HMAC
    const token = request.headers.get('token');
    return token === this.credentials.webhookToken;
  }
  
  async normalize(payload: unknown): Promise<InboundMessage | null> {
    const body = payload as WhapiWebhookPayload;
    const message = body.messages?.[0];
    if (!message || message.from_me) return null;  // ignore outbound echo
    
    return {
      externalId: message.id,
      channelType: 'whatsapp_whapi',
      channelId: this.connectionId,
      senderIdentifier: message.from,  // phone number
      senderName: message.pushname,
      content: message.text?.body ?? '',
      receivedAt: new Date(message.timestamp * 1000),
      rawPayload: payload,
    };
  }
  
  async send(message: OutboundMessage): Promise<SendResult> {
    const response = await fetch(`https://gate.whapi.cloud/messages/text`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.credentials.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: message.recipient, body: message.content }),
    });
    return { success: response.ok, externalMessageId: (await response.json()).id };
  }

  async health(): Promise<ConnectorHealth> {
    const start = Date.now();
    try {
      const res = await fetch('https://gate.whapi.cloud/health', {
        headers: { 'Authorization': `Bearer ${this.credentials.token}` }
      });
      return { status: res.ok ? 'ok' : 'degraded', latencyMs: Date.now() - start, checkedAt: new Date() };
    } catch {
      return { status: 'down', checkedAt: new Date() };
    }
  }
}
```

### 3.2 WhatsApp — Meta Cloud API (New, Phase A)

**Location:** `src/lib/connectors/whatsapp-meta-connector.ts`

```typescript
export class MetaCloudApiConnector implements Connector {
  readonly type = 'whatsapp_meta' as const;
  readonly capabilities: ConnectorCapability[] = ['send_text', 'send_template', 'receive_text', 'receive_media'];

  async verify(request: Request): Promise<boolean> {
    // Meta uses HMAC-SHA256 signature
    const signature = request.headers.get('X-Hub-Signature-256');
    if (!signature) return false;
    
    const body = await request.text();
    const expectedSignature = 'sha256=' + createHmac('sha256', this.credentials.appSecret)
      .update(body)
      .digest('hex');
    
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }
  
  async normalize(payload: unknown): Promise<InboundMessage | null> {
    const body = payload as MetaWebhookPayload;
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    
    if (!message) return null;
    
    return {
      externalId: message.id,
      channelType: 'whatsapp_meta',
      channelId: this.connectionId,
      senderIdentifier: message.from,
      senderName: change.value.contacts?.[0]?.profile?.name,
      content: message.type === 'text' ? message.text.body : '',
      mediaUrls: message.type !== 'text' ? [message[message.type]?.id] : undefined,
      receivedAt: new Date(parseInt(message.timestamp) * 1000),
      rawPayload: payload,
    };
  }
  
  async send(message: OutboundMessage): Promise<SendResult> {
    const url = `https://graph.facebook.com/v19.0/${this.credentials.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.credentials.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.recipient,
        type: 'text',
        text: { preview_url: false, body: message.content },
      }),
    });
    const result = await response.json();
    return { success: response.ok, externalMessageId: result.messages?.[0]?.id };
  }
}
```

### 3.3 Email — Resend (Phase E)

```typescript
export class ResendEmailConnector implements Connector {
  readonly type = 'email_resend' as const;
  readonly capabilities: ConnectorCapability[] = ['send_text', 'receive_text'];

  async verify(request: Request): Promise<boolean> {
    // Resend uses Svix for webhook signature verification
    const svix = new Webhook(this.credentials.webhookSecret);
    const payload = await request.text();
    const headers = {
      'svix-id': request.headers.get('svix-id') ?? '',
      'svix-timestamp': request.headers.get('svix-timestamp') ?? '',
      'svix-signature': request.headers.get('svix-signature') ?? '',
    };
    try {
      svix.verify(payload, headers);
      return true;
    } catch {
      return false;
    }
  }
  
  async normalize(payload: unknown): Promise<InboundMessage | null> {
    const email = payload as ResendInboundEmail;
    return {
      externalId: email.email_id,
      channelType: 'email_resend',
      channelId: this.connectionId,
      senderIdentifier: email.from,
      senderName: email.from_name,
      content: email.text ?? stripHtml(email.html ?? ''),
      receivedAt: new Date(email.created_at),
      rawPayload: payload,
    };
  }
  
  async send(message: OutboundMessage): Promise<SendResult> {
    const resend = new Resend(this.credentials.apiKey);
    const result = await resend.emails.send({
      from: this.credentials.fromAddress,
      to: message.recipient,
      subject: message.metadata?.subject ?? 'Reply from WAAI Agent',
      text: message.content,
    });
    return { success: !result.error, externalMessageId: result.data?.id };
  }
}
```

### 3.4 Telegram (Phase E)

```typescript
export class TelegramConnector implements Connector {
  readonly type = 'telegram' as const;
  readonly capabilities: ConnectorCapability[] = ['send_text', 'receive_text'];

  async verify(request: Request): Promise<boolean> {
    // Telegram uses a secret token set during webhook registration
    const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    return secretToken === this.credentials.webhookSecret;
  }
  
  async normalize(payload: unknown): Promise<InboundMessage | null> {
    const update = payload as TelegramUpdate;
    const message = update.message;
    if (!message?.text) return null;
    
    return {
      externalId: String(message.message_id),
      channelType: 'telegram',
      channelId: this.connectionId,
      senderIdentifier: String(message.from?.id),
      senderName: [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' '),
      content: message.text,
      receivedAt: new Date(message.date * 1000),
      rawPayload: payload,
    };
  }
  
  async send(message: OutboundMessage): Promise<SendResult> {
    const url = `https://api.telegram.org/bot${this.credentials.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: message.recipient, text: message.content, parse_mode: 'Markdown' }),
    });
    const result = await response.json();
    return { success: result.ok, externalMessageId: String(result.result?.message_id) };
  }
}
```

### 3.5 Microsoft Teams (Phase F)

```typescript
export class MicrosoftTeamsConnector implements Connector {
  readonly type = 'teams' as const;
  readonly capabilities: ConnectorCapability[] = ['send_text', 'receive_text'];

  async verify(request: Request): Promise<boolean> {
    // Azure Bot Framework: JWT verification with Microsoft public keys
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return false;
    return await verifyBotFrameworkToken(token);
  }
  
  async normalize(payload: unknown): Promise<InboundMessage | null> {
    const activity = payload as BotFrameworkActivity;
    if (activity.type !== 'message' || !activity.text) return null;
    
    return {
      externalId: activity.id,
      channelType: 'teams',
      channelId: this.connectionId,
      senderIdentifier: activity.from.id,
      senderName: activity.from.name,
      content: activity.text,
      receivedAt: new Date(activity.timestamp),
      rawPayload: payload,
    };
  }
  
  async send(message: OutboundMessage): Promise<SendResult> {
    // Reply to the conversation using Azure Bot Framework connector
    const connectorClient = new ConnectorClient(this.credentials.credentials, { baseUri: message.metadata?.serviceUrl });
    await connectorClient.conversations.replyToActivity(
      message.metadata?.conversationId,
      message.metadata?.activityId,
      { type: 'message', text: message.content }
    );
    return { success: true };
  }
}
```

### 3.6 Slack (Phase F)

```typescript
export class SlackConnector implements Connector {
  readonly type = 'slack' as const;
  readonly capabilities: ConnectorCapability[] = ['send_text', 'receive_text'];

  async verify(request: Request): Promise<boolean> {
    // Slack uses HMAC-SHA256: v0:{timestamp}:{body}
    const timestamp = request.headers.get('X-Slack-Request-Timestamp');
    const signature = request.headers.get('X-Slack-Signature');
    const body = await request.text();
    
    if (!timestamp || !signature) return false;
    
    // Prevent replay attacks (reject requests older than 5 minutes)
    if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;
    
    const sigBase = `v0:${timestamp}:${body}`;
    const expectedSig = 'v0=' + createHmac('sha256', this.credentials.signingSecret)
      .update(sigBase)
      .digest('hex');
    
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  }
  
  async send(message: OutboundMessage): Promise<SendResult> {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.credentials.botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: message.recipient, text: message.content }),
    });
    const result = await response.json();
    return { success: result.ok, externalMessageId: result.ts };
  }
}
```

---

## 4. CRM Connectors

### 4.1 HubSpot (Phase E)

**Capabilities:** `create_contact`, `search_contact`, `get_deal`

```typescript
export class HubSpotConnector implements Connector {
  readonly type = 'hubspot' as const;
  readonly capabilities: ConnectorCapability[] = ['create_contact', 'search_contact'];
  
  // HubSpot is outbound-only: no inbound webhook for conversations
  async verify(): Promise<boolean> { return true; }
  async normalize(): Promise<null> { return null; }
  async send(): Promise<SendResult> { throw new Error('HubSpot does not receive messages'); }
  
  async createContact(data: { email: string; firstName?: string; phone?: string }): Promise<string> {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.credentials.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { email: data.email, firstname: data.firstName, phone: data.phone } }),
    });
    const result = await response.json();
    return result.id;  // HubSpot contact ID
  }
}
```

---

## 5. MCP Connector (Phase G)

WAAI implements MCP in two modes:

### 5.1 WAAI as MCP Client

WAAI agents can call external MCP servers as tools:

```typescript
export class McpClientConnector implements Connector {
  readonly type = 'mcp' as const;
  readonly capabilities: ConnectorCapability[] = ['send_text'];
  
  async callTool(serverUrl: string, toolName: string, params: Record<string, unknown>): Promise<unknown> {
    // MCP JSON-RPC call
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.credentials.token}` },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', params: { name: toolName, arguments: params }, id: 1 }),
    });
    const result = await response.json();
    return result.result;
  }
}
```

### 5.2 WAAI as MCP Server

External AI agents (Claude Desktop, custom agents) can invoke WAAI capabilities:

```typescript
// src/app/api/mcp/route.ts
// Exposes: search_knowledge, send_message, create_lead

export async function POST(request: NextRequest) {
  const { method, params } = await request.json();
  
  const apiKey = extractBearerToken(request);
  const workspace = await apiKeyService.authenticate(apiKey);
  
  switch (method) {
    case 'tools/list':
      return Response.json({ result: { tools: MCP_TOOL_DEFINITIONS } });
    
    case 'tools/call':
      switch (params.name) {
        case 'search_knowledge':
          const chunks = await ragService.retrieve(params.arguments.query, workspace.knowledgeBaseId);
          return Response.json({ result: { content: [{ type: 'text', text: formatChunks(chunks) }] } });
        
        case 'create_lead':
          const lead = await createLeadUseCase.execute({ ...params.arguments, workspaceId: workspace.id });
          return Response.json({ result: { content: [{ type: 'text', text: `Lead created: ${lead.id}` }] } });
      }
  }
}
```

---

## 6. Adding a New Connector — Checklist

When implementing a new connector:

- [ ] Create file: `src/lib/connectors/{provider}-connector.ts`
- [ ] Implement `Connector` interface (all required methods)
- [ ] Declare `capabilities` accurately
- [ ] Implement `verify()` with the provider's signature method
- [ ] Implement `normalize()` to return `InboundMessage | null`
- [ ] Implement `health()` with a real HTTP check (not a mock)
- [ ] Encrypt all credentials before storage (use `src/lib/security/encryption.ts`)
- [ ] Register in `ConnectorRegistry.registerDefaults()`
- [ ] Add credential types to `waai_workspace_connections` or provider-specific table
- [ ] Add RLS policy for credential access
- [ ] Write unit tests: `verify()` with valid/invalid signature, `normalize()` with real payload fixtures
- [ ] Write integration test: full inbound → agent → outbound cycle
- [ ] Add connector type to `ConnectorType` union in `connector.ts`
- [ ] Document in `docs/execution/11_CONNECTOR_GUIDE.md` (add to Section 3)
- [ ] Update `docs/architecture/23-whatsapp-provider-architecture.md` (or create connector-specific doc)
- [ ] Write ADR if the connector introduces a new external dependency or capability pattern
