# Fase 8 — Production Hardening & Billing Readiness

## Objetivo

Preparar WAAI SaaS para operar en entorno real/preproducción:

1. Centralizar y endurecer el server-side enforcement de límites de plan.
2. Añadir observabilidad estructurada y auditoría de errores.
3. Control de costes IA (estimación de tokens/coste por ejecución).
4. Health checks operativos.
5. Billing readiness sin activar Stripe checkout real.
6. Correcciones de deuda técnica de Fase 7.
7. Documentar plan de migración remota Supabase.

## Alcance

### In scope

- `BillingEnforcementService` — assert pattern para bloquear operaciones sobre límite de plan.
- `UsageAccountingService` — incrementos centralizados de `waai_usage_counters`.
- `AiCostService` — estimación de coste por tokens (sin llamadas externas).
- `ObservabilityService` — structured logging server-side.
- `ErrorReportingService` — captura y registro de errores operativos.
- `redact-secrets.ts` — redacción de secretos en logs.
- Nuevas tablas: `waai_system_health_events`, `waai_billing_events`, `waai_ai_cost_snapshots`.
- Health checks: `GET /api/health`, `/api/health/db`, `/api/health/ai`, `/api/health/whatsapp`.
- Billing readiness API: `GET /api/billing/readiness`, `/api/billing/usage`, `/api/billing/costs`.
- UI: `/dashboard/settings/billing`, `/dashboard/settings/usage`, `/dashboard/settings/system-health`.
- Actualizar `.env.example` con secciones claras.
- Deuda técnica Fase 7: custom date picker, action_href en alerts.
- Documentación SDD completa.

### Out of scope (Fase 9+)

- Stripe checkout real.
- Meta Cloud API full onboarding.
- Email marketing.
- CRM genérico / BI avanzado.
- Automatizaciones externas (n8n/Make).
- Sentry/Datadog integration real.

## Acceptance Criteria

| # | Criterio | Verificación |
|---|----------|-------------|
| 1 | Documentación Fase 8 existe | `docs/specs/15-*` present |
| 2 | Architecture docs creados | `docs/architecture/35-39` present |
| 3 | Billing readiness architecture | `docs/architecture/36-*` |
| 4 | Observability architecture | `docs/architecture/37-*` |
| 5 | AI cost control architecture | `docs/architecture/38-*` |
| 6 | Supabase migration plan | `docs/architecture/39-*` |
| 7 | Stripe readiness documented | `docs/architecture/40-*` |
| 8 | No CREATE SCHEMA en migración | grep in SQL |
| 9 | Todos los objetos DB usan waai_ | grep in SQL |
| 10 | RLS habilitado en nuevas tablas | SQL review |
| 11 | BillingEnforcementService centralizado | service exists + methods |
| 12 | UsageAccountingService exists | service exists |
| 13 | AiCostService exists | service exists |
| 14 | Health endpoints existen | routes exist |
| 15 | Health endpoints no exponen secretos | code review |
| 16 | Billing API exists | routes exist |
| 17 | Billing UI/settings existe | pages exist |
| 18 | System health UI existe | page exists |
| 19 | .env.example actualizado | file review |
| 20 | No secretos expuestos al frontend | no process.env en client components |
| 21 | Webhook idempotency intacto | grep idempotency key |
| 22 | Sandbox funciona | manual test |
| 23 | WhatsApp webhook funciona | manual test |
| 24 | RAG funciona | manual test |
| 25 | Leads/handoff funcionan | manual test |
| 26 | Analytics funciona | manual test |
| 27 | Custom analytics date picker | component exists |
| 28 | action_href en operational alerts | interface + service |
| 29 | Human attention alert documentado | spec/comment |
| 30 | Internal notes nunca van al cliente | grep search |
| 31 | No Stripe checkout real | no Stripe API calls |
| 32 | No Meta Cloud API full onboarding | grep META_ACCESS_TOKEN usage |
| 33 | No dependencias pesadas innecesarias | package.json review |
| 34 | Manual verification checklist | file exists |
| 35 | Lint passes (0 errors) | `npm run lint` |
| 36 | Build passes | `npm run build` |

## Deuda Técnica Fase 7 Incluida

1. **Custom date picker**: UI solo mostraba 4 presets. Backend ya soporta `custom`. Añadir inputs `type="date"` nativos sin dependencia nueva.
2. **action_href en alerts**: Solo se resolvía en el componente UI. Debe estar en `OperationalAlert` y en el service response.
3. **Spec mismatch**: Actualizar referencias a implementación real (views vs RPCs).
4. **Analytics optimization**: Documentar límites de views con subqueries correladas.

## Seguridad

- Toda operación de billing enforcement: server-side.
- No keys en `NEXT_PUBLIC_*` excepto `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
- `WHAPI_TOKEN` nunca expuesto al frontend.
- `STRIPE_SECRET_KEY` nunca expuesto al frontend.
- Health endpoints: status `ok|degraded|down` sin stack traces al cliente.
- Logs: redactar tokens, API keys, phone numbers parciales.

## Riesgos Conocidos

| Riesgo | Severidad | Mitigation |
|--------|-----------|-----------|
| `waai_usage_counters` puede tener race conditions bajo alta concurrencia | Medium | Upsert con `ON CONFLICT DO UPDATE` en Supabase |
| Coste estimado puede no coincidir con real de Anthropic | Low | Documentado como aproximado; actualizar pricing en `ai-cost-service.ts` |
| Custom date picker sin validación de timezone en UI | Low | Normalizar a UTC al enviar |
| Alert `human_attention` sin handoff formal no implementada | Low | Documentada como Fase 9 enhancement |
