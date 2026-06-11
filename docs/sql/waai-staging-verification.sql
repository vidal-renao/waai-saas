-- ============================================================
-- WAAI SaaS — Verificación Post-Migración (Staging)
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Después de: supabase db push (todas las migraciones aplicadas)
-- Proyecto: waai-saas-staging
-- ============================================================


-- ============================================================
-- 1. Contar tablas waai_
-- Esperado: 34
-- ============================================================

SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'waai_%';


-- ============================================================
-- 2. Listar todas las tablas waai_ con estado de RLS
-- Esperado: rowsecurity = true en TODAS
-- Si alguna tiene rowsecurity = false → defecto de seguridad
-- ============================================================

SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'waai_%'
ORDER BY tablename;


-- ============================================================
-- 3. Detectar tablas waai_ SIN RLS habilitado
-- Esperado: 0 filas (ninguna tabla debe estar aquí)
-- ============================================================

SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'waai_%'
  AND rowsecurity = false
ORDER BY tablename;


-- ============================================================
-- 4. Verificar funciones waai_ con SECURITY DEFINER
-- Esperado: prosecdef = true en TODAS las funciones waai_
-- ============================================================

SELECT
  p.proname AS function_name,
  p.prosecdef AS security_definer,
  pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE 'waai_%'
ORDER BY p.proname;


-- ============================================================
-- 5. Detectar funciones waai_ SIN SECURITY DEFINER
-- Esperado: 0 filas
-- ============================================================

SELECT p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE 'waai_%'
  AND p.prosecdef = false
ORDER BY p.proname;


-- ============================================================
-- 6. Verificar que pgvector está habilitado
-- Esperado: 1 fila con extname = 'vector'
-- ============================================================

SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';


-- ============================================================
-- 7. Verificar columna embedding en waai_knowledge_chunks
-- Esperado: data_type = USER-DEFINED, udt_name = vector
-- ============================================================

SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'waai_knowledge_chunks'
  AND column_name = 'embedding';


-- ============================================================
-- 8. Verificar tablas por fase
-- Muestra si las tablas clave de cada fase existen
-- ============================================================

SELECT
  table_name,
  CASE
    WHEN table_name IN (
      'waai_workspaces', 'waai_workspace_members', 'waai_invitations',
      'waai_plans', 'waai_subscriptions', 'waai_usage_events'
    ) THEN 'Fase 1 — Core SaaS'
    WHEN table_name IN (
      'waai_agents', 'waai_agent_versions', 'waai_agent_personas',
      'waai_agent_goals', 'waai_agent_restrictions'
    ) THEN 'Fase 2 — Agent Builder'
    WHEN table_name IN (
      'waai_conversations', 'waai_messages', 'waai_agent_runs'
    ) THEN 'Fase 3 — Chat Sandbox'
    WHEN table_name IN (
      'waai_knowledge_bases', 'waai_knowledge_documents',
      'waai_knowledge_chunks', 'waai_agent_knowledge_sources'
    ) THEN 'Fase 4 — Knowledge/RAG'
    WHEN table_name IN (
      'waai_whatsapp_connections', 'waai_whatsapp_messages',
      'waai_whatsapp_webhook_events'
    ) THEN 'Fase 5 — WhatsApp'
    WHEN table_name IN (
      'waai_leads', 'waai_handoffs', 'waai_internal_notes'
    ) THEN 'Fase 6 — Leads/Handoff'
    WHEN table_name IN (
      'waai_analytics_events', 'waai_daily_summaries',
      'waai_agent_performance', 'waai_lead_funnel_snapshots'
    ) THEN 'Fase 7 — Analytics'
    WHEN table_name IN (
      'waai_audit_logs', 'waai_api_rate_limits',
      'waai_plan_limit_overrides', 'waai_ai_cost_snapshots'
    ) THEN 'Fase 8 — Hardening/Billing'
    ELSE 'Otros'
  END AS phase
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'waai_%'
ORDER BY phase, table_name;


-- ============================================================
-- 9. Verificar policies RLS existentes
-- Muestra las políticas definidas en cada tabla waai_
-- ============================================================

SELECT
  tablename,
  policyname,
  cmd AS command,
  qual AS using_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'waai_%'
ORDER BY tablename, policyname;


-- ============================================================
-- 10. Verificar waai_plans (debe tener 4 filas post-seed)
-- Ejecutar DESPUÉS del seed de planes
-- ============================================================

SELECT
  slug,
  name,
  price_monthly_cents,
  max_agents,
  max_messages_per_month,
  human_handoff_enabled
FROM waai_plans
ORDER BY price_monthly_cents;
