# Architecture 36 — Billing Readiness

## Objetivo

Preparar la infraestructura de billing para activar Stripe en Fase 9+ sin romper la arquitectura actual.

## Estado Actual (Fase 8)

- `waai_subscriptions` + `waai_plans` + `waai_usage_counters`: operativos.
- `BillingService`: métodos de check (`checkMessageLimit`, `checkAgentLimit`, etc.).
- `BillingEnforcementService` (nuevo Fase 8): assert pattern centralizado.
- `UsageAccountingService` (nuevo Fase 8): incrementos centralizados.
- `waai_billing_events` (nueva Fase 8): tabla para eventos de billing (preparada para Stripe).
- No hay Stripe checkout real.

## Billing Readiness sin Checkout

### Tabla `waai_billing_events`

Registra eventos de billing para futura integración:
```sql
waai_billing_events (
  id, workspace_id, subscription_id,
  event_type,       -- plan_upgraded, plan_downgraded, trial_started, limit_exceeded, payment_received, etc.
  provider,         -- stripe | manual | system
  provider_event_id, -- Stripe event ID cuando se integre
  amount_cents,
  currency,         -- CHF default
  status,           -- received | processed | failed | ignored
  metadata jsonb,
  created_at
)
```

### Flujo de Activación de Stripe (Fase 9)

```
Fase 8: Billing events tabla preparada
Fase 9: Añadir STRIPE_SECRET_KEY y activar webhook
        waai_billing_events.provider = 'stripe'
        waai_billing_events.provider_event_id = stripe.event.id  (idempotencia)
Fase 10: Checkout flow UI
```

## Server-Side Plan Enforcement

### BillingEnforcementService

```typescript
class BillingEnforcementService {
  async assertCanCreateAgent(workspaceId: string): Promise<void>
  async assertCanSendMessage(workspaceId: string, channel: string): Promise<void>
  async assertCanCreateKnowledgeDocument(workspaceId: string): Promise<void>
  async assertCanCreateWhatsappConnection(workspaceId: string): Promise<void>
  async assertCanAddMember(workspaceId: string): Promise<void>
  async getUsageSnapshot(workspaceId: string): Promise<UsageSnapshot>
}
```

Reglas de enforcement:
- Límite `-1` = ilimitado (enterprise) — siempre permitido.
- Límite `0` = no permitido en plan.
- Conteos reales desde tablas (no solo usage_counters).
- Subscription debe estar en estado `active` o `trial`.

### UsageAccountingService

```typescript
class UsageAccountingService {
  async incrementMessageSent(workspaceId: string, channel: 'sandbox' | 'whatsapp'): Promise<void>
  async incrementDocumentUploaded(workspaceId: string): Promise<void>
  async incrementAgentCreated(workspaceId: string): Promise<void>
  async getCurrentPeriodUsage(workspaceId: string): Promise<PeriodUsage>
}
```

Implementación: upsert en `waai_usage_counters` con `ON CONFLICT (workspace_id, period_month) DO UPDATE SET messages_sent = messages_sent + 1`.

## Pricing Config (Fase 8)

Plans definidos en `src/config/plans.ts` (ya existente). Para Stripe en Fase 9:

```env
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...
```

No hacer obligatorias en Fase 8.

## API de Billing (Read-Only, Fase 8)

```
GET /api/billing/readiness  → owner/admin — ¿está preparado para billing real?
GET /api/billing/usage      → owner/admin — uso actual del plan
GET /api/billing/costs      → owner/admin — coste IA estimado
```

Todas requieren auth + workspace activo + rol owner/admin.

## UI de Billing (Fase 8)

```
/dashboard/settings/billing     → BillingReadinessCard + plan info
/dashboard/settings/usage       → PlanUsageSummary (linked from analytics/usage)
/dashboard/settings/system-health → SystemHealthCard + ProductionReadinessChecklist
```

## Entorno de Variables Requeridas para Billing (Fase 9)

```env
BILLING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_...       # Server only
STRIPE_WEBHOOK_SECRET=whsec_...    # Server only — webhook signature verification
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...
```

Fase 8: dejar como empty/placeholder en `.env.example`.

## Idempotencia de Billing Events

- `provider_event_id` (Stripe event ID) es unique per provider.
- Al recibir un webhook de Stripe: check `waai_billing_events.provider_event_id` antes de insertar.
- Si ya existe: `status = 'ignored'` y return 200.
