# Supabase Staging Setup — WAAI SaaS v0.9.0

**Proyecto a crear:** `waai-saas-staging`  
**Región recomendada:** Central Europe (Frankfurt) — `eu-central-1`  
**Plan:** Free (staging)  
**Fecha:** 2026-06-11

> **Regla absoluta:** No reutilizar proyectos existentes (`upuhppsbolpdpaighzfq` ni `focgfmhgfmhmcbywwsej`). Crear un proyecto dedicado para WAAI staging.

---

## 1. Crear el proyecto

1. Ir a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New project**
3. Configurar:

| Campo | Valor |
|---|---|
| Organization | Seleccionar tu organización activa |
| Project name | `waai-saas-staging` |
| Database password | Click **Generate a password** → copiar y guardar en gestor de contraseñas |
| Region | **Central Europe (Frankfurt)** |
| Plan | Free |

4. Click **Create new project**
5. Esperar ~2 minutos hasta que el panel muestre el proyecto activo

---

## 2. Obtener y guardar credenciales

Una vez activo, ir a **Settings → API** y copiar:

| Credencial | Dónde encontrarla | Uso |
|---|---|---|
| **Project Ref** | URL del dashboard: `supabase.com/dashboard/project/<ref>` | `supabase link` |
| **Project URL** | Settings → API → Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| **Anon/Public key** | Settings → API → Project API keys → `anon public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Service Role key** | Settings → API → Project API keys → `service_role` | `SUPABASE_SERVICE_ROLE_KEY` |
| **Database password** | El que generaste en el paso 1 | `supabase link` |

> **Seguridad:** Nunca commitear estas credenciales. Guardar en gestor de contraseñas (1Password, Bitwarden) o en la sección Secrets del repo de GitHub.

---

## 3. Habilitar extensión pgvector

> **Crítico:** Debe hacerse ANTES de aplicar las migraciones. La migración Phase 4 (`20260610000004_phase4_knowledge_base_rag.sql`) usa `CREATE EXTENSION IF NOT EXISTS vector`.

1. En el Dashboard del proyecto nuevo: **Database → Extensions**
2. Buscar `vector` en el buscador
3. Click el toggle para **Enable**
4. Esperar confirmación

Verificar en **SQL Editor**:

```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
```

Resultado esperado:

| extname | extversion |
|---|---|
| vector | 0.8.x |

Si no aparece ninguna fila, no continuar con las migraciones.

---

## 4. Actualizar Supabase CLI

```bash
# Verificar versión instalada
supabase --version
# Instalada: 2.95.4 — Disponible: 2.105.0

# Actualizar
npm install -g supabase@latest

# Confirmar
supabase --version
# Esperado: 2.105.0 (o superior)
```

---

## 5. Vincular CLI al proyecto staging

```bash
cd "c:\Users\Admin\Documents\VIDAL ECOSYSTEM\waai-saas"

supabase link --project-ref <project-ref>
# Pedirá el database password → ingresarlo
```

Verificar:

```bash
supabase status
# Debe mostrar el proyecto vinculado y DB accesible
```

---

## 6. Dry-run de migraciones

```bash
supabase db push --dry-run
```

Deben aparecer exactamente estas 9 migraciones:

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

Si hay errores en el dry-run, **no continuar**. Revisar el error en la migración indicada.

---

## 7. Aplicar migraciones

```bash
supabase db push
```

Output esperado para cada migración:

```
Applying migration 20260607000001_phase1_core_saas.sql...done
Applying migration 20260607000002_phase2_agent_builder.sql...done
...
```

---

## 8. Verificar estado de migraciones

```bash
supabase migration list
```

Todas las 9 migraciones deben mostrar `applied`.

---

## 9. Verificación post-migración

Ejecutar en **Dashboard → SQL Editor** (copiar de [`docs/sql/waai-staging-verification.sql`](../sql/waai-staging-verification.sql)):

### ① Total de tablas waai_ (esperado: 34)

```sql
SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'waai_%';
```

### ② RLS en todas las tablas (todas deben ser `true`)

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'waai_%'
ORDER BY tablename;
```

Cualquier fila con `rowsecurity = false` es un defecto de seguridad.

### ③ RPCs con SECURITY DEFINER

```sql
SELECT p.proname AS function_name, p.prosecdef
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'waai_%'
ORDER BY p.proname;
```

### ④ Columna embedding en waai_knowledge_chunks

```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'waai_knowledge_chunks' AND column_name = 'embedding';
-- Esperado: data_type = USER-DEFINED, udt_name = vector
```

---

## 10. Seed de planes de billing

Ejecutar en **SQL Editor** (copiar de [`docs/sql/waai-staging-seed-plans.sql`](../sql/waai-staging-seed-plans.sql)):

```sql
INSERT INTO waai_plans (
  id, name, slug, price_monthly_cents, price_yearly_cents,
  max_agents, max_messages_per_month, max_knowledge_documents,
  max_whatsapp_connections, max_members, human_handoff_enabled
) VALUES
  (gen_random_uuid(), 'Free',    'free',    0,     0,      1,  100,   5,   1,  2,  false),
  (gen_random_uuid(), 'Starter', 'starter', 2900,  29000,  3,  1000,  20,  2,  5,  true),
  (gen_random_uuid(), 'Pro',     'pro',     7900,  79000,  10, 5000,  100, 5,  15, true),
  (gen_random_uuid(), 'Agency',  'agency',  19900, 199000, -1, -1,    -1,  -1, -1, true)
ON CONFLICT (slug) DO NOTHING;

-- Verificar
SELECT slug, name, max_agents, max_messages_per_month
FROM waai_plans ORDER BY price_monthly_cents;
```

Resultado esperado: 4 filas (free, starter, pro, agency).

---

## 11. Verificar RLS desde CLI (opcional)

Una vez `.env.local` configurado con las credenciales del proyecto staging:

```bash
npx ts-node --skipProject scripts/verify-rls-policies.ts
# Esperado: PASS — All 34 waai_ tables have RLS enabled.
```

---

## Checklist Final

```
[ ] Proyecto waai-saas-staging creado en Dashboard
[ ] Credenciales guardadas (Project Ref, URL, Anon Key, Service Role Key, DB Password)
[ ] pgvector habilitado: SELECT extname FROM pg_extension WHERE extname = 'vector' → OK
[ ] CLI actualizado a 2.105.0+
[ ] supabase link exitoso
[ ] supabase migration list → 9 pending antes del push
[ ] supabase db push --dry-run → 0 errores
[ ] supabase db push → 9/9 applied
[ ] supabase migration list → 9/9 applied
[ ] SELECT COUNT(*) → 34 tablas waai_
[ ] RLS verificado → todas con rowsecurity = true
[ ] RPCs verificados → todas con prosecdef = true
[ ] pgvector en pg_extension → OK
[ ] Columna embedding tipo vector → OK
[ ] Seed planes ejecutado → 4 filas en waai_plans
[ ] verify-rls-policies.ts → PASS
```
