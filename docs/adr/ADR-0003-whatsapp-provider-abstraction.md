# ADR-0003 — WhatsApp Provider Abstraction

**Status:** Accepted  
**Date:** 2026-06-07  
**Author:** Vidal Reñao Lopelo

---

## Context

There are multiple WhatsApp Business API providers (Meta Cloud API, Twilio, Whapi.cloud, Wassenger, 360dialog). Each has a different API shape, pricing model, webhook format, and onboarding process. Locking in to one provider at the code level would make switching expensive.

## Decision

Implement a **provider adapter pattern** via a `WhatsappProvider` interface. All WhatsApp operations go through this interface, never directly against a provider SDK.

### Interface contract

```typescript
// src/lib/whatsapp/types.ts
export interface WhatsappProvider {
  sendTextMessage(to: string, text: string): Promise<WhatsappSendResult>
  sendTemplateMessage(to: string, template: WhatsappTemplate): Promise<WhatsappSendResult>
  parseWebhookPayload(raw: unknown): WhatsappInboundMessage
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean
}
```

### Implementations

- `src/lib/whatsapp/providers/whapi.ts` — Whapi.cloud (MVP default)
- `src/lib/whatsapp/providers/meta-cloud.ts` — Meta Cloud API (production target)

### Selection

Provider is selected at runtime from `waai_whatsapp_connections.provider` (stored per workspace). No hardcoded provider at build time.

## MVP Provider: Whapi.cloud

**Why Whapi.cloud for MVP:**
- No Meta Business Manager approval needed for sandbox testing
- Simpler webhook verification
- Pay-per-message pricing without monthly platform fees
- REST API with straightforward auth (API key)
- Good for prototyping and early customers

**Migration path to Meta Cloud API:** documented in [ADR-0007](ADR-0007-whatsapp-business-api-onboarding.md).

## Consequences

- **Positive:** Provider can be swapped per workspace or globally without touching business logic.
- **Positive:** Integration tests can use a mock provider implementing the same interface.
- **Negative:** Abstraction layer adds one indirection. Accepted — it pays off at first provider switch.

## Related ADRs

- [ADR-0007](ADR-0007-whatsapp-business-api-onboarding.md) — WhatsApp Business API onboarding flow
