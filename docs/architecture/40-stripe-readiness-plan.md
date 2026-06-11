# Architecture 40 — Stripe Readiness Plan

## Objetivo

Preparar la arquitectura para activar Stripe Checkout en Fase 9+ sin implementar cobros reales en Fase 8.

## Estado en Fase 8

- `waai_billing_events` tabla preparada con campos para Stripe event ID.
- `src/lib/billing/types.ts` define interfaces de billing.
- `src/server/services/stripe-readiness-service.ts` — stub con métodos documentados.
- `.env.example` tiene variables Stripe como placeholders.
- **No se llama a la API de Stripe en ningún punto del código.**

## Plan de Activación (Fase 9)

### Paso 1: Configurar Stripe

```bash
npm install stripe  # solo en Fase 9
```

```env
BILLING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...
```

### Paso 2: Implementar Webhook

```
POST /api/webhooks/stripe
```

- Verificar firma con `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)`.
- Registrar en `waai_billing_events` con `provider_event_id = event.id` (idempotencia).
- Manejar eventos: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.

### Paso 3: Implementar Checkout

```
POST /api/billing/checkout  (Fase 9)
```

- Crear `stripe.checkout.sessions.create(...)`.
- Redirigir a URL de Stripe.
- En success URL: confirmar subscripción.

### Paso 4: Portal de Cliente

```
POST /api/billing/portal  (Fase 9)
```

- Crear `stripe.billingPortal.sessions.create(...)`.
- Gestión de planes, facturas, métodos de pago.

## Modelo de Datos para Stripe

Campos en `waai_subscriptions` a añadir en Fase 9:

```sql
ALTER TABLE waai_subscriptions ADD COLUMN stripe_customer_id text UNIQUE;
ALTER TABLE waai_subscriptions ADD COLUMN stripe_subscription_id text UNIQUE;
ALTER TABLE waai_subscriptions ADD COLUMN stripe_price_id text;
ALTER TABLE waai_subscriptions ADD COLUMN current_period_end timestamptz;
ALTER TABLE waai_subscriptions ADD COLUMN cancel_at_period_end boolean DEFAULT false;
```

## Idempotencia

```typescript
// En webhook handler:
const existing = await billingEventsRepo.findByProviderEventId('stripe', event.id);
if (existing) {
  await billingEventsRepo.updateStatus(existing.id, 'ignored');
  return new Response('OK', { status: 200 }); // Ya procesado
}
```

## Seguridad

- `STRIPE_SECRET_KEY` — solo en servidor, nunca en `NEXT_PUBLIC_*`.
- Verificar firma del webhook en cada request (no confiar en el payload sin firma).
- Log de billing events con metadata mínima (no loguear card details).
- Retry de webhooks: Stripe reintenta automáticamente; la idempotencia previene doble procesamiento.

## Plans en Stripe

| Plan | Facturación | CHF/mes | Price ID (variable) |
|------|-------------|---------|---------------------|
| starter | mensual | ~29 CHF | `STRIPE_PRICE_STARTER` |
| pro | mensual | ~79 CHF | `STRIPE_PRICE_PRO` |
| agency | mensual | ~249 CHF | `STRIPE_PRICE_AGENCY` |
| enterprise | negociado | custom | manual |

Los precios reales los define el producto. Este doc solo documenta la integración técnica.

## StripeReadinessService (Fase 8 — Stub)

```typescript
class StripeReadinessService {
  // Fase 9: implementar con stripe SDK
  async createCheckoutSession(workspaceId: string, planId: string): Promise<never> {
    throw new Error('NOT_IMPLEMENTED: Stripe checkout not enabled in this phase');
  }

  async createBillingPortalSession(workspaceId: string): Promise<never> {
    throw new Error('NOT_IMPLEMENTED: Stripe billing portal not enabled in this phase');
  }

  isEnabled(): boolean {
    return false; // Always false in Fase 8
  }
}
```
