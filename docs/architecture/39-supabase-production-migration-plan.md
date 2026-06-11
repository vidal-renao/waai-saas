# Architecture 39 — Supabase Production Migration Plan

## Objetivo

Guía para aplicar migraciones de forma segura en la base de datos remota de Supabase.

## Prerequisitos

```bash
# Instalar CLI de Supabase
npm install -g supabase

# Login
supabase login

# Vincular proyecto remoto
supabase link --project-ref <project-ref>
```

## Orden de Migraciones

Las migraciones deben aplicarse en orden estricto por timestamp:

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

Nunca saltarse una migración. Si hay mismatch en `supabase_migrations.schema_migrations`, usar `supabase migration repair`.

## Proceso de Deploy de Migración

### 1. Backup

```bash
# Backup completo de la base de datos remota
pg_dump "$DATABASE_URL" --no-owner --no-acl -F c -f backup_pre_phase8_$(date +%Y%m%d%H%M).dump
```

Si no tienes acceso directo, usa el botón "Backup" en el dashboard de Supabase (Settings → Database).

### 2. Verificación Local

```bash
# Verificar que las migraciones aplican sin error en local
supabase db reset

# O aplicar solo la nueva migración
supabase db push --dry-run
```

### 3. Aplicar en Remoto

```bash
# Aplicar migraciones pendientes
supabase db push

# Verificar que se aplicó
supabase migration list
```

### 4. Verificación Post-Deploy

```bash
# Verificar tablas nuevas
supabase db execute --command "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'waai_%' ORDER BY table_name;"

# Verificar RLS
supabase db execute --command "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'waai_%';"

# Verificar funciones
supabase db execute --command "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'waai_%';"

# Verificar extension pgvector
supabase db execute --command "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

## Verificar RLS

```sql
-- Verificar que todas las tablas waai_ tienen RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'waai_%'
ORDER BY tablename;

-- Todas deben tener rowsecurity = true
```

## Verificar Functions/RPCs

```sql
-- Listar todas las funciones waai_
SELECT routine_name, security_type, external_language
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE 'waai_%';

-- Verificar SECURITY DEFINER y search_path
SELECT proname, prosecdef, proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'waai_%';
```

Todas las RPCs críticas deben tener `prosecdef = true` y `proconfig` con `search_path=public`.

## Verificar pgvector

```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
-- Debe devolver al menos una fila con version >= 0.5.0
```

## Verificar Service Role

El `SUPABASE_SERVICE_ROLE_KEY` permite bypass de RLS. Verificar que:

1. Solo se usa en `src/lib/supabase/service-role.ts`.
2. No aparece en ningún componente cliente.
3. No está en logs ni en respuestas de API.

```bash
# Verificar que service role no se usa en client components
grep -r "SUPABASE_SERVICE_ROLE_KEY" src/app --include="*.tsx" --include="*.ts"
# Resultado esperado: solo archivos que no tienen "use client"
```

## Migration Repair

Si `supabase migration list` muestra inconsistencias:

```bash
# Ver estado
supabase migration list

# Marcar migración como aplicada (si ya se aplicó manualmente)
supabase migration repair --status applied 20260611000008

# Marcar como revertida
supabase migration repair --status reverted 20260611000008
```

## Rollback Manual

Si una migración falla parcialmente:

```sql
-- Ejemplo: eliminar tablas nuevas de Fase 8 si algo salió mal
DROP TABLE IF EXISTS waai_system_health_events CASCADE;
DROP TABLE IF EXISTS waai_billing_events CASCADE;
DROP TABLE IF EXISTS waai_ai_cost_snapshots CASCADE;

DROP FUNCTION IF EXISTS waai_get_production_health(uuid);
DROP FUNCTION IF EXISTS waai_get_billing_readiness_snapshot(uuid);
DROP FUNCTION IF EXISTS waai_get_ai_cost_snapshot(uuid, date, date);
DROP FUNCTION IF EXISTS waai_log_system_health_event(uuid, text, text, text, text, uuid, text, jsonb);
DROP FUNCTION IF EXISTS waai_log_billing_event(uuid, uuid, text, text, text, integer, text, text, jsonb);
```

## Checklist Post-Deploy

- [ ] `supabase migration list` — todas las migraciones marcadas como `applied`.
- [ ] `waai_system_health_events` existe y tiene RLS.
- [ ] `waai_billing_events` existe y tiene RLS.
- [ ] `waai_ai_cost_snapshots` existe y tiene RLS.
- [ ] `waai_get_production_health` función existe.
- [ ] `waai_get_ai_cost_snapshot` función existe.
- [ ] `GET /api/health` responde 200.
- [ ] `GET /api/health/db` responde 200 con status `ok`.
- [ ] Analytics sigue funcionando.
- [ ] Sandbox sigue funcionando.
- [ ] No hay errores en logs de Supabase.

## Producción — Variables Requeridas en Vercel

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
ANTHROPIC_MODEL
OPENAI_API_KEY
ENCRYPTION_KEY
INTERNAL_API_SECRET
NEXT_PUBLIC_APP_URL
```

Las siguientes son opcionales en Fase 8 pero deben estar vacías (no undefined):
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SENTRY_DSN=
```
