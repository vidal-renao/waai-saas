# Staging Smoke Test Execution — WAAI SaaS v0.9.0

**Checklist fuente:** [`docs/testing/phase9-production-smoke-test-checklist.md`](../testing/phase9-production-smoke-test-checklist.md)  
**Criterio de aprobación:** ≥ 90/96 PASS | 0 FAILs en secciones críticas  
**Fecha de ejecución:** ___________________________

---

## Prerrequisitos

Antes de iniciar los smoke tests, confirmar:

```
[ ] URL staging accesible (no retorna 404 ni 500)
[ ] /api/health → {"status":"ok"}
[ ] /api/health/db (con INTERNAL_API_SECRET) → {"status":"ok"}
[ ] /api/health/ai (con INTERNAL_API_SECRET) → {"status":"ok"}
[ ] waai_plans tiene 4 filas (free, starter, pro, agency)
[ ] WHATSAPP_PROVIDER = mock confirmado
[ ] Navegador limpio (cookies/localStorage vaciados) para pruebas de auth
[ ] Navegador incógnito disponible para pruebas de RLS isolation
```

---

## Configuración del Entorno de Test

| Campo | Valor |
|---|---|
| **URL staging** | `https://_________________________.vercel.app` |
| **Fecha** | ___________________________ |
| **Tester** | ___________________________ |
| **Versión** | 0.9.0 |

### Credenciales de prueba a crear

Crear dos usuarios de prueba independientes (no usar cuentas reales):

| Usuario | Email | Contraseña |
|---|---|---|
| Tester A (principal) | `test-a@waai-staging.dev` | Generar aleatoria |
| Tester B (RLS isolation) | `test-b@waai-staging.dev` | Generar aleatoria |

> Estos usuarios son para staging. Se pueden eliminar desde Supabase Dashboard → Authentication → Users al finalizar los tests.

---

## Secciones Críticas (0 FAILs permitidos)

Las siguientes secciones son bloqueantes para el sign-off de staging:

| § | Sección | Tests | Por qué es crítica |
|---|---|---|---|
| 2 | Register/Login | 4 | Sin auth no hay plataforma |
| 3 | Onboarding | 4 | RLS se establece aquí |
| 7–8 | Sandbox | 7 | Core feature + Claude API |
| 13–14 | WhatsApp Mock | 7 | Core feature + webhook |
| 24 | System Health | 4 | Infraestructura funcional |
| 26 | RLS Isolation | 5 | Multi-tenant correctness |

**Total tests críticos: 31**

---

## Tabla de Resultados

| ID | Sección | Test | Resultado | Evidencia | Bug/Nota | Estado |
|---|---|---|---|---|---|---|
| 1.1 | App Loads | URL base carga sin error | | | | |
| 1.2 | App Loads | `/login` renderiza | | | | |
| 1.3 | App Loads | `/dashboard` sin auth → redirige a `/login` | | | | |
| 1.4 | App Loads | Sin JS errors en consola | | | | |
| **2.1** | **Register/Login** | **Registrar usuario nuevo** | | | | |
| **2.2** | **Register/Login** | **Login con credenciales correctas** | | | | |
| **2.3** | **Register/Login** | **Login con contraseña incorrecta → error** | | | | |
| **2.4** | **Register/Login** | **Logout → redirige a `/login`** | | | | |
| **3.1** | **Onboarding** | **Nuevo usuario → redirige a `/onboarding`** | | | | |
| **3.2** | **Onboarding** | **Crear workspace → registro en DB** | | | | |
| **3.3** | **Onboarding** | **Después de onboarding → `/dashboard`** | | | | |
| **3.4** | **Onboarding** | **`waai_subscriptions` con plan free creada** | | | | |
| 4.1 | Dashboard | `/dashboard` carga | | | | |
| 4.2 | Dashboard | `/dashboard/agents` carga | | | | |
| 4.3 | Dashboard | `/dashboard/conversations` carga | | | | |
| 4.4 | Dashboard | `/dashboard/leads` carga | | | | |
| 4.5 | Dashboard | `/dashboard/analytics` carga | | | | |
| 4.6 | Dashboard | `/dashboard/settings/billing` carga | | | | |
| 4.7 | Dashboard | `/dashboard/settings/system-health` carga | | | | |
| 5.1 | Create Agent | Click "New Agent" → formulario abre | | | | |
| 5.2 | Create Agent | Wizard completo | | | | |
| 5.3 | Create Agent | Agente creado con `status=draft` | | | | |
| 5.4 | Create Agent | Agente aparece en lista | | | | |
| 6.1 | Gen Prompt | Click "Generate Prompt" → llamada Claude | | | | |
| 6.2 | Gen Prompt | Prompt generado aparece en editor | | | | |
| 6.3 | Gen Prompt | Agente guardado con `system_prompt` | | | | |
| **7.1** | **Sandbox** | **Click "Test in Sandbox" → UI abre** | | | | |
| **7.2** | **Sandbox** | **`waai_conversations` con `channel=sandbox`** | | | | |
| **8.1** | **Sandbox Msg** | **Enviar mensaje → llamada Claude** | | | | |
| **8.2** | **Sandbox Msg** | **Agente responde** | | | | |
| **8.3** | **Sandbox Msg** | **Respuesta coherente** | | | | |
| **8.4** | **Sandbox Msg** | **`waai_messages` tiene registros inbound/outbound** | | | | |
| **8.5** | **Sandbox Msg** | **`waai_agent_runs` con `estimated_cost_cents > 0`** | | | | |
| 9.1 | Knowledge | UI de knowledge carga | | | | |
| 9.2 | Knowledge | Upload documento → inicia | | | | |
| 9.3 | Knowledge | Estado `processing` visible | | | | |
| 9.4 | Knowledge | Estado cambia a `ready` | | | | |
| 10.1 | RAG | `waai_knowledge_chunks` tiene registros | | | | |
| 10.2 | RAG | `embedding IS NOT NULL` | | | | |
| 11.1 | Link Doc | Documento vinculado al agente | | | | |
| 11.2 | Link Doc | Agente muestra doc vinculado | | | | |
| 12.1 | RAG Resp | Pregunta sobre doc → respuesta relevante | | | | |
| 12.2 | RAG Resp | Respuesta referencia contenido del doc | | | | |
| **13.1** | **WA Mock** | **Página WA settings carga** | | | | |
| **13.2** | **WA Mock** | **Nueva conexión con provider `mock`** | | | | |
| **13.3** | **WA Mock** | **Conexión status = `active`** | | | | |
| **13.4** | **WA Mock** | **Conexión vinculada al agente** | | | | |
| **14.1** | **WA Simulate** | **POST /api/whatsapp/simulate → 200** | | | | |
| **14.2** | **WA Simulate** | **Sin errores 500** | | | | |
| **14.3** | **WA Simulate** | **Agente procesa el mensaje** | | | | |
| 15.1 | WA Conv | Conversación aparece en `/dashboard/conversations` | | | | |
| 15.2 | WA Conv | Mensajes visibles al abrir | | | | |
| 15.3 | WA Conv | `channel = whatsapp` | | | | |
| 15.4 | WA Conv | Respuesta outbound del agente visible | | | | |
| 16.1 | Lead | Abrir conversación → "Create Lead" | | | | |
| 16.2 | Lead | Lead creado | | | | |
| 16.3 | Lead | Lead aparece en `/dashboard/leads` | | | | |
| 17.1 | Lead Status | new → qualified | | | | |
| 17.2 | Lead Status | qualified → contacted | | | | |
| 17.3 | Lead Status | Asignar lead | | | | |
| 17.4 | Lead Status | Archivar lead | | | | |
| 18.1 | Handoff | Request handoff desde conversación | | | | |
| 18.2 | Handoff | `waai_handoff_requests` creado | | | | |
| 18.3 | Handoff | `conversation.status = handoff_required` | | | | |
| 19.1 | Auto Paused | Durante handoff → agente NO responde | | | | |
| 19.2 | Auto Paused | Status no cambia por automatización | | | | |
| 20.1 | Int Note | Nota interna creada | | | | |
| 20.2 | Int Note | Nota visible para owner/admin | | | | |
| 20.3 | Int Note | Nota NO en `waai_whatsapp_messages` | | | | |
| 21.1 | Analytics | `/dashboard/analytics` carga | | | | |
| 21.2 | Analytics | Métricas sin error state | | | | |
| 21.3 | Analytics | Filtros de fecha funcionan | | | | |
| 21.4 | Analytics | Date picker funciona | | | | |
| 21.5 | Analytics | `/dashboard/analytics/agents` carga | | | | |
| 21.6 | Analytics | `/dashboard/analytics/leads` carga | | | | |
| 22.1 | Usage | `/dashboard/settings/usage` carga | | | | |
| 22.2 | Usage | Barras de plan visibles | | | | |
| 22.3 | Usage | `GET /api/billing/usage` → 200 | | | | |
| 23.1 | Billing | `/dashboard/settings/billing` carga | | | | |
| 23.2 | Billing | Plan actual visible | | | | |
| 23.3 | Billing | Stripe muestra "not configured" | | | | |
| 23.4 | Billing | `GET /api/billing/readiness` → 200 | | | | |
| **24.1** | **System Health** | **`/dashboard/settings/system-health` carga** | | | | |
| **24.2** | **System Health** | **DB status = "ok"** | | | | |
| **24.3** | **System Health** | **LLM status refleja ANTHROPIC_API_KEY** | | | | |
| **24.4** | **System Health** | **Readiness checklist visible** | | | | |
| 25.1 | No Secrets | Network tab → sin secrets en responses | | | | |
| 25.2 | No Secrets | View source → sin secrets en HTML | | | | |
| 25.3 | No Secrets | grep audit → 0 resultados | | | | |
| **26.1** | **RLS Isolation** | **Registrar usuario B en incógnito** | | | | |
| **26.2** | **RLS Isolation** | **Crear workspace para usuario B** | | | | |
| **26.3** | **RLS Isolation** | **Usuario B no ve agentes de usuario A** | | | | |
| **26.4** | **RLS Isolation** | **Usuario B no ve conversaciones de A** | | | | |
| **26.5** | **RLS Isolation** | **Usuario B no ve leads de A** | | | | |

---

## Resumen por Sección

| § | Sección | Total | PASS | FAIL | PARTIAL | Notas |
|---|---|---|---|---|---|---|
| 1 | App Loads | 4 | | | | |
| 2 | Register/Login | 4 | | | | |
| 3 | Onboarding | 4 | | | | |
| 4 | Dashboard | 7 | | | | |
| 5 | Create Agent | 4 | | | | |
| 6 | Gen Prompt | 3 | | | | |
| 7–8 | Sandbox | 7 | | | | |
| 9–12 | Knowledge/RAG | 10 | | | | |
| 13–15 | WhatsApp Mock | 11 | | | | |
| 16–20 | Leads/Handoff | 16 | | | | |
| 21–22 | Analytics/Usage | 9 | | | | |
| 23–24 | Billing/Health | 8 | | | | |
| 25 | No Secrets | 3 | | | | |
| 26 | RLS Isolation | 5 | | | | |
| **TOTAL** | | **96** | | | | |

---

## Criterio de Aprobación

| Criterio | Requerido | Resultado |
|---|---|---|
| Tests PASS | ≥ 90/96 | /96 |
| FAILs en § 2 (Register/Login) | 0 | |
| FAILs en § 3 (Onboarding) | 0 | |
| FAILs en § 7–8 (Sandbox) | 0 | |
| FAILs en § 13–14 (WhatsApp Mock) | 0 | |
| FAILs en § 24 (System Health) | 0 | |
| FAILs en § 26 (RLS Isolation) | 0 | |

**Veredicto:** `[ ] APROBADO` / `[ ] NO APROBADO`

---

## Procedimiento para Bugs Encontrados

### Tipo A — Error de configuración (env var faltante o incorrecta)

1. Identificar la variable afectada
2. Corregir en Vercel Dashboard → Settings → Environment Variables
3. Hacer **Redeploy** (sin cambios de código)
4. Re-ejecutar sección afectada

### Tipo B — Error de migración o datos

1. Conectar al SQL Editor del proyecto Supabase staging
2. Diagnosticar con query manual
3. Ejecutar SQL de corrección (no DROP sin backup)
4. Re-ejecutar smoke test de la sección afectada

### Tipo C — Error de código

1. Reproducir localmente con `npm run dev`
2. Corregir en local
3. `npm run lint && npm run build` → confirmar sin errores
4. `git add . && git commit -m "fix: <descripción>"`
5. `git push origin release/staging-v0.9.0`
6. Vercel auto-deploy → esperar build
7. Re-ejecutar smoke test

### Tipo D — Error de Vercel runtime (500)

1. Vercel Dashboard → Deployments → Functions → Logs
2. Identificar la función afectada (ruta)
3. Buscar stack trace en logs
4. Seguir procedimiento Tipo A, B o C según la causa

### Tipo E — Error de datos de test (datos inconsistentes)

1. Limpiar datos del usuario de test desde SQL Editor:
   ```sql
   -- Identificar workspace del usuario de test
   SELECT id FROM waai_workspaces WHERE owner_id = '<user-id>';
   -- Los datos se eliminan en cascada al eliminar el workspace (si RLS lo permite)
   ```
2. Eliminar usuario de test desde Dashboard → Authentication → Users
3. Repetir el flujo completo desde § 2

---

## Comando de Simulación WhatsApp (§ 14)

```bash
export STAGING_URL=https://waai-saas-staging.vercel.app
export SESSION_TOKEN=<bearer-token-de-usuario-de-test>
export CONNECTION_ID=<id-de-conexion-mock-creada-en-13>

# Test 14.1
curl -X POST $STAGING_URL/api/whatsapp/simulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d "{\"connectionId\":\"$CONNECTION_ID\",\"from\":\"1234567890\",\"message\":\"Hola, necesito información\"}"
# Esperado: HTTP 200
```

---

## Notas de Ejecución

```
Inicio: ___________________________
Fin: ___________________________
Tester: ___________________________
URL staging usada: ___________________________
Total PASS: ___ / 96
Secciones críticas con FAIL: ___________________________
Veredicto final: ___________________________
Observaciones: 




```
