# Architecture 35 — Production Hardening

## Objetivo

Endurecer el sistema para entorno real: enforcement server-side, logging estructurado, secretos seguros, health checks.

## Capas de Hardening

### 1. Server-Side Plan Enforcement

Centralizado en `BillingEnforcementService`. Cada operación crítica llama a un método `assertCan*` antes de ejecutar.

```
API Route → Use Case → BillingEnforcementService.assertCanXxx() → throw PLAN_LIMIT
                                                              → continue
```

Operaciones protegidas:
- `assertCanCreateAgent(workspaceId)` — comprueba `agents_limit` vs activos reales.
- `assertCanSendMessage(workspaceId, channel)` — comprueba `messages_limit` vs `waai_usage_counters.messages_sent`.
- `assertCanCreateKnowledgeDocument(workspaceId)` — comprueba `documents_limit` vs documentos activos.
- `assertCanCreateWhatsappConnection(workspaceId)` — comprueba `whatsapp_numbers_limit` vs conexiones activas.
- `assertCanAddMember(workspaceId)` — comprueba `members_limit` si aplica.

Convención de error: `throw new Error("PLAN_LIMIT: <resource> limit reached (current/limit)")`.

### 2. Usage Accounting Centralizado

`UsageAccountingService` centraliza incrementos en `waai_usage_counters`:

```
Service layer (message sent, document created, etc.)
  → UsageAccountingService.increment*(workspaceId)
    → upsert waai_usage_counters ON CONFLICT DO UPDATE
```

Reglas:
- Solo mensajes outbound (generados por agente) incrementan `messages_sent`.
- Mensajes inbound de cliente no cuentan.
- Documents en estado `ready` o `processing` cuentan para el límite.
- Agents en estado `active` o `paused` (no `archived`) cuentan.

### 3. AI Cost Tracking

`AiCostService` calcula `estimated_cost_cents` a partir de tokens:

```
AgentRunService
  → AiCostService.estimateCost(model, inputTokens, outputTokens)
    → returns estimated_cost_cents (integer, fractional cents rounded up)
```

Pricing table (aproximado, Junio 2026):
- `claude-haiku-4-5-20251001`: input $0.80/MTok, output $4.00/MTok
- `claude-sonnet-4-6`: input $3.00/MTok, output $15.00/MTok
- `claude-opus-4-7`: input $15.00/MTok, output $75.00/MTok
- Fallback: $0

Snapshots periódicos en `waai_ai_cost_snapshots` (insertar manualmente o vía cron en Fase 9).

### 4. Observability Estructurada

`ObservabilityService` — logging server-side con niveles `info | warn | error | debug`:

```
ObservabilityService.log(level, event, metadata?)
  → console.log en dev (JSON)
  → console.error en prod para warn/error
  → future: enviar a Sentry/Datadog si SENTRY_DSN presente
```

Eventos importantes:
- `claude_error` — fallo LLM
- `embedding_error` — fallo OpenAI embeddings
- `whatsapp_send_failed` — fallo envío WhatsApp
- `webhook_failed` — error procesando webhook
- `rag_failed` — fallo RAG pipeline
- `billing_limit_exceeded` — límite de plan superado
- `handoff_activated` — handoff iniciado
- `document_processing_failed` — documento no procesado
- `plan_usage_warning` — uso ≥80%
- `plan_usage_critical` — uso ≥95%

### 5. Seguridad de Secretos

`redact-secrets.ts` — redacta campos sensibles antes de logear:
- Reemplaza valores de keys/tokens con `[REDACTED]`.
- Phone numbers: muestra últimos 4 dígitos.
- Emails: muestra dominio, redacta local part.
- Stack traces: nunca al cliente (solo server logs).

### 6. Health Checks

```
GET /api/health          → public, status básico (version, env, uptime)
GET /api/health/db       → requiere INTERNAL_API_SECRET header, verifica Supabase
GET /api/health/ai       → requiere header, verifica env AI config
GET /api/health/whatsapp → requiere header, verifica env WhatsApp config
```

Respuesta:
```json
{
  "status": "ok | degraded | down",
  "checks": { "db": "ok", "ai": "ok", "whatsapp": "ok" },
  "timestamp": "ISO",
  "version": "0.8.0",
  "environment": "production | development"
}
```

Regla: nunca incluir valores reales de env ni stack traces en respuesta.

## Deployment Checklist

Antes de deploy a producción:

1. [ ] `npm run lint` — 0 errores.
2. [ ] `npm run build` — build limpio.
3. [ ] `supabase db push` con backup previo.
4. [ ] Verificar RLS en tablas nuevas.
5. [ ] Verificar RPCs con `SECURITY DEFINER`.
6. [ ] Configurar todas las variables de entorno en Vercel.
7. [ ] Verificar que `SUPABASE_SERVICE_ROLE_KEY` no está en cliente.
8. [ ] Verificar health endpoints responden.
9. [ ] Test manual de sandbox, WhatsApp, RAG, analytics.
10. [ ] Revisar logs post-deploy.

## Rollback

Si migración falla:
```bash
# Desde dashboard Supabase o CLI:
supabase db reset --db-url <connection_string>
# O aplicar migración inversa manualmente
```

Si build falla en Vercel:
- Vercel mantiene último deploy funcional.
- Revertir vía "Instant Rollback" en Vercel dashboard.
