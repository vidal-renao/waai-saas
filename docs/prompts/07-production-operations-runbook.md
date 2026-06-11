# Runbook 07 — Production Operations

## Propósito

Guía operativa para el equipo que mantiene WAAI SaaS en producción.

## Health Check Rápido

```bash
# Estado general del sistema
curl https://your-app.vercel.app/api/health

# Estado de la base de datos (requiere INTERNAL_API_SECRET)
curl -H "x-internal-secret: $INTERNAL_API_SECRET" https://your-app.vercel.app/api/health/db

# Estado de IA
curl -H "x-internal-secret: $INTERNAL_API_SECRET" https://your-app.vercel.app/api/health/ai

# Estado de WhatsApp
curl -H "x-internal-secret: $INTERNAL_API_SECRET" https://your-app.vercel.app/api/health/whatsapp
```

Respuesta esperada:
```json
{
  "status": "ok",
  "checks": { "db": "ok", "ai": "ok", "whatsapp": "ok" },
  "timestamp": "2026-06-11T10:00:00.000Z",
  "version": "0.8.0",
  "environment": "production"
}
```

## Diagnóstico de Problemas Comunes

### Problema: Sandbox no responde

1. Verificar `/api/health/ai` — debe estar `ok`.
2. Verificar `ANTHROPIC_API_KEY` en Vercel env vars.
3. Verificar logs en Vercel: buscar `agent_run_error`.
4. Verificar límite de plan: `/api/billing/usage`.

### Problema: WhatsApp webhook no procesa mensajes

1. Verificar `/api/health/whatsapp`.
2. Verificar `WHAPI_WEBHOOK_SECRET` / `WHAPI_API_KEY`.
3. Buscar en logs: `webhook_failed`.
4. Verificar que el webhook URL en Whapi apunta al dominio correcto.
5. Verificar `waai_webhook_events` en Supabase — ver `processing_status`.

### Problema: RAG no encuentra contexto

1. Verificar `/api/health/ai` — `openai` debe estar `ok`.
2. Verificar `OPENAI_API_KEY`.
3. Verificar en Supabase que `waai_knowledge_chunks` tiene registros con `embedding != null`.
4. Buscar en logs: `rag_failed` o `embedding_error`.

### Problema: Límite de plan alcanzado

1. Verificar `/api/billing/usage` (owner/admin).
2. Si mensajes superados: considerar upgrade de plan.
3. Archivar agentes/documentos si se supera límite de ese recurso.
4. Revisar `waai_usage_counters` para confirmar conteo.

### Problema: Base de datos no responde

1. Verificar estado de Supabase en https://status.supabase.com.
2. Verificar `SUPABASE_SERVICE_ROLE_KEY` y `NEXT_PUBLIC_SUPABASE_URL`.
3. Verificar que el proyecto no está pausado (plan free pausa tras inactividad).

## Tareas de Mantenimiento

### Mensual: Revisar costes IA

```bash
curl -H "Authorization: Bearer <token>" https://your-app.vercel.app/api/billing/costs?preset=30d
```

Comparar con factura de Anthropic. Si hay discrepancia > 20%, revisar pricing table en `ai-cost-service.ts`.

### Trimestral: Revisar alertas operativas

```bash
curl -H "Authorization: Bearer <token>" https://your-app.vercel.app/api/analytics/alerts
```

Resolver alertas de tipo `critical` antes de continuar.

### Antes de cada deploy

1. `npm run lint` → 0 errores.
2. `npm run build` → build limpio.
3. `supabase db push --dry-run` → revisar cambios.
4. Backup de DB (ver `docs/architecture/39-supabase-production-migration-plan.md`).
5. Deploy en Vercel.
6. Verificar health checks post-deploy.
7. Test manual: sandbox message, WhatsApp mock, analytics.

## Logs Relevantes (Vercel)

Buscar por eventos en Vercel logs:

| Evento | Acción |
|--------|--------|
| `agent_run_error` | Revisar API key de Anthropic; verificar error en metadata |
| `webhook_failed` | Revisar payload en `waai_webhook_events`; verificar secret |
| `billing_limit_exceeded` | Notificar al workspace owner |
| `plan_usage_critical` | Urgente — enviar notificación |
| `document_processing_failed` | Revisar documento; puede ser formato no soportado |
| `health_check_db_failed` | Alerta inmediata — DB inaccesible |

## Seguridad

### Rotación de Secretos

Si se sospecha que un secreto fue comprometido:

1. Revocar en el proveedor (Supabase, Anthropic, Whapi, etc.).
2. Actualizar en Vercel env vars.
3. Redeploy automático en Vercel.
4. Verificar que el antiguo secreto no está en logs.

Secretos a rotar:
- `SUPABASE_SERVICE_ROLE_KEY` — en Supabase settings.
- `ANTHROPIC_API_KEY` — en console.anthropic.com.
- `OPENAI_API_KEY` — en platform.openai.com.
- `WHAPI_API_KEY` / `WHAPI_WEBHOOK_SECRET` — en Whapi dashboard.
- `ENCRYPTION_KEY` — requiere re-encriptar tokens WhatsApp (operación crítica).
- `INTERNAL_API_SECRET` — actualizar en Vercel.

### Rotación de `ENCRYPTION_KEY`

Esta clave cifra los tokens de WhatsApp en `waai_whatsapp_connections.access_token_encrypted`.

**NO rotar sin un plan de migración**, ya que los tokens existentes quedaran indescifrables.

Plan de migración:
1. Descifrar todos los tokens con la clave antigua.
2. Re-cifrar con la clave nueva.
3. Actualizar `ENCRYPTION_KEY` en Vercel.
4. Redeploy.

## Disaster Recovery

### DB completamente perdida

1. Restaurar backup más reciente.
2. Aplicar todas las migraciones desde el backup hasta el estado actual.
3. Verificar integridad de datos con queries de diagnóstico.
4. Re-verificar health checks.

### Vercel deployment roto

1. Usar "Instant Rollback" en Vercel dashboard → Deployments → última versión funcional → "Promote to Production".
2. No requiere acción en Supabase salvo que la migración que causó el problema haya sido la migración (en ese caso, rollback SQL también).

## Escalado

### Si hay picos de tráfico

- Vercel escala automáticamente (serverless).
- Supabase puede requerir upgrade de plan para más conexiones.
- Revisar connection pooling si hay errores `too many connections`.

### Configurar Supabase Connection Pooler

En Supabase dashboard → Settings → Database:
- Usar `connection_string` de Pooler (puerto 6543) en lugar de Direct (puerto 5432).
- Actualizar `SUPABASE_SERVICE_ROLE_KEY` URL si es necesario.
