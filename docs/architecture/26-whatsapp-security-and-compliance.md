# Architecture 26 — WhatsApp Security and Compliance

## Webhook Security

### Token Validation (Whapi)
Every inbound webhook from Whapi includes `X-Whapi-Token` header.  
`WhapiCloudProvider.verifyWebhook()` compares this against `WHAPI_TOKEN` env var.  
Invalid token → HTTP 401, no processing, no event saved.

### Secret Storage
- `WHAPI_TOKEN` lives only in server environment variables
- `webhook_secret_hash` in DB stores a per-connection identifier (not the raw token)
- Rotating the token requires updating the env var and re-configuring Whapi webhook

### Request Body Integrity
Raw body read as text before JSON parsing to support future HMAC signatures.

---

## Data Protection

### PII in WhatsApp Messages
WhatsApp messages may contain personal data (names, phone numbers, addresses).  
- `from_number` and `to_number` stored in `waai_whatsapp_messages`
- `external_chat_id` stored as received from provider
- No additional PII analysis in MVP
- Operators (workspace owners) are responsible for GDPR/DSG compliance
- Data retention: messages stored indefinitely in MVP; configurable retention policy in Fase 8

### Phone Number Handling
- Phone numbers stored as received from provider (e.g., `34612345678`)
- No normalization or hashing in MVP
- Not used for any purpose other than routing replies

---

## Multi-Tenant Isolation

### RLS Policies
All 4 new tables have RLS enabled.  
Every query scoped by `workspace_id`.  
Cross-workspace queries return empty result due to RLS (second defense after application layer).

### Webhook Routing
The webhook finds the connection by `external_instance_id` or `phone_number_id` + active status.  
A connection belongs to exactly one workspace.  
Agents are also workspace-scoped.  
This prevents cross-tenant message delivery even if two workspaces use the same Whapi instance (which shouldn't happen but is defended against).

---

## Opt-In / Compliance Notes

### GDPR / Swiss DSG
- WhatsApp-based opt-in is the operator's responsibility
- Platform does not enforce opt-in tracking in MVP
- Fase 6 will add explicit opt-in fields to waai_conversations
- Operators must ensure customers consent to AI-assisted responses

### WhatsApp Business Policy
- Whapi.cloud handles WhatsApp API terms in MVP
- Production Meta Cloud API requires Meta Business Verification
- Operators must not send unsolicited messages via the platform
- Platform does not support bulk broadcast in this phase

### Data Residency
- Supabase project region selected by operator
- Vercel functions run in the region closest to the caller
- No cross-region data transfer in MVP

---

## Service Role Client

The webhook endpoint uses `createServiceRoleClient()` (Supabase service role key) because there is no authenticated user session.  
This bypasses RLS at the DB level.  
Business-level access control is enforced manually in `WhatsAppWebhookService`:
- Connection must exist and be `active`
- Connection must belong to a workspace with an active subscription
- Agent must be `active`

The service role client is NEVER exposed to frontend or returned in HTTP responses.

---

## Secret Management

| Secret | Location | Never in |
|--------|----------|---------|
| `WHAPI_TOKEN` | Server env | Frontend, DB, logs, responses |
| `WHATSAPP_WEBHOOK_SECRET` | Server env | Frontend, logs |
| `SUPABASE_SERVICE_ROLE_KEY` | Server env | Frontend, responses |
| `ANTHROPIC_API_KEY` | Server env | Frontend, responses |

All secrets validated at startup (provider constructors throw if missing, caught gracefully).

---

## Error Handling and Information Leakage

- HTTP error responses never include stack traces
- Error messages are generic: "Webhook processing failed", "Connection not found"
- Internal error codes logged server-side only
- `waai_whatsapp_webhook_events.error_message` stores internal details (visible to admins only via RLS)
