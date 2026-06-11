-- ============================================================
-- FASE 8 — Production Hardening & Billing Readiness
-- All objects use waai_ prefix. Schema: public only.
-- ============================================================

-- ── 1. waai_system_health_events ─────────────────────────────
CREATE TABLE IF NOT EXISTS waai_system_health_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  severity      text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  event_type    text NOT NULL,
  source        text NOT NULL,
  entity_type   text,
  entity_id     uuid,
  message       text NOT NULL,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE waai_system_health_events ENABLE ROW LEVEL SECURITY;

-- Workspace members can read events for their workspace
CREATE POLICY "waai_system_health_events_select"
  ON waai_system_health_events FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM waai_workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'agent_manager')
    )
  );

-- Service role inserts only (SECURITY DEFINER RPCs bypass RLS, direct inserts require service role)
CREATE POLICY "waai_system_health_events_insert_service"
  ON waai_system_health_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Allow resolving events (owner/admin)
CREATE POLICY "waai_system_health_events_update"
  ON waai_system_health_events FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM waai_workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ── 2. waai_billing_events ───────────────────────────────────
CREATE TABLE IF NOT EXISTS waai_billing_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  subscription_id   uuid REFERENCES public.waai_subscriptions(id) ON DELETE SET NULL,
  event_type        text NOT NULL,
  provider          text,                   -- 'stripe' | 'manual' | 'system'
  provider_event_id text,                   -- Stripe event ID for idempotency
  amount_cents      integer,
  currency          text DEFAULT 'CHF',
  status            text NOT NULL DEFAULT 'received'
                      CHECK (status IN ('received', 'processed', 'failed', 'ignored')),
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE waai_billing_events ENABLE ROW LEVEL SECURITY;

-- Only owner/admin can read billing events
CREATE POLICY "waai_billing_events_select"
  ON waai_billing_events FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM waai_workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Service role inserts only
CREATE POLICY "waai_billing_events_insert_service"
  ON waai_billing_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Idempotency: unique per provider+event_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_waai_billing_events_provider_event_id
  ON waai_billing_events (provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

-- ── 3. waai_ai_cost_snapshots ────────────────────────────────
CREATE TABLE IF NOT EXISTS waai_ai_cost_snapshots (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  period_start          date NOT NULL,
  period_end            date NOT NULL,
  provider              text,
  model                 text,
  total_runs            integer DEFAULT 0,
  total_input_tokens    integer DEFAULT 0,
  total_output_tokens   integer DEFAULT 0,
  estimated_cost_cents  integer DEFAULT 0,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE waai_ai_cost_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_ai_cost_snapshots_select"
  ON waai_ai_cost_snapshots FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM waai_workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "waai_ai_cost_snapshots_insert_service"
  ON waai_ai_cost_snapshots FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── 4. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_waai_system_health_events_workspace_created
  ON waai_system_health_events (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_waai_billing_events_workspace_created
  ON waai_billing_events (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_waai_ai_cost_snapshots_workspace_period
  ON waai_ai_cost_snapshots (workspace_id, period_start, period_end);

-- ── 5. waai_increment_usage_counter (atomic upsert) ──────────
-- Atomically increments a single counter in waai_usage_counters.
CREATE OR REPLACE FUNCTION waai_increment_usage_counter(
  p_workspace_id uuid,
  p_period_month text,
  p_field        text
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_field NOT IN ('messages_sent', 'documents_uploaded', 'agents_created') THEN
    RAISE EXCEPTION 'invalid counter field: %', p_field;
  END IF;

  INSERT INTO waai_usage_counters (workspace_id, period_month, messages_sent, documents_uploaded, agents_created)
  VALUES (
    p_workspace_id,
    p_period_month,
    CASE WHEN p_field = 'messages_sent'     THEN 1 ELSE 0 END,
    CASE WHEN p_field = 'documents_uploaded' THEN 1 ELSE 0 END,
    CASE WHEN p_field = 'agents_created'    THEN 1 ELSE 0 END
  )
  ON CONFLICT (workspace_id, period_month) DO UPDATE SET
    messages_sent      = waai_usage_counters.messages_sent
                         + CASE WHEN p_field = 'messages_sent'     THEN 1 ELSE 0 END,
    documents_uploaded = waai_usage_counters.documents_uploaded
                         + CASE WHEN p_field = 'documents_uploaded' THEN 1 ELSE 0 END,
    agents_created     = waai_usage_counters.agents_created
                         + CASE WHEN p_field = 'agents_created'    THEN 1 ELSE 0 END,
    updated_at         = now();
END;
$$;

GRANT EXECUTE ON FUNCTION waai_increment_usage_counter(uuid, text, text) TO authenticated;

-- ── 6. waai_get_production_health ────────────────────────────
CREATE OR REPLACE FUNCTION waai_get_production_health(
  p_workspace_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_agent_count integer;
  v_conversation_count integer;
  v_open_handoffs integer;
  v_failed_docs integer;
  v_failed_wa integer;
  v_billing_ok boolean;
BEGIN
  -- Verify workspace access
  IF NOT EXISTS (
    SELECT 1 FROM waai_workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT COUNT(*) INTO v_agent_count
  FROM waai_agents
  WHERE workspace_id = p_workspace_id AND status IN ('active', 'paused');

  SELECT COUNT(*) INTO v_conversation_count
  FROM waai_conversations
  WHERE workspace_id = p_workspace_id AND status = 'open';

  SELECT COUNT(*) INTO v_open_handoffs
  FROM waai_handoffs h
  JOIN waai_conversations c ON c.id = h.conversation_id
  WHERE c.workspace_id = p_workspace_id AND h.status IN ('requested', 'active');

  SELECT COUNT(*) INTO v_failed_docs
  FROM waai_knowledge_documents
  WHERE workspace_id = p_workspace_id AND status = 'failed';

  SELECT COUNT(*) INTO v_failed_wa
  FROM waai_whatsapp_connections
  WHERE workspace_id = p_workspace_id AND status IN ('failed', 'error');

  SELECT EXISTS (
    SELECT 1 FROM waai_subscriptions WHERE workspace_id = p_workspace_id
  ) INTO v_billing_ok;

  v_result := jsonb_build_object(
    'workspace_id',       p_workspace_id,
    'agents_active',      v_agent_count,
    'conversations_open', v_conversation_count,
    'handoffs_open',      v_open_handoffs,
    'docs_failed',        v_failed_docs,
    'wa_connections_failed', v_failed_wa,
    'subscription_ok',    v_billing_ok,
    'checked_at',         now()
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION waai_get_production_health(uuid) TO authenticated;

-- ── 7. waai_get_billing_readiness_snapshot ───────────────────
CREATE OR REPLACE FUNCTION waai_get_billing_readiness_snapshot(
  p_workspace_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_sub    record;
  v_plan   record;
  v_usage  record;
  v_period text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM waai_workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  v_period := to_char(now(), 'YYYY-MM');

  SELECT s.*, p.name AS plan_name, p.agents_limit, p.messages_limit,
         p.documents_limit, p.whatsapp_numbers_limit, p.human_handoff_enabled
  INTO v_sub
  FROM waai_subscriptions s
  JOIN waai_plans p ON p.id = s.plan_id
  WHERE s.workspace_id = p_workspace_id;

  SELECT * INTO v_usage
  FROM waai_usage_counters
  WHERE workspace_id = p_workspace_id AND period_month = v_period;

  v_result := jsonb_build_object(
    'workspace_id',          p_workspace_id,
    'plan_id',               COALESCE(v_sub.plan_id, 'free'),
    'plan_name',             COALESCE(v_sub.plan_name, 'free'),
    'messages_limit',        COALESCE(v_sub.messages_limit, 0),
    'messages_used',         COALESCE(v_usage.messages_sent, 0),
    'documents_limit',       COALESCE(v_sub.documents_limit, 0),
    'documents_used',        COALESCE(v_usage.documents_uploaded, 0),
    'agents_limit',          COALESCE(v_sub.agents_limit, 0),
    'agents_used',           COALESCE(v_usage.agents_created, 0),
    'whatsapp_limit',        COALESCE(v_sub.whatsapp_numbers_limit, 0),
    'human_handoff_enabled', COALESCE(v_sub.human_handoff_enabled, false),
    'period_month',          v_period,
    'stripe_configured',     v_sub.stripe_subscription_id IS NOT NULL,
    'checked_at',            now()
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION waai_get_billing_readiness_snapshot(uuid) TO authenticated;

-- ── 8. waai_get_ai_cost_snapshot ─────────────────────────────
CREATE OR REPLACE FUNCTION waai_get_ai_cost_snapshot(
  p_workspace_id uuid,
  p_from         date,
  p_to           date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM waai_workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT jsonb_build_object(
    'workspace_id',          p_workspace_id,
    'period_from',           p_from,
    'period_to',             p_to,
    'total_runs',            COUNT(*),
    'success_runs',          COUNT(*) FILTER (WHERE status = 'success'),
    'error_runs',            COUNT(*) FILTER (WHERE status = 'error'),
    'total_input_tokens',    COALESCE(SUM(input_tokens), 0),
    'total_output_tokens',   COALESCE(SUM(output_tokens), 0),
    'total_tokens',          COALESCE(SUM(total_tokens), 0),
    'estimated_cost_cents',  COALESCE(SUM(estimated_cost_cents), 0),
    'avg_latency_ms',        ROUND(AVG(latency_ms)),
    'by_model',              (
      SELECT jsonb_agg(jsonb_build_object(
        'model', model,
        'runs', model_runs,
        'input_tokens', model_input,
        'output_tokens', model_output,
        'cost_cents', model_cost
      ))
      FROM (
        SELECT
          model,
          COUNT(*)             AS model_runs,
          SUM(input_tokens)    AS model_input,
          SUM(output_tokens)   AS model_output,
          SUM(estimated_cost_cents) AS model_cost
        FROM waai_agent_runs
        WHERE workspace_id = p_workspace_id
          AND created_at >= p_from::timestamptz
          AND created_at < (p_to + 1)::timestamptz
        GROUP BY model
      ) m
    ),
    'checked_at', now()
  )
  INTO v_result
  FROM waai_agent_runs
  WHERE workspace_id = p_workspace_id
    AND created_at >= p_from::timestamptz
    AND created_at < (p_to + 1)::timestamptz;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION waai_get_ai_cost_snapshot(uuid, date, date) TO authenticated;

-- ── 9. waai_log_system_health_event ──────────────────────────
CREATE OR REPLACE FUNCTION waai_log_system_health_event(
  p_workspace_id uuid,
  p_severity     text,
  p_event_type   text,
  p_source       text,
  p_message      text,
  p_entity_type  text  DEFAULT NULL,
  p_entity_id    uuid  DEFAULT NULL,
  p_metadata     jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO waai_system_health_events
    (workspace_id, severity, event_type, source, message, entity_type, entity_id, metadata)
  VALUES
    (p_workspace_id, p_severity, p_event_type, p_source, p_message, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION waai_log_system_health_event(uuid, text, text, text, text, text, uuid, jsonb) TO authenticated;

-- ── 10. waai_log_billing_event ───────────────────────────────
CREATE OR REPLACE FUNCTION waai_log_billing_event(
  p_workspace_id      uuid,
  p_subscription_id   uuid,
  p_event_type        text,
  p_provider          text     DEFAULT NULL,
  p_provider_event_id text     DEFAULT NULL,
  p_amount_cents      integer  DEFAULT NULL,
  p_currency          text     DEFAULT 'CHF',
  p_status            text     DEFAULT 'received',
  p_metadata          jsonb    DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Idempotency check
  IF p_provider_event_id IS NOT NULL THEN
    SELECT id INTO v_id
    FROM waai_billing_events
    WHERE provider = p_provider AND provider_event_id = p_provider_event_id;

    IF FOUND THEN
      UPDATE waai_billing_events SET status = 'ignored' WHERE id = v_id;
      RETURN v_id;
    END IF;
  END IF;

  INSERT INTO waai_billing_events
    (workspace_id, subscription_id, event_type, provider, provider_event_id,
     amount_cents, currency, status, metadata)
  VALUES
    (p_workspace_id, p_subscription_id, p_event_type, p_provider, p_provider_event_id,
     p_amount_cents, p_currency, p_status, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION waai_log_billing_event(uuid, uuid, text, text, text, integer, text, text, jsonb) TO authenticated;
