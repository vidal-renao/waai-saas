-- ============================================================
-- WAAI SaaS — Notas de Rollback para Staging
-- ============================================================
-- ADVERTENCIA:
-- Este fichero NO es un script de rollback automático.
-- Es un conjunto de notas y queries de diagnóstico.
-- Ninguna línea ejecutable aquí hace DROP, DELETE ni TRUNCATE
-- sin que sea explícitamente la intención del operador.
--
-- Antes de cualquier operación destructiva:
-- 1. Crear backup desde Supabase Dashboard → Settings → Backups
-- 2. Confirmar con el release manager
-- 3. Nunca ejecutar DROP CASCADE en producción sin aprobación escrita
-- ============================================================


-- ============================================================
-- DIAGNÓSTICO 1: Estado de migraciones aplicadas
-- ============================================================

-- Ver qué migraciones están registradas en Supabase
SELECT
  version,
  name,
  inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY inserted_at;


-- ============================================================
-- DIAGNÓSTICO 2: Tablas existentes en el schema public
-- ============================================================

SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;


-- ============================================================
-- DIAGNÓSTICO 3: Funciones definidas por el usuario
-- ============================================================

SELECT
  p.proname,
  pg_get_function_arguments(p.oid) AS args,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE 'waai_%'
ORDER BY p.proname;


-- ============================================================
-- ESCENARIO DE ROLLBACK A — Migración individual falla
-- ============================================================
--
-- Si una migración específica falla durante supabase db push:
--
-- 1. Identificar la migración fallida en el output de CLI
-- 2. Revisar el fichero de migración en supabase/migrations/
-- 3. Corregir el SQL si hay un error sintáctico o de datos
-- 4. Ejecutar la corrección manualmente en SQL Editor si es seguro
-- 5. Marcar la migración como aplicada solo si fue ejecutada con éxito:
--    (esto lo hace supabase internamente — no manipular manualmente)
-- 6. Reintentar supabase db push
--
-- Si la migración creó objetos parcialmente:
-- Identificar qué tablas/funciones fueron creadas y cuáles no.
-- Usar DIAGNÓSTICO 2 y 3 arriba para verificar estado.


-- ============================================================
-- ESCENARIO DE ROLLBACK B — Resetear proyecto Supabase staging
-- ============================================================
--
-- Opción más segura para staging: eliminar y recrear el proyecto
--
-- Pasos:
-- 1. Ir a Supabase Dashboard → proyecto waai-saas-staging
-- 2. Settings → General → Delete Project
-- 3. Confirmar eliminación
-- 4. Crear nuevo proyecto con mismo nombre
-- 5. Repetir proceso desde "Habilitar pgvector" en el runbook
--
-- NOTA: Esta opción elimina TODOS los datos del proyecto staging.
-- Es aceptable para staging. No usar en producción.


-- ============================================================
-- ESCENARIO DE ROLLBACK C — Datos corruptos post-seed
-- ============================================================
--
-- Si el seed de waai_plans se ejecutó con valores incorrectos:

-- Verificar estado actual:
SELECT id, slug, name, price_monthly_cents FROM waai_plans;

-- Corregir un plan específico (ejemplo — ajustar valores según necesidad):
-- UPDATE waai_plans SET price_monthly_cents = 2900 WHERE slug = 'starter';

-- Si el seed creó duplicados (no debería con ON CONFLICT DO NOTHING):
-- Identificar duplicados:
SELECT slug, COUNT(*) FROM waai_plans GROUP BY slug HAVING COUNT(*) > 1;

-- Eliminar duplicados (mantener el más reciente):
-- DELETE FROM waai_plans
-- WHERE id NOT IN (
--   SELECT DISTINCT ON (slug) id FROM waai_plans ORDER BY slug, created_at DESC
-- );


-- ============================================================
-- TABLAS AFECTADAS POR UN RESET COMPLETO
-- ============================================================
--
-- Un DROP de todas las tablas waai_ afectaría:
--
-- Fase 1: waai_workspaces, waai_workspace_members, waai_invitations,
--         waai_plans, waai_subscriptions, waai_usage_events
-- Fase 2: waai_agents, waai_agent_versions, waai_agent_personas,
--         waai_agent_goals, waai_agent_restrictions
-- Fase 3: waai_conversations, waai_messages, waai_agent_runs
-- Fase 4: waai_knowledge_bases, waai_knowledge_documents,
--         waai_knowledge_chunks, waai_agent_knowledge_sources
-- Fase 5: waai_whatsapp_connections, waai_whatsapp_messages,
--         waai_whatsapp_webhook_events
-- Fase 6: waai_leads, waai_handoffs, waai_internal_notes
-- Fase 7: waai_analytics_events, waai_daily_summaries,
--         waai_agent_performance, waai_lead_funnel_snapshots
-- Fase 8: waai_audit_logs, waai_api_rate_limits,
--         waai_plan_limit_overrides, waai_ai_cost_snapshots
--
-- Total: 34 tablas


-- ============================================================
-- RECOMENDACIONES GENERALES
-- ============================================================
--
-- 1. Antes de cualquier operación potencialmente destructiva:
--    Dashboard → Settings → Backups → Create backup
--
-- 2. Nunca ejecutar en producción sin aprobación explícita del CTO
--
-- 3. Para staging: la opción más segura siempre es eliminar
--    el proyecto Supabase y crearlo de nuevo desde cero
--
-- 4. Mantener los ficheros de migración en git como fuente de verdad
--    Los datos de staging son desechables
--    Los ficheros SQL en supabase/migrations/ son el estado definitivo
