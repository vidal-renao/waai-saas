# Vercel Staging Setup — WAAI SaaS v0.9.0

**Branch de deploy:** `release/staging-v0.9.0`  
**Framework:** Next.js  
**Node.js:** 20.x  
**Fecha:** 2026-06-11

---

## Prerequisitos

Antes de configurar Vercel:

- [ ] Repositorio GitHub `waai-saas` creado y con push de la branch `release/staging-v0.9.0`
- [ ] Proyecto Supabase staging activo con migraciones aplicadas y planes seeded
- [ ] Credenciales Supabase staging disponibles (URL, Anon Key, Service Role Key)
- [ ] API keys Anthropic y OpenAI disponibles
- [ ] Secrets `ENCRYPTION_KEY` e `INTERNAL_API_SECRET` generados localmente

---

## 1. Crear proyecto en Vercel

1. Ir a [vercel.com/new](https://vercel.com/new)
2. Click **Add New Project**
3. Conectar con GitHub → seleccionar repositorio `waai-saas`
4. Configurar:

| Campo | Valor |
|---|---|
| Framework Preset | **Next.js** (auto-detectado) |
| Root Directory | `.` (raíz del repo) |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |
| Node.js Version | **20.x** |

5. **No hacer deploy todavía** — primero configurar variables de entorno

---

## 2. Configurar branch de staging

En **Settings → Git**:

- Production branch: `main` (dejar para producción real)
- Preview branches: `release/staging-v0.9.0` (auto-deploy en cada push)

Para el staging inicial, hacer el deploy manual desde la branch `release/staging-v0.9.0`.

---

## 3. Variables de entorno

Ir a **Project → Settings → Environment Variables**.

> Para staging, agregar todas las variables con scope **Preview** (o crear un environment personalizado llamado `staging`).

### Grupo 1 — Boot (Required)

| Variable | Valor staging | Tipo |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://waai-saas-staging.vercel.app` (actualizar con URL real) | Plain |
| `NEXT_PUBLIC_APP_NAME` | `WAAI SaaS Staging` | Plain |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Plain |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key del proyecto) | Plain |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service role key) | **Sensitive** |

### Grupo 2 — AI (Required para features principales)

| Variable | Valor staging | Tipo |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | **Sensitive** |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5-20251001` | Plain |
| `ANTHROPIC_MODEL_FAST` | `claude-haiku-4-5-20251001` | Plain |
| `ANTHROPIC_MODEL_QUALITY` | `claude-sonnet-4-6` | Plain |
| `OPENAI_API_KEY` | `sk-...` | **Sensitive** |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Plain |
| `OPENAI_EMBEDDING_DIMENSIONS` | `1536` | Plain |

### Grupo 3 — WhatsApp (Staging = Mock)

| Variable | Valor staging | Nota |
|---|---|---|
| `WHATSAPP_PROVIDER` | `mock` | **Confirmar: siempre `mock` en staging** |
| `WHAPI_TOKEN` | _(vacío)_ | No requerido en mock mode |
| `WHAPI_BASE_URL` | _(vacío)_ | No requerido en mock mode |
| `WHAPI_WEBHOOK_SECRET` | _(vacío)_ | No requerido en mock mode |

### Grupo 4 — Security (Required)

| Variable | Valor staging | Tipo |
|---|---|---|
| `ENCRYPTION_KEY` | _(32-byte hex generado localmente)_ | **Sensitive** |
| `INTERNAL_API_SECRET` | _(32-byte hex generado localmente)_ | **Sensitive** |
| `LOG_LEVEL` | `info` | Plain |
| `ENABLE_DEBUG_LOGS` | `false` | Plain |

### Grupo 5 — Future (vacíos — dejar así para staging)

| Variable | Valor | Nota |
|---|---|---|
| `STRIPE_SECRET_KEY` | _(vacío)_ | No activar en staging |
| `STRIPE_WEBHOOK_SECRET` | _(vacío)_ | No activar en staging |
| `STRIPE_PRICE_STARTER` | _(vacío)_ | No activar en staging |
| `STRIPE_PRICE_PRO` | _(vacío)_ | No activar en staging |
| `STRIPE_PRICE_AGENCY` | _(vacío)_ | No activar en staging |
| `BILLING_PROVIDER` | _(vacío)_ | No activar en staging |
| `SENTRY_DSN` | _(vacío)_ | No activar en staging |
| `CRON_SECRET` | _(vacío)_ | No activar en staging |
| `META_APP_ID` | _(vacío)_ | No activar en staging |
| `META_APP_SECRET` | _(vacío)_ | No activar en staging |
| `META_WEBHOOK_VERIFY_TOKEN` | _(vacío)_ | No activar en staging |
| `META_ACCESS_TOKEN` | _(vacío)_ | No activar en staging |

---

## 4. Deploy inicial

```bash
# Desde local, trigger el deploy haciendo push
git push origin release/staging-v0.9.0
```

O en el Dashboard de Vercel: **Deployments → Redeploy** (si el proyecto ya está creado).

---

## 5. Revisar build logs

En Vercel Dashboard → **Deployments → [deploy activo] → View Build Logs**:

Señales de éxito:

```
✓ Compiled successfully
✓ Route (app)
  ○ /                              (static)
  ○ /login                         (static)
  ƒ /api/health                    (dynamic)
  ƒ /api/agents/[agentId]/...      (dynamic)
  ...
  ✓ 79 routes
```

Señales de error a investigar:

| Error en logs | Causa probable | Acción |
|---|---|---|
| `Error: Missing required env var` | Variable no configurada | Revisar grupo 1-4 en env vars |
| `NEXT_NOT_FOUND` en páginas | Rutas dinámicas con error | Revisar output de build |
| `Module not found` | Dependencia faltante | `npm install` y rebuild |
| Timeout en build | Proyecto muy grande | Verificar que node_modules está en .gitignore |
| `Error: SUPABASE_URL` | Env var mal escrita | Verificar nombre exacto de la variable |

---

## 6. Obtener URL staging

Después del deploy exitoso:

- En Vercel Dashboard → el proyecto tendrá una URL automática: `waai-saas-<hash>.vercel.app`
- Actualizar `NEXT_PUBLIC_APP_URL` en Vercel env vars con esta URL exacta
- Hacer un **Redeploy** para que la variable actualizada tome efecto

---

## 7. Verificar health endpoints

```bash
export STAGING_URL=https://waai-saas-staging.vercel.app
export INTERNAL_SECRET=<tu-INTERNAL_API_SECRET>

# Health básico
curl $STAGING_URL/api/health
# Esperado: {"status":"ok"}

# Health con DB
curl -H "x-internal-secret: $INTERNAL_SECRET" $STAGING_URL/api/health/db
# Esperado: {"status":"ok","database":"ok"}

# Health AI
curl -H "x-internal-secret: $INTERNAL_SECRET" $STAGING_URL/api/health/ai
# Esperado: {"status":"ok"}

# Sin secret debe retornar 401
curl $STAGING_URL/api/health/db
# Esperado: HTTP 401
```

O ejecutar el script:

```bash
APP_URL=$STAGING_URL INTERNAL_API_SECRET=$INTERNAL_SECRET \
  npx ts-node --skipProject scripts/verify-health-endpoints.ts
```

---

## 8. Qué hacer si el deploy falla

### Build falla (error de TypeScript/lint)

```bash
# Reproducir localmente
npm run build
# Identificar el error y corregirlo
# Hacer commit y push para trigger nuevo deploy automático
```

### Runtime error (500 en health endpoint)

```bash
# Ver runtime logs en Vercel
vercel logs https://waai-saas-staging.vercel.app --follow
# O desde Dashboard: Deployments → Functions → Logs
```

### Supabase connection error

1. Verificar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Vercel
2. Confirmar que el proyecto Supabase staging está activo (no pausado)
3. Verificar `SUPABASE_SERVICE_ROLE_KEY` (sensitive — copiar con cuidado)

---

## Checklist de Deploy

```
[ ] Repositorio GitHub conectado
[ ] Branch release/staging-v0.9.0 configurada como branch de staging
[ ] Framework: Next.js, Node.js: 20.x
[ ] Build command: npm run build
[ ] Todas las variables del Grupo 1 (Boot) configuradas
[ ] Todas las variables del Grupo 2 (AI) configuradas
[ ] WHATSAPP_PROVIDER = mock
[ ] ENCRYPTION_KEY configurado (sensitive)
[ ] INTERNAL_API_SECRET configurado (sensitive)
[ ] Build completado sin errores
[ ] 79 rutas en build output
[ ] URL staging accesible
[ ] NEXT_PUBLIC_APP_URL actualizado con URL real y redeploy hecho
[ ] /api/health retorna {"status":"ok"}
[ ] /api/health/db con secret retorna ok
[ ] /api/health/db sin secret retorna 401
[ ] Runtime logs sin errores 500
```
