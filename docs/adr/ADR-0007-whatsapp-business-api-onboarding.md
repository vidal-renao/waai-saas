# ADR-0007 — WhatsApp Business API Onboarding Flow

**Status:** Accepted  
**Date:** 2026-06-07  
**Author:** Vidal Reñao Lopelo

---

## Context

Connecting a real WhatsApp number to the platform is the most complex and risky onboarding step. Meta's WhatsApp Cloud API has strict requirements: Facebook Business Manager verification, phone number registration, message templates pre-approval, and opt-in compliance. Failing to follow the process leads to number bans.

This ADR defines the full onboarding process and the UX flow inside the platform.

## MVP Provider: Whapi.cloud

For MVP and early customers, onboarding uses **Whapi.cloud** — which allows connection via QR code scan without Meta Business Manager approval. This is suitable for internal testing and early adopters.

### Whapi.cloud onboarding steps (implemented in Fase 5)

1. Customer clicks "Conectar WhatsApp" in dashboard.
2. Platform calls Whapi.cloud API to create a channel and get a QR code.
3. Customer scans QR with their WhatsApp app (links personal or business number).
4. Whapi.cloud sends a webhook event confirming connection.
5. Platform stores `waai_whatsapp_connections` record with `status='connected'`.
6. Platform registers our webhook URL with Whapi.cloud for inbound message events.

**Limitations:** Whapi.cloud uses unofficial WhatsApp Web protocol. Risk of account ban if message volume is high or policies are violated.

---

## Production Provider: Meta WhatsApp Cloud API

For production customers and compliant deployments, the platform must migrate to Meta Cloud API.

### Prerequisites (customer must complete before connecting)

| Requirement | Who does it | Notes |
|---|---|---|
| Facebook Business account | Customer | Must be verified |
| WhatsApp Business Account (WABA) | Customer | Created in Meta Business Manager |
| Phone number | Customer | Must not be registered on WhatsApp already |
| Business verification | Meta | Takes 1-5 business days |
| Display name approval | Meta | Must match business name |

### Onboarding steps (Meta Cloud API)

1. Customer starts "Conectar WhatsApp Business" wizard in dashboard.
2. Platform shows embedded Facebook Login flow (Meta Business Login OAuth).
3. Customer grants permissions: `whatsapp_business_management`, `whatsapp_business_messaging`.
4. Platform receives `waba_id` and `phone_number_id` via OAuth callback.
5. Platform calls Meta API to register phone number and subscribe to webhooks.
6. Customer verifies phone number via OTP (Meta sends SMS/call).
7. Platform stores connection with `status='connected'`.
8. Platform registers webhook URL: `https://waai.app/api/webhooks/whatsapp/meta`.

### Message templates

- All outbound messages that **initiate** a conversation must use pre-approved templates.
- Templates are created via the Meta Business Manager and stored in `waai_whatsapp_connections.templates jsonb`.
- Customer-initiated conversations (customer writes first) can receive free-form replies for 24h.

### Opt-in compliance

- The platform must ensure customers collect opt-in before messaging users.
- Platform displays a compliance checklist during onboarding.
- `waai_whatsapp_connections.opt_in_confirmed bool` must be `true` before enabling production.

### Webhook verification

Meta sends a `GET` with `hub.verify_token` during webhook registration. The endpoint must respond with `hub.challenge`. Token stored in `waai_whatsapp_connections.webhook_secret` (encrypted).

## Risk mitigation

| Risk | Mitigation |
|---|---|
| Account ban | Never send spam. Always collect opt-in. Use templates for outbound. Rate limit messages. |
| Webhook duplicates | Idempotency key = `waai_messages.external_message_id`. Insert with `ON CONFLICT DO NOTHING`. |
| Token expiry | Store `access_token_encrypted` and refresh before expiry. Alert platform admin if refresh fails. |
| Number not registered | Show clear error in UI. Guide customer to complete Meta verification. |

## Related ADRs

- [ADR-0003](ADR-0003-whatsapp-provider-abstraction.md) — WhatsApp provider abstraction
