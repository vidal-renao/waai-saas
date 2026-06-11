# Staging Execution Runbook — WAAI SaaS v0.9.0

**Última actualización:** 2026-06-11  
**Versión objetivo:** 0.9.0  
**Entorno destino:** staging / pre-producción  
**Autor:** Release Manager

---

## Objetivo

Llevar WAAI SaaS desde código listo (`lint OK, build OK, TypeScript OK`) hasta staging completamente operativo: Supabase configurado, migraciones aplicadas, Vercel desplegado, health checks pasando y smoke tests ≥ 90/96.

---

## Estado Actual

| Componente | Estado |
|---|---|
| `npm run lint` | ✅ 0 errores |
| `npm run build` | ✅ Limpio, 79 rutas |
| TypeScript | ✅ Sin errores |
| `package.json` version | ✅ `0.9.0` |
| `.env.local` | ❌ No existe |
| Git — código commiteado | ❌ Todo untracked |
| Branch `release/staging-v0.9.0` | ❌ No existe |
| GitHub remote | ❌ No configurado |
| Supabase staging project | ❌ No existe |
| Supabase vinculado | ❌ No vinculado |
| Migraciones aplicadas | ❌ 0/9 |
| pgvector habilitado | ❌ No verificado |
| Seed de planes | ❌ No aplicado |
| Vercel staging | ❌ No configurado |
| Variables de entorno Vercel | ❌ No configuradas |

---

## Bloqueadores Actuales

| # | Bloqueador | Impacto |
|---|---|---|
| B1 | Sin repositorio GitHub | Vercel no puede conectarse |
| B2 | Sin proyecto Supabase staging | App no arranca |
| B3 | pgvector no habilitado | Migración 5 falla |
| B4 | Sin seed de `waai_plans` | Registro/onboarding falla (FK violation) |
| B5 | Sin env vars Vercel | Auth/AI fallan aunque build pase |

---

## Criterios de Parada

Detener el proceso y no continuar si:

- `supabase db push --dry-run` muestra errores
- `supabase db push` falla en cualquier migración
- `SELECT COUNT(*) FROM waai_plans` retorna 0 después del seed
- Build de Vercel falla
- Cualquiera de `/api/health`, `/api/health/db`, `/api/health/ai` retorna error

---

## Orden de Ejecución

### Paso 1 — Commitear código y crear branch

**Contexto:** El repo tiene 1 solo commit inicial. Todo el código WAAI está untracked.

```bash
cd "c:\Users\Admin\Documents\VIDAL ECOSYSTEM\waai-saas"

# Verificar qué se va a stagear
git status

# Stagear todo (el .gitignore ya excluye .env*, node_modules, .next)
git add .

# Confirmar que .env.local NO está en el stage (debe estar ausente)
git status | grep -i env

# Commit de versión
git commit -m "feat: WAAI SaaS v0.9.0 - Phases 1-9 complete

- Core SaaS multi-tenant (auth, workspaces, roles, billing)
- Agent Builder with 5-step wizard
- Chat Sandbox with Claude API integration
- Knowledge Base + RAG (pgvector + OpenAI embeddings)
- WhatsApp Integration (Whapi MVP + Mock provider)
- Leads & Human Handoff system
- Analytics & Operational Dashboard
- Production Hardening & Billing Readiness
- Deployment infrastructure, scripts, and docs

lint: 0 errors | build: clean | routes: 79 | version: 0.9.0"

# Crear rama de staging
git checkout -b release/staging-v0.9.0

# Verificar
git branch -a
```

**Criterio de éxito:** `* release/staging-v0.9.0` en el output de `git branch`.

---

### Paso 2 — Crear repositorio GitHub privado

```bash
# Opción A: GitHub CLI (recomendado)
gh repo create waai-saas --private --source=. --remote=origin --push

# Opción B: Manual
# 1. Crear repo en github.com/new → privado → sin README, sin .gitignore
# 2. Copiar la URL del repo (HTTPS o SSH)
git remote add origin https://github.com/<usuario>/waai-saas.git
git push -u origin main
git push -u origin release/staging-v0.9.0

# Verificar
git remote -v
```

**Criterio de éxito:** `origin` aparece en `git remote -v`, pushes exitosos.

---

### Paso 3 — Actualizar Supabase CLI

```bash
# Verificar versión actual
supabase --version
# Instalada: 2.95.4 → disponible: 2.105.0

# Actualizar
npm install -g supabase@latest

# Verificar
supabase --version
# Esperado: 2.105.0
```

---

### Paso 4 — Crear proyecto Supabase staging

Ver guía detallada: [`docs/operations/supabase-staging-setup.md`](supabase-staging-setup.md)

**Resumen:**

1. Ir a [supabase.com/dashboard](https://supabase.com/dashboard)
2. New project → `waai-saas-staging` → Frankfurt → generar DB password → guardar
3. Esperar activación (~2 min)
4. Guardar: Project Ref, URL, Anon Key, Service Role Key

---

### Paso 5 — Habilitar pgvector (ANTES de migrar)

> **Crítico:** La migración `20260610000004_phase4_knowledge_base_rag.sql` usa `CREATE EXTENSION IF NOT EXISTS vector`. Si pgvector no está habilitado, esta migración falla.

En el Dashboard del proyecto nuevo:
1. Database → Extensions
2. Buscar `vector`
3. Click **Enable**

Verificar en SQL Editor:

```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
-- Esperado: una fila con extname='vector'
```

**Criterio de parada:** Si pgvector no aparece, no continuar con las migraciones.

---

### Paso 6 — Vincular CLI al proyecto staging

```bash
cd "c:\Users\Admin\Documents\VIDAL ECOSYSTEM\waai-saas"

supabase link --project-ref <project-ref-del-paso-4>
# Ingresará el DB password del paso 4

# Verificar
supabase status
```

---

### Paso 7 — Dry-run de migraciones

```bash
supabase db push --dry-run
```

Deben aparecer exactamente estas 9 migraciones sin errores:

```
20260607000001_phase1_core_saas.sql
20260607000002_phase2_agent_builder.sql
20260609000003_phase3_chat_sandbox.sql
20260610000001_phase3_conversation_scope_integrity.sql
20260610000004_phase4_knowledge_base_rag.sql
20260610000005_phase5_whatsapp_integration.sql
20260610000006_phase6_leads_handoff.sql
20260611000007_phase7_analytics_dashboard.sql
20260611000008_phase8_production_hardening_billing_readiness.sql
```

**Criterio de parada:** Cualquier error en dry-run → revisar migración afectada antes de continuar.

---

### Paso 8 — Aplicar migraciones

```bash
supabase db push
```

Esperar output `Applying migration ... done` para las 9 migraciones.

```bash
# Verificar
supabase migration list
# Todas deben mostrar: applied
```

---

### Paso 9 — Verificar post-migración en SQL Editor

Ejecutar [`docs/sql/waai-staging-verification.sql`](../sql/waai-staging-verification.sql) en el Dashboard → SQL Editor.

Resultados esperados:
- Total tablas `waai_`: 34
- Todas con `rowsecurity = true`
- Todas las funciones `waai_*` con `prosecdef = true`
- pgvector activo
- Columna `embedding` tipo `vector` en `waai_knowledge_chunks`

---

### Paso 10 — Seed de planes de billing

Ejecutar [`docs/sql/waai-staging-seed-plans.sql`](../sql/waai-staging-seed-plans.sql) en SQL Editor.

```sql
-- Verificar resultado
SELECT slug, name, max_agents, max_messages_per_month
FROM waai_plans ORDER BY price_monthly_cents;
-- Esperado: 4 filas (free, starter, pro, agency)
```

**Criterio de parada:** Si hay 0 filas después del seed, no continuar.

---

### Paso 11 — Crear `.env.local` local

```bash
cp .env.staging.example .env.local
# Editar .env.local con valores reales del proyecto staging
```

Generar secrets:

```bash
# ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# INTERNAL_API_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Variables críticas a rellenar:

- `NEXT_PUBLIC_SUPABASE_URL` → URL del proyecto staging
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Anon key del proyecto staging
- `SUPABASE_SERVICE_ROLE_KEY` → Service role key del proyecto staging
- `ANTHROPIC_API_KEY` → Clave Anthropic real
- `OPENAI_API_KEY` → Clave OpenAI real
- `INTERNAL_API_SECRET` → Secret generado en el paso anterior
- `ENCRYPTION_KEY` → Secret generado en el paso anterior
- `WHATSAPP_PROVIDER=mock` → Confirmar que está en mock

---

### Paso 12 — Verificar variables de entorno locales

```bash
npx ts-node --skipProject scripts/verify-production-env.ts
```

**Criterio de éxito:** `PASS — All required variables are present.`

Alternativa con el script de staging:

```bash
npx ts-node --skipProject scripts/verify-staging-readiness.ts
```

---

### Paso 13 — Configurar Vercel staging

Ver guía detallada: [`docs/operations/vercel-staging-setup.md`](vercel-staging-setup.md)

**Resumen:**

1. [vercel.com/new](https://vercel.com/new) → importar `waai-saas`
2. Branch: `release/staging-v0.9.0`
3. Framework: Next.js, Node.js 20.x
4. Agregar todas las variables de entorno (ver guía)
5. Confirmar `WHATSAPP_PROVIDER=mock`
6. Deploy

---

### Paso 14 — Deploy staging

```bash
# El push a la branch activa el auto-deploy en Vercel
git push origin release/staging-v0.9.0
```

Monitorear en Vercel Dashboard → Deployments → Build logs.

**Criterio de éxito:**
- Build completa sin errores
- 79 rutas en output
- URL staging disponible

---

### Paso 15 — Health checks

```bash
APP_URL=https://<tu-staging-url>.vercel.app \
  INTERNAL_API_SECRET=<tu-secret> \
  npx ts-node --skipProject scripts/verify-health-endpoints.ts
```

O manualmente:

```bash
# Health básico (sin auth)
curl https://<staging-url>/api/health
# Esperado: {"status":"ok"}

# Health DB (con auth)
curl -H "x-internal-secret: <tu-secret>" \
  https://<staging-url>/api/health/db
# Esperado: {"status":"ok","database":"ok"}

# Sin auth → debe retornar 401
curl https://<staging-url>/api/health/db
# Esperado: HTTP 401
```

**Criterio de parada:** Cualquier health endpoint retorna error 500.

---

### Paso 16 — Smoke tests

Ejecutar [`docs/operations/staging-smoke-test-execution.md`](staging-smoke-test-execution.md) con la URL de staging activa.

**Criterio de aprobación:** ≥ 90/96 PASS, 0 FAILs en secciones críticas.

---

### Paso 17 — Sign-off

Completar [`docs/operations/release-staging-v0.9.0-checklist.md`](release-staging-v0.9.0-checklist.md).

---

## Riesgos Bloqueantes

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | pgvector no habilitado antes de migrar | Habilitar manualmente en Dashboard ANTES de `db push` |
| R2 | Sin seed de planes → FK violation en registro | Ejecutar seed SQL inmediatamente después de `db push` |
| R3 | Variables de entorno faltantes en Vercel | Verificar lista completa antes de primer deploy |
| R4 | Vercel Hobby plan + Claude API > 10s → timeout | `maxDuration=60` ya aplicado en 3 rutas críticas |
| R5 | `WHATSAPP_PROVIDER` no configurado | Confirmar `WHATSAPP_PROVIDER=mock` en .env.local y Vercel |

---

## Riesgos No Bloqueantes

| Riesgo | Impacto | Nota |
|---|---|---|
| Supabase CLI 2.95.4 | Posibles bugs menores | Actualizar a 2.105.0 antes de migrar |
| `waai_ai_cost_snapshots` sin cron | Panel AI costs vacío | Aceptable; cron en Fase 10 |
| Stripe no configurado | Sección billing muestra "not configured" | Intencional; warning OK en smoke test § 23 |
| Meta Cloud API no configurada | WhatsApp real no disponible | Intencional; staging usa mock |

---

## Rollback Básico de Staging

Si algo falla irreversiblemente en Supabase staging:

1. No ejecutar DROP CASCADE sin backup previo
2. Ver [`docs/sql/waai-staging-rollback-notes.sql`](../sql/waai-staging-rollback-notes.sql)
3. Opción más segura: eliminar el proyecto Supabase staging y crear uno nuevo
4. Repetir Pasos 4–10 de este runbook

Si algo falla en Vercel:

1. Vercel Dashboard → Deployments → seleccionar deploy anterior → Promote to Production
2. Corregir el problema en local → hacer commit → push → nuevo deploy automático
