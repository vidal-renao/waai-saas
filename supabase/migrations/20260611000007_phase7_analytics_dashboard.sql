-- ============================================================
-- Fase 7 — Analytics & Operational Dashboard
-- Migration: 20260611000007_phase7_analytics_dashboard.sql
-- No new tables — reads from existing Fases 1–6 tables.
-- Creates: 7 SQL views + 3 RPCs + 2 performance indexes
-- ============================================================

-- ── Performance indexes for analytics hotpaths ───────────────
CREATE INDEX IF NOT EXISTS idx_waai_agent_runs_workspace_status
  ON public.waai_agent_runs (workspace_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_waai_whatsapp_messages_workspace_direction
  ON public.waai_whatsapp_messages (workspace_id, direction, created_at);

-- ── View 1: waai_analytics_workspace_overview ────────────────
-- Counts across all key entities for a workspace.
-- Workspace filter applied at TS layer; view exposes all workspaces.
CREATE OR REPLACE VIEW public.waai_analytics_workspace_overview AS
SELECT
  w.id                                                        AS workspace_id,
  (SELECT COUNT(*) FROM public.waai_conversations c
   WHERE c.workspace_id = w.id)                              AS total_conversations,
  (SELECT COUNT(*) FROM public.waai_conversations c
   WHERE c.workspace_id = w.id AND c.status = 'open')        AS open_conversations,
  (SELECT COUNT(*) FROM public.waai_messages m
   WHERE m.workspace_id = w.id)                              AS total_messages,
  (SELECT COUNT(*) FROM public.waai_leads l
   WHERE l.workspace_id = w.id AND l.status != 'archived')   AS total_leads,
  (SELECT COUNT(*) FROM public.waai_agents a
   WHERE a.workspace_id = w.id AND a.status = 'active')      AS active_agents,
  (SELECT COUNT(*) FROM public.waai_whatsapp_connections wc
   WHERE wc.workspace_id = w.id AND wc.status = 'active')    AS active_whatsapp_connections,
  (SELECT COUNT(*) FROM public.waai_handoffs h
   WHERE h.workspace_id = w.id
     AND h.status IN ('requested', 'active'))                 AS open_handoffs,
  (SELECT COUNT(*) FROM public.waai_workspace_members wm
   WHERE wm.workspace_id = w.id)                             AS member_count
FROM public.waai_workspaces w;

-- ── View 2: waai_analytics_agent_performance ─────────────────
CREATE OR REPLACE VIEW public.waai_analytics_agent_performance AS
SELECT
  a.workspace_id,
  a.id                                                        AS agent_id,
  a.name                                                      AS agent_name,
  a.status                                                    AS agent_status,
  a.primary_language,
  (SELECT COUNT(*) FROM public.waai_conversations c
   WHERE c.agent_id = a.id)                                  AS conversations_count,
  (SELECT COUNT(*) FROM public.waai_messages m
   WHERE m.agent_id = a.id)                                  AS messages_count,
  (SELECT COUNT(*) FROM public.waai_messages m
   WHERE m.agent_id = a.id AND m.role = 'user')              AS user_messages,
  (SELECT COUNT(*) FROM public.waai_messages m
   WHERE m.agent_id = a.id AND m.role = 'assistant')         AS assistant_messages,
  (SELECT COUNT(*) FROM public.waai_leads l
   WHERE l.agent_id = a.id AND l.status != 'archived')       AS leads_count,
  (SELECT COUNT(*) FROM public.waai_handoffs h
   WHERE h.agent_id = a.id)                                  AS handoffs_count,
  (SELECT COUNT(*) FROM public.waai_agent_runs r
   WHERE r.agent_id = a.id)                                  AS total_runs,
  (SELECT COUNT(*) FROM public.waai_agent_runs r
   WHERE r.agent_id = a.id AND r.status = 'error')           AS error_count,
  (SELECT COUNT(*) FROM public.waai_agent_runs r
   WHERE r.agent_id = a.id
     AND (r.metadata->>'rag_used')::boolean = true)          AS rag_runs,
  (SELECT ROUND(AVG(r.latency_ms)) FROM public.waai_agent_runs r
   WHERE r.agent_id = a.id AND r.latency_ms IS NOT NULL)     AS avg_latency_ms
FROM public.waai_agents a;

-- ── View 3: waai_analytics_lead_funnel ───────────────────────
CREATE OR REPLACE VIEW public.waai_analytics_lead_funnel AS
SELECT
  workspace_id,
  COUNT(*) FILTER (WHERE status = 'new')                     AS new_count,
  COUNT(*) FILTER (WHERE status = 'qualified')               AS qualified_count,
  COUNT(*) FILTER (WHERE status = 'contacted')               AS contacted_count,
  COUNT(*) FILTER (WHERE status = 'won')                     AS won_count,
  COUNT(*) FILTER (WHERE status = 'lost')                    AS lost_count,
  COUNT(*) FILTER (WHERE status = 'archived')                AS archived_count,
  COUNT(*) FILTER (WHERE status != 'archived')               AS active_total,
  COUNT(*) FILTER (WHERE priority = 'urgent')                AS urgent_count,
  COUNT(*) FILTER (WHERE priority = 'high')                  AS high_count,
  COUNT(*) FILTER (WHERE priority = 'medium')                AS medium_count,
  COUNT(*) FILTER (WHERE priority = 'low')                   AS low_count,
  COUNT(*) FILTER (WHERE source_channel = 'whatsapp')        AS from_whatsapp,
  COUNT(*) FILTER (WHERE source_channel = 'sandbox')         AS from_sandbox,
  COUNT(*) FILTER (WHERE source_channel = 'manual')          AS from_manual
FROM public.waai_leads
GROUP BY workspace_id;

-- ── View 4: waai_analytics_channel_usage ─────────────────────
CREATE OR REPLACE VIEW public.waai_analytics_channel_usage AS
SELECT
  workspace_id,
  COUNT(*) FILTER (WHERE channel = 'whatsapp')               AS whatsapp_conversations,
  COUNT(*) FILTER (WHERE channel = 'sandbox')                AS sandbox_conversations,
  COUNT(*) FILTER (WHERE channel = 'web')                    AS web_conversations,
  COUNT(*) FILTER (WHERE status = 'open')                    AS open_conversations,
  COUNT(*) FILTER (WHERE status = 'closed')                  AS closed_conversations,
  COUNT(*) FILTER (WHERE status = 'handoff_required')        AS handoff_required_conversations,
  COUNT(*) FILTER (WHERE status = 'archived')                AS archived_conversations
FROM public.waai_conversations
GROUP BY workspace_id;

-- ── View 5: waai_analytics_handoff_metrics ───────────────────
CREATE OR REPLACE VIEW public.waai_analytics_handoff_metrics AS
SELECT
  workspace_id,
  COUNT(*) FILTER (WHERE status IN ('requested','active'))   AS active_count,
  COUNT(*) FILTER (WHERE status = 'resolved')                AS resolved_count,
  COUNT(*) FILTER (WHERE status = 'canceled')                AS canceled_count,
  COUNT(*) FILTER (WHERE trigger_type = 'manual')            AS trigger_manual,
  COUNT(*) FILTER (WHERE trigger_type = 'customer_request')  AS trigger_customer_request,
  COUNT(*) FILTER (WHERE trigger_type = 'low_confidence')    AS trigger_low_confidence,
  COUNT(*) FILTER (WHERE trigger_type = 'angry_customer')    AS trigger_angry_customer,
  COUNT(*) FILTER (WHERE trigger_type = 'urgent_request')    AS trigger_urgent_request,
  COUNT(*) FILTER (WHERE trigger_type = 'sensitive_topic')   AS trigger_sensitive_topic,
  COUNT(*) FILTER (WHERE trigger_type = 'system_rule')       AS trigger_system_rule,
  ROUND(AVG(
    CASE WHEN status = 'resolved' AND resolved_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60
    END
  ))                                                         AS avg_resolution_minutes
FROM public.waai_handoffs
GROUP BY workspace_id;

-- ── View 6: waai_analytics_usage_limits ──────────────────────
CREATE OR REPLACE VIEW public.waai_analytics_usage_limits AS
SELECT
  s.workspace_id,
  p.id                                                        AS plan_id,
  p.name                                                      AS plan_name,
  p.agents_limit,
  p.messages_limit,
  p.documents_limit,
  p.whatsapp_numbers_limit,
  p.human_handoff_enabled,
  COALESCE(uc.messages_sent, 0)                              AS messages_used,
  (SELECT COUNT(*) FROM public.waai_agents a
   WHERE a.workspace_id = s.workspace_id
     AND a.status != 'archived')::int                        AS agents_used,
  (SELECT COUNT(*) FROM public.waai_knowledge_documents kd
   WHERE kd.workspace_id = s.workspace_id
     AND kd.status != 'archived')::int                       AS documents_used,
  (SELECT COUNT(*) FROM public.waai_whatsapp_connections wc
   WHERE wc.workspace_id = s.workspace_id
     AND wc.status = 'active')::int                          AS whatsapp_connections_used,
  (SELECT COUNT(*) FROM public.waai_workspace_members wm
   WHERE wm.workspace_id = s.workspace_id)::int              AS members_count
FROM public.waai_subscriptions s
JOIN public.waai_plans p ON p.id = s.plan_id
LEFT JOIN public.waai_usage_counters uc
  ON uc.workspace_id = s.workspace_id
 AND uc.period_month = TO_CHAR(NOW(), 'YYYY-MM');

-- ── View 7: waai_analytics_error_events ──────────────────────
CREATE OR REPLACE VIEW public.waai_analytics_error_events AS
SELECT
  'claude_error'                       AS alert_type,
  'warning'                            AS severity,
  workspace_id,
  agent_id,
  NULL::uuid                           AS connection_id,
  NULL::uuid                           AS document_id,
  error_message                        AS detail,
  created_at
FROM public.waai_agent_runs
WHERE status = 'error'
UNION ALL
SELECT
  'whatsapp_send_failed'               AS alert_type,
  'critical'                           AS severity,
  workspace_id,
  NULL::uuid                           AS agent_id,
  connection_id,
  NULL::uuid                           AS document_id,
  'delivery_status:failed'             AS detail,
  created_at
FROM public.waai_whatsapp_messages
WHERE delivery_status = 'failed'
UNION ALL
SELECT
  'knowledge_doc_failed'               AS alert_type,
  'warning'                            AS severity,
  workspace_id,
  NULL::uuid                           AS agent_id,
  NULL::uuid                           AS connection_id,
  id                                   AS document_id,
  error_message                        AS detail,
  updated_at                           AS created_at
FROM public.waai_knowledge_documents
WHERE status = 'failed';

-- ── RPC 1: waai_get_workspace_analytics ──────────────────────
CREATE OR REPLACE FUNCTION public.waai_get_workspace_analytics(
  p_workspace_id uuid,
  p_from         timestamptz DEFAULT (now() - interval '30 days'),
  p_to           timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    -- Workspace overview (all-time)
    'total_conversations',
      (SELECT COUNT(*) FROM waai_conversations WHERE workspace_id = p_workspace_id),
    'open_conversations',
      (SELECT COUNT(*) FROM waai_conversations WHERE workspace_id = p_workspace_id AND status = 'open'),
    'total_messages',
      (SELECT COUNT(*) FROM waai_messages WHERE workspace_id = p_workspace_id),
    'total_leads',
      (SELECT COUNT(*) FROM waai_leads WHERE workspace_id = p_workspace_id AND status != 'archived'),
    'active_agents',
      (SELECT COUNT(*) FROM waai_agents WHERE workspace_id = p_workspace_id AND status = 'active'),
    'active_whatsapp_connections',
      (SELECT COUNT(*) FROM waai_whatsapp_connections WHERE workspace_id = p_workspace_id AND status = 'active'),
    'open_handoffs',
      (SELECT COUNT(*) FROM waai_handoffs WHERE workspace_id = p_workspace_id AND status IN ('requested','active')),
    -- Period-scoped metrics
    'conversations_in_period',
      (SELECT COUNT(*) FROM waai_conversations
       WHERE workspace_id = p_workspace_id AND created_at >= p_from AND created_at <= p_to),
    'messages_in_period',
      (SELECT COUNT(*) FROM waai_messages
       WHERE workspace_id = p_workspace_id AND created_at >= p_from AND created_at <= p_to),
    'user_messages_in_period',
      (SELECT COUNT(*) FROM waai_messages
       WHERE workspace_id = p_workspace_id AND role = 'user' AND created_at >= p_from AND created_at <= p_to),
    'assistant_messages_in_period',
      (SELECT COUNT(*) FROM waai_messages
       WHERE workspace_id = p_workspace_id AND role = 'assistant' AND created_at >= p_from AND created_at <= p_to),
    'leads_in_period',
      (SELECT COUNT(*) FROM waai_leads
       WHERE workspace_id = p_workspace_id AND created_at >= p_from AND created_at <= p_to),
    'handoffs_in_period',
      (SELECT COUNT(*) FROM waai_handoffs
       WHERE workspace_id = p_workspace_id AND created_at >= p_from AND created_at <= p_to),
    -- Conversations by channel
    'conversations_by_channel', (
      SELECT jsonb_object_agg(channel, cnt) FROM (
        SELECT channel, COUNT(*) AS cnt
        FROM waai_conversations
        WHERE workspace_id = p_workspace_id AND created_at >= p_from AND created_at <= p_to
        GROUP BY channel
      ) t
    ),
    -- Conversations by status
    'conversations_by_status', (
      SELECT jsonb_object_agg(status, cnt) FROM (
        SELECT status, COUNT(*) AS cnt
        FROM waai_conversations
        WHERE workspace_id = p_workspace_id
        GROUP BY status
      ) t
    ),
    -- AI runs metrics
    'total_runs',
      (SELECT COUNT(*) FROM waai_agent_runs
       WHERE workspace_id = p_workspace_id AND created_at >= p_from AND created_at <= p_to),
    'success_runs',
      (SELECT COUNT(*) FROM waai_agent_runs
       WHERE workspace_id = p_workspace_id AND status = 'success' AND created_at >= p_from AND created_at <= p_to),
    'error_runs',
      (SELECT COUNT(*) FROM waai_agent_runs
       WHERE workspace_id = p_workspace_id AND status = 'error' AND created_at >= p_from AND created_at <= p_to),
    'total_tokens',
      (SELECT COALESCE(SUM(total_tokens), 0) FROM waai_agent_runs
       WHERE workspace_id = p_workspace_id AND created_at >= p_from AND created_at <= p_to),
    'total_input_tokens',
      (SELECT COALESCE(SUM(input_tokens), 0) FROM waai_agent_runs
       WHERE workspace_id = p_workspace_id AND created_at >= p_from AND created_at <= p_to),
    'total_output_tokens',
      (SELECT COALESCE(SUM(output_tokens), 0) FROM waai_agent_runs
       WHERE workspace_id = p_workspace_id AND created_at >= p_from AND created_at <= p_to),
    'estimated_cost_cents',
      (SELECT COALESCE(SUM(estimated_cost_cents), 0) FROM waai_agent_runs
       WHERE workspace_id = p_workspace_id AND created_at >= p_from AND created_at <= p_to),
    'avg_latency_ms',
      (SELECT ROUND(AVG(latency_ms)) FROM waai_agent_runs
       WHERE workspace_id = p_workspace_id AND latency_ms IS NOT NULL AND created_at >= p_from AND created_at <= p_to),
    -- RAG
    'rag_runs',
      (SELECT COUNT(*) FROM waai_agent_runs
       WHERE workspace_id = p_workspace_id AND (metadata->>'rag_used')::boolean = true AND created_at >= p_from AND created_at <= p_to),
    'docs_ready',
      (SELECT COUNT(*) FROM waai_knowledge_documents WHERE workspace_id = p_workspace_id AND status = 'ready'),
    'docs_processing',
      (SELECT COUNT(*) FROM waai_knowledge_documents WHERE workspace_id = p_workspace_id AND status = 'processing'),
    'docs_failed',
      (SELECT COUNT(*) FROM waai_knowledge_documents WHERE workspace_id = p_workspace_id AND status = 'failed'),
    -- WhatsApp
    'wa_inbound',
      (SELECT COUNT(*) FROM waai_whatsapp_messages
       WHERE workspace_id = p_workspace_id AND direction = 'inbound' AND created_at >= p_from AND created_at <= p_to),
    'wa_outbound',
      (SELECT COUNT(*) FROM waai_whatsapp_messages
       WHERE workspace_id = p_workspace_id AND direction = 'outbound' AND created_at >= p_from AND created_at <= p_to),
    'wa_failed',
      (SELECT COUNT(*) FROM waai_whatsapp_messages
       WHERE workspace_id = p_workspace_id AND delivery_status = 'failed' AND created_at >= p_from AND created_at <= p_to)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- ── RPC 2: waai_get_agent_performance ────────────────────────
CREATE OR REPLACE FUNCTION public.waai_get_agent_performance(
  p_workspace_id uuid,
  p_from         timestamptz DEFAULT (now() - interval '30 days'),
  p_to           timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT
      a.id                                                    AS agent_id,
      a.name                                                  AS agent_name,
      a.status                                                AS agent_status,
      a.primary_language,
      (SELECT COUNT(*) FROM waai_conversations c
       WHERE c.agent_id = a.id
         AND c.created_at >= p_from AND c.created_at <= p_to)  AS conversations_count,
      (SELECT COUNT(*) FROM waai_messages m
       WHERE m.agent_id = a.id
         AND m.created_at >= p_from AND m.created_at <= p_to)  AS messages_count,
      (SELECT COUNT(*) FROM waai_leads l
       WHERE l.agent_id = a.id
         AND l.created_at >= p_from AND l.created_at <= p_to)  AS leads_count,
      (SELECT COUNT(*) FROM waai_handoffs h
       WHERE h.agent_id = a.id
         AND h.created_at >= p_from AND h.created_at <= p_to)  AS handoffs_count,
      (SELECT COUNT(*) FROM waai_agent_runs r
       WHERE r.agent_id = a.id
         AND r.created_at >= p_from AND r.created_at <= p_to)  AS total_runs,
      (SELECT COUNT(*) FROM waai_agent_runs r
       WHERE r.agent_id = a.id AND r.status = 'error'
         AND r.created_at >= p_from AND r.created_at <= p_to)  AS error_count,
      (SELECT COUNT(*) FROM waai_agent_runs r
       WHERE r.agent_id = a.id
         AND (r.metadata->>'rag_used')::boolean = true
         AND r.created_at >= p_from AND r.created_at <= p_to)  AS rag_runs,
      (SELECT ROUND(AVG(r.latency_ms))
       FROM waai_agent_runs r
       WHERE r.agent_id = a.id AND r.latency_ms IS NOT NULL
         AND r.created_at >= p_from AND r.created_at <= p_to)  AS avg_latency_ms
    FROM waai_agents a
    WHERE a.workspace_id = p_workspace_id
    ORDER BY conversations_count DESC
  ) t;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ── RPC 3: waai_get_operational_alerts ───────────────────────
CREATE OR REPLACE FUNCTION public.waai_get_operational_alerts(
  p_workspace_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_alerts jsonb := '[]'::jsonb;
  v_messages_used int;
  v_messages_limit int;
  v_pct numeric;
BEGIN
  -- Active handoffs
  SELECT v_alerts || (
    SELECT jsonb_agg(jsonb_build_object(
      'type',        'active_handoff',
      'severity',    'warning',
      'title',       'Handoff activo',
      'description', 'Una conversación requiere atención humana',
      'entity_type', 'handoff',
      'entity_id',   h.id,
      'conversation_id', h.conversation_id,
      'created_at',  h.created_at
    ))
    FROM waai_handoffs h
    WHERE h.workspace_id = p_workspace_id
      AND h.status IN ('requested', 'active')
  ) INTO v_alerts;

  -- Failed WhatsApp sends (last 24h)
  SELECT v_alerts || (
    SELECT jsonb_agg(jsonb_build_object(
      'type',        'whatsapp_send_failed',
      'severity',    'critical',
      'title',       'Envío WhatsApp fallido',
      'description', 'Un mensaje de WhatsApp no pudo enviarse',
      'entity_type', 'whatsapp_message',
      'entity_id',   wm.id,
      'created_at',  wm.created_at
    ))
    FROM waai_whatsapp_messages wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.delivery_status = 'failed'
      AND wm.created_at > now() - interval '24 hours'
    LIMIT 10
  ) INTO v_alerts;

  -- Claude errors (last 24h)
  SELECT v_alerts || (
    SELECT jsonb_agg(jsonb_build_object(
      'type',        'claude_error',
      'severity',    'warning',
      'title',       'Error en Claude',
      'description', COALESCE(ar.error_message, 'Runtime error'),
      'entity_type', 'agent_run',
      'entity_id',   ar.id,
      'created_at',  ar.created_at
    ))
    FROM waai_agent_runs ar
    WHERE ar.workspace_id = p_workspace_id
      AND ar.status = 'error'
      AND ar.created_at > now() - interval '24 hours'
    LIMIT 5
  ) INTO v_alerts;

  -- Failed knowledge docs
  SELECT v_alerts || (
    SELECT jsonb_agg(jsonb_build_object(
      'type',        'knowledge_doc_failed',
      'severity',    'warning',
      'title',       'Documento fallido',
      'description', COALESCE(kd.title, 'Documento sin título'),
      'entity_type', 'knowledge_document',
      'entity_id',   kd.id,
      'created_at',  kd.updated_at
    ))
    FROM waai_knowledge_documents kd
    WHERE kd.workspace_id = p_workspace_id
      AND kd.status = 'failed'
    LIMIT 5
  ) INTO v_alerts;

  -- WhatsApp connections failed/suspended
  SELECT v_alerts || (
    SELECT jsonb_agg(jsonb_build_object(
      'type',        'whatsapp_connection_failed',
      'severity',    'critical',
      'title',       'Conexión WhatsApp inactiva',
      'description', COALESCE(wc.display_name, wc.phone_number, 'Conexión'),
      'entity_type', 'whatsapp_connection',
      'entity_id',   wc.id,
      'created_at',  wc.updated_at
    ))
    FROM waai_whatsapp_connections wc
    WHERE wc.workspace_id = p_workspace_id
      AND wc.status IN ('failed', 'suspended')
    LIMIT 5
  ) INTO v_alerts;

  -- Plan usage warning (messages)
  SELECT
    COALESCE(uc.messages_sent, 0),
    p.messages_limit
  INTO v_messages_used, v_messages_limit
  FROM waai_subscriptions s
  JOIN waai_plans p ON p.id = s.plan_id
  LEFT JOIN waai_usage_counters uc
    ON uc.workspace_id = s.workspace_id
   AND uc.period_month = TO_CHAR(NOW(), 'YYYY-MM')
  WHERE s.workspace_id = p_workspace_id;

  IF v_messages_limit > 0 THEN
    v_pct := (v_messages_used::numeric / v_messages_limit) * 100;
    IF v_pct >= 95 THEN
      v_alerts := v_alerts || jsonb_build_array(jsonb_build_object(
        'type',        'plan_usage_critical',
        'severity',    'critical',
        'title',       'Uso del plan crítico',
        'description', format('Mensajes: %s%% del límite mensual usado', ROUND(v_pct)),
        'entity_type', 'plan_usage',
        'entity_id',   NULL,
        'created_at',  now()
      ));
    ELSIF v_pct >= 80 THEN
      v_alerts := v_alerts || jsonb_build_array(jsonb_build_object(
        'type',        'plan_usage_warning',
        'severity',    'warning',
        'title',       'Uso del plan elevado',
        'description', format('Mensajes: %s%% del límite mensual usado', ROUND(v_pct)),
        'entity_type', 'plan_usage',
        'entity_id',   NULL,
        'created_at',  now()
      ));
    END IF;
  END IF;

  RETURN COALESCE(v_alerts, '[]'::jsonb);
END;
$$;

-- ── Grants: allow authenticated users to call RPCs ────────────
GRANT EXECUTE ON FUNCTION public.waai_get_workspace_analytics(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.waai_get_agent_performance(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.waai_get_operational_alerts(uuid) TO authenticated;
