-- ============================================================
-- WAAI SaaS — Staging Seed: waai_plans
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Proyecto: waai-saas-staging
-- Después de: supabase db push (todas las migraciones aplicadas)
-- ============================================================

-- Verificar que la tabla existe y está vacía antes de seedear
SELECT COUNT(*) AS planes_actuales FROM waai_plans;
-- Si retorna > 0, los planes ya existen. Usar ON CONFLICT DO NOTHING es seguro.

-- ============================================================
-- Insertar 4 planes base
-- max_agents = -1 significa ilimitado
-- max_messages_per_month = -1 significa ilimitado
-- max_knowledge_documents = -1 significa ilimitado
-- max_whatsapp_connections = -1 significa ilimitado
-- max_members = -1 significa ilimitado
-- ============================================================

INSERT INTO waai_plans (
  id,
  name,
  slug,
  price_monthly_cents,
  price_yearly_cents,
  max_agents,
  max_messages_per_month,
  max_knowledge_documents,
  max_whatsapp_connections,
  max_members,
  human_handoff_enabled
) VALUES
  (
    gen_random_uuid(),
    'Free',
    'free',
    0,
    0,
    1,
    100,
    5,
    1,
    2,
    false
  ),
  (
    gen_random_uuid(),
    'Starter',
    'starter',
    2900,
    29000,
    3,
    1000,
    20,
    2,
    5,
    true
  ),
  (
    gen_random_uuid(),
    'Pro',
    'pro',
    7900,
    79000,
    10,
    5000,
    100,
    5,
    15,
    true
  ),
  (
    gen_random_uuid(),
    'Agency',
    'agency',
    19900,
    199000,
    -1,
    -1,
    -1,
    -1,
    -1,
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Verificación post-seed
-- Esperado: 4 filas (free, starter, pro, agency)
-- ============================================================

SELECT
  slug,
  name,
  price_monthly_cents,
  price_yearly_cents,
  max_agents,
  max_messages_per_month,
  max_knowledge_documents,
  max_whatsapp_connections,
  max_members,
  human_handoff_enabled
FROM waai_plans
ORDER BY price_monthly_cents;
