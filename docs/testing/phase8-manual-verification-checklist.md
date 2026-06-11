# Phase 8 — Manual Verification Checklist

## Instrucciones

Ejecutar este checklist antes de considerar Fase 8 completa. Marcar cada item como ✅ PASS o ❌ FAIL con nota.

## 1. Auth

- [ ] Login con email/password funciona.
- [ ] Logout redirige a `/login`.
- [ ] Acceso a `/dashboard` sin login redirige a `/login`.
- [ ] Registro de nuevo usuario funciona.
- [ ] Onboarding crea workspace y subscripción free.

## 2. Workspace Isolation

- [ ] Usuario A no puede ver datos de workspace de usuario B.
- [ ] API routes devuelven 401 sin token de sesión.
- [ ] API routes devuelven 403 si el workspace no pertenece al usuario.

## 3. Sandbox (Chat con Agente)

- [ ] Crear agente → status `draft`.
- [ ] Abrir sandbox → conversación iniciada.
- [ ] Enviar mensaje → agente responde (Claude API).
- [ ] Respuesta contiene texto coherente.
- [ ] Cerrar sandbox → conversación en DB.
- [ ] Verificar que `waai_agent_runs` tiene registro con `estimated_cost_cents` no null (si tokens > 0).

## 4. WhatsApp Mock

- [ ] Crear conexión WhatsApp (provider: `mock`).
- [ ] `POST /api/whatsapp/simulate` con payload de test.
- [ ] Webhook procesa el mensaje.
- [ ] Conversación creada con `channel = 'whatsapp'`.
- [ ] Agente responde vía mock provider.
- [ ] `waai_whatsapp_messages` tiene registros inbound + outbound.

## 5. RAG (Knowledge Base)

- [ ] Subir documento texto.
- [ ] Procesar documento → status `processing` → `ready`.
- [ ] `waai_knowledge_chunks` tiene registros con `embedding != null`.
- [ ] Vincular documento a agente.
- [ ] Preguntar al agente sobre el contenido del documento.
- [ ] Respuesta usa el contexto del documento (verificar `rag_context` en metadata si aplica).

## 6. Lead Creation

- [ ] Desde conversación → crear lead.
- [ ] Lead aparece en `/dashboard/leads`.
- [ ] Cambiar status de lead: new → qualified → contacted.
- [ ] Asignar lead a human agent.
- [ ] Archivar lead.

## 7. Human Handoff

- [ ] Desde conversación → request handoff.
- [ ] Conversación cambia a status `handoff_required`.
- [ ] Asignar conversación a human agent.
- [ ] Human agent puede añadir internal note.
- [ ] Internal note NO aparece en mensajes del cliente.
- [ ] Resolver handoff → conversación vuelve a `open`.

## 8. Analytics

- [ ] `/dashboard/analytics` carga sin error.
- [ ] Métricas muestran datos coherentes.
- [ ] Cambiar preset (hoy, 7d, 30d, este mes) actualiza datos.
- [ ] Custom date picker: seleccionar from/to custom → datos se filtran.
- [ ] `/dashboard/analytics/agents` muestra tabla de agentes.
- [ ] `/dashboard/analytics/leads` muestra funnel.
- [ ] `/dashboard/analytics/usage` muestra uso del plan.
- [ ] Operational alerts panel muestra alertas si las hay.
- [ ] Alerta tiene `action_href` con link válido (si tiene tipo mapeado).

## 9. Billing Usage

- [ ] `GET /api/billing/usage` requiere auth (401 sin token).
- [ ] `GET /api/billing/usage` requiere owner/admin (403 para viewer).
- [ ] Devuelve datos de uso del plan.
- [ ] `/dashboard/settings/usage` carga y muestra datos.
- [ ] `/dashboard/settings/billing` carga sin error.

## 10. Health Checks

- [ ] `GET /api/health` devuelve 200 con `{"status":"ok"}`.
- [ ] `GET /api/health` no incluye ningún valor de variable de entorno.
- [ ] `GET /api/health/db` sin header → 401.
- [ ] `GET /api/health/db` con `x-internal-secret: $INTERNAL_API_SECRET` → 200.
- [ ] `GET /api/health/ai` con header → devuelve estado de config AI.
- [ ] `GET /api/health/whatsapp` con header → devuelve estado de WhatsApp config.

## 11. System Health UI

- [ ] `/dashboard/settings/system-health` carga sin error.
- [ ] Muestra checklist de readiness.
- [ ] No muestra valores de env vars completos.

## 12. No Secretos en Frontend

```bash
# Buscar variables server-only en client components
grep -r "SUPABASE_SERVICE_ROLE_KEY\|ANTHROPIC_API_KEY\|WHAPI_API_KEY\|STRIPE_SECRET_KEY\|ENCRYPTION_KEY\|INTERNAL_API_SECRET" \
  src/app src/features src/components \
  --include="*.tsx" --include="*.ts" | grep -v "\.server\." | grep -v "api/"
```

Resultado esperado: 0 ocurrencias en client components (`"use client"`).

## 13. Internal Notes

- [ ] Internal note visible en `/dashboard/conversations/[id]` para owner/admin.
- [ ] Verificar que `/api/conversations/[id]` (GET mensajes) NO incluye internal notes en el array de mensajes.
- [ ] Verificar que el agente LLM no recibe internal notes como contexto.

## 14. Billing Enforcement

- [ ] Crear agente hasta el límite del plan free (1 agente) → 2do agente lanza error `PLAN_LIMIT`.
- [ ] Intentar crear knowledge document sobre límite → error `PLAN_LIMIT`.
- [ ] Enviar mensaje con workspace sin subscripción activa → error apropiado.

## 15. Lint y Build

```bash
cd waai-saas
npm run lint    # debe terminar con 0 errors
npm run build   # debe terminar con ✓ Compiled successfully
```

- [ ] `npm run lint` → 0 errores, 0 warnings críticos.
- [ ] `npm run build` → build limpio sin errores TypeScript.
- [ ] No hay `console.error` de importación en la build output.

## 16. Verificación de Rutas (Total)

```bash
# Contar rutas en la build output
npm run build 2>&1 | grep "○\|●\|λ" | wc -l
```

Se esperan ≥ 70 rutas (Fase 7 tenía 66; Fase 8 añade ~8+ rutas).

## Notas del Verificador

| Item | Estado | Nota |
|------|--------|------|
| ... | ... | ... |

**Fecha de verificación**: ___________
**Verificado por**: ___________
**Versión**: 0.8.0
