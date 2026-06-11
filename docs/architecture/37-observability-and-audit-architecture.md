# Architecture 37 — Observability & Audit

## Objetivo

Logging estructurado server-side, captura de errores operativos, y trazabilidad de eventos clave sin dependencia pesada.

## Principios

1. **No exponer secretos en logs.** Usar `redact-secrets.ts` antes de loguear payloads.
2. **No enviar stack traces al cliente.** Solo al log server-side.
3. **Log JSON estructurado** en producción; legible en desarrollo.
4. **Sin dependencias pesadas en Fase 8.** Sentry/Datadog como `future:` en código.
5. **Audit log existente** (`waai_audit_logs`) para acciones de usuario. No duplicar.
6. **System health events** (`waai_system_health_events`) para eventos operativos del sistema.

## ObservabilityService

```typescript
class ObservabilityService {
  log(level: 'info' | 'warn' | 'error' | 'debug', event: string, metadata?: Record<string, unknown>): void
  logError(event: string, error: Error, metadata?: Record<string, unknown>): void
  logBillingLimitExceeded(workspaceId: string, resource: string, current: number, limit: number): void
  logHandoffActivated(workspaceId: string, conversationId: string, triggeredBy: string): void
  logClaudeError(workspaceId: string, agentId: string, error: string): void
  logWebhookFailed(workspaceId: string, provider: string, error: string): void
}
```

### Output Format

Dev (`NODE_ENV !== 'production'`):
```
[WAAI][INFO] claude_error {"workspaceId":"...","agentId":"...","error":"..."}
```

Production:
```json
{"level":"error","event":"claude_error","workspaceId":"...","agentId":"...","ts":"2026-06-11T10:00:00Z"}
```

### Eventos Catalogados

| Event | Level | Cuando |
|-------|-------|--------|
| `agent_run_success` | info | LLM respondió correctamente |
| `agent_run_error` | error | LLM falló (error API, timeout) |
| `embedding_error` | error | OpenAI embeddings falló |
| `whatsapp_send_failed` | error | Provider no entregó mensaje |
| `webhook_failed` | error | Error procesando webhook inbound |
| `rag_failed` | warn | RAG no pudo recuperar contexto |
| `billing_limit_exceeded` | warn | Límite de plan superado |
| `plan_usage_warning` | warn | Uso ≥80% |
| `plan_usage_critical` | error | Uso ≥95% |
| `handoff_activated` | info | Handoff iniciado |
| `document_processing_failed` | error | Documento no se procesó |
| `health_check_db_failed` | error | Supabase no responde |
| `health_check_ai_failed` | warn | Config AI inválida |
| `security_redacted` | debug | Payload redactado antes de log |

## ErrorReportingService

```typescript
class ErrorReportingService {
  captureException(error: Error, context?: Record<string, unknown>): void
  captureMessage(message: string, level: 'info' | 'warning' | 'error', context?: Record<string, unknown>): void
}
```

En Fase 8: solo delega a `ObservabilityService`.
En Fase 9: si `SENTRY_DSN` está configurado, envía a Sentry.

```typescript
// future: if (process.env.SENTRY_DSN) { Sentry.captureException(error); }
```

## redact-secrets.ts

```typescript
function redactSecrets(obj: Record<string, unknown>): Record<string, unknown>
function redactString(key: string, value: string): string
```

Reglas:
- Keys que contienen: `token`, `key`, `secret`, `password`, `credential`, `auth` → `[REDACTED]`
- Valores que empiezan con `sk-`, `pk-`, `whsec_`, `EAA`, `Bearer ` → `[REDACTED]`
- Phone numbers (`+?[0-9]{10,15}`): mostrar solo últimos 4 dígitos → `***1234`
- Emails: `user@domain.com` → `u***@domain.com`

## waai_system_health_events

Tabla para eventos operativos del sistema (no acciones de usuario):

```sql
CREATE TABLE waai_system_health_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES waai_workspaces(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  event_type text NOT NULL,
  source text NOT NULL,           -- service o componente que generó el evento
  entity_type text,               -- 'agent', 'document', 'connection', etc.
  entity_id uuid,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

RLS: workspace isolation. owner/admin read. agent_manager read de operational events.

## Integración con Operational Alerts (Fase 7)

`waai_get_operational_alerts` RPC ya computa alertas dinámicamente desde tablas existentes.

`waai_system_health_events` complementa con eventos históricos persistidos.

En Fase 9: unificar en una vista que combine ambas fuentes.

## Audit Log Existente

`waai_audit_logs` (Fase 1) ya registra:
- Acciones de usuario (create, update, delete, login).
- Actor, workspace, entity, old/new values.
- No duplicar en `ObservabilityService`.

## Variables de Entorno para Observabilidad

```env
LOG_LEVEL=info              # info | warn | error | debug
ENABLE_DEBUG_LOGS=false     # si true, activa logs debug en producción
SENTRY_DSN=                 # vacío en Fase 8, activar en Fase 9
```
