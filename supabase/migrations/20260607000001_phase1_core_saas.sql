-- =============================================================
-- WAAI SaaS — Fase 1: Core SaaS Multi-tenant
-- Schema: public | Prefix: waai_
-- Created: 2026-06-07
-- ADR: docs/adr/ADR-0002-supabase-public-schema-and-waai-prefix.md
-- =============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE waai_workspace_role AS ENUM (
  'owner',
  'admin',
  'agent_manager',
  'human_agent',
  'viewer'
);

-- ============================================================
-- TABLE: waai_profiles
-- One row per auth.users user. Created via trigger on signup.
-- ============================================================
CREATE TABLE public.waai_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  avatar_url  text,
  email       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waai_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_profiles_select_own"
  ON public.waai_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "waai_profiles_update_own"
  ON public.waai_profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- TABLE: waai_workspaces
-- Tenant root. One workspace per business.
-- ============================================================
CREATE TABLE public.waai_workspaces (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  business_type text,
  country       text NOT NULL DEFAULT 'ES',
  timezone      text NOT NULL DEFAULT 'Europe/Madrid',
  status        text NOT NULL DEFAULT 'trial'
                CHECK (status IN ('active', 'paused', 'trial', 'cancelled')),
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waai_workspaces ENABLE ROW LEVEL SECURITY;

-- Helper: is caller a member of this workspace?
CREATE OR REPLACE FUNCTION waai_is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.waai_workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  );
$$;

-- Helper: get caller's role in a workspace
CREATE OR REPLACE FUNCTION waai_get_workspace_role(p_workspace_id uuid)
RETURNS waai_workspace_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.waai_workspace_members
  WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
  LIMIT 1;
$$;

-- Helper: is caller owner or admin?
CREATE OR REPLACE FUNCTION waai_is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.waai_workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

CREATE POLICY "waai_workspaces_select_member"
  ON public.waai_workspaces FOR SELECT
  USING (waai_is_workspace_member(id));

CREATE POLICY "waai_workspaces_insert_authenticated"
  ON public.waai_workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "waai_workspaces_update_admin"
  ON public.waai_workspaces FOR UPDATE
  USING (waai_is_workspace_admin(id));

CREATE POLICY "waai_workspaces_delete_owner"
  ON public.waai_workspaces FOR DELETE
  USING (
    waai_get_workspace_role(id) = 'owner'
  );

-- ============================================================
-- TABLE: waai_workspace_members
-- User <-> workspace membership and role assignment
-- ============================================================
CREATE TABLE public.waai_workspace_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          waai_workspace_role NOT NULL DEFAULT 'viewer',
  invited_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

ALTER TABLE public.waai_workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_workspace_members_select_member"
  ON public.waai_workspace_members FOR SELECT
  USING (waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_workspace_members_insert_admin"
  ON public.waai_workspace_members FOR INSERT
  WITH CHECK (
    waai_is_workspace_admin(workspace_id)
    OR (
      -- allow self-insert during workspace creation (user inserts themselves as owner)
      user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "waai_workspace_members_update_admin"
  ON public.waai_workspace_members FOR UPDATE
  USING (waai_is_workspace_admin(workspace_id));

CREATE POLICY "waai_workspace_members_delete_admin"
  ON public.waai_workspace_members FOR DELETE
  USING (waai_is_workspace_admin(workspace_id));

-- ============================================================
-- TABLE: waai_plans
-- Static plan definitions. Seeded below. Read-only for users.
-- ============================================================
CREATE TABLE public.waai_plans (
  id                        text PRIMARY KEY,
  name                      text NOT NULL,
  agents_limit              int  NOT NULL DEFAULT 1,
  messages_limit            int  NOT NULL DEFAULT 100,   -- -1 = unlimited
  documents_limit           int  NOT NULL DEFAULT 3,     -- -1 = unlimited
  whatsapp_numbers_limit    int  NOT NULL DEFAULT 0,     -- -1 = unlimited
  human_handoff_enabled     bool NOT NULL DEFAULT false,
  monthly_price_usd         numeric(10,2) NOT NULL DEFAULT 0.00,
  sort_order                int  NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waai_plans ENABLE ROW LEVEL SECURITY;

-- Plans are public read-only
CREATE POLICY "waai_plans_select_all"
  ON public.waai_plans FOR SELECT
  USING (true);

-- Only service role can modify plans
CREATE POLICY "waai_plans_insert_service"
  ON public.waai_plans FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "waai_plans_update_service"
  ON public.waai_plans FOR UPDATE
  USING (auth.role() = 'service_role');

-- ============================================================
-- SEED: waai_plans
-- ============================================================
INSERT INTO public.waai_plans
  (id, name, agents_limit, messages_limit, documents_limit, whatsapp_numbers_limit, human_handoff_enabled, monthly_price_usd, sort_order)
VALUES
  ('free',       'Free',       1,   100,    3,   0,  false,   0.00, 0),
  ('starter',    'Starter',    1,  1000,   10,   1,  false,  29.00, 1),
  ('pro',        'Pro',        3, 10000,   50,   3,  true,   79.00, 2),
  ('agency',     'Agency',    20, 100000, 500,  20,  true,  199.00, 3),
  ('enterprise', 'Enterprise', -1,    -1,  -1,  -1,  true,    0.00, 4);

-- ============================================================
-- TABLE: waai_subscriptions
-- One per workspace. Tracks current plan and Stripe info.
-- ============================================================
CREATE TABLE public.waai_subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            uuid UNIQUE NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  plan_id                 text NOT NULL REFERENCES public.waai_plans(id) DEFAULT 'free',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  current_period_end      timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waai_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_subscriptions_select_member"
  ON public.waai_subscriptions FOR SELECT
  USING (waai_is_workspace_member(workspace_id));

-- Only service role or owner/admin can insert/update subscriptions
CREATE POLICY "waai_subscriptions_insert_service"
  ON public.waai_subscriptions FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR waai_is_workspace_admin(workspace_id)
  );

CREATE POLICY "waai_subscriptions_update_service"
  ON public.waai_subscriptions FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR waai_is_workspace_admin(workspace_id)
  );

-- ============================================================
-- TABLE: waai_usage_events
-- Raw event log for billing/analytics. Append-only.
-- ============================================================
CREATE TABLE public.waai_usage_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  event_type    text NOT NULL, -- 'message_sent', 'document_uploaded', 'agent_created'
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX waai_usage_events_workspace_idx ON public.waai_usage_events (workspace_id, created_at DESC);

CREATE POLICY "waai_usage_events_select_admin"
  ON public.waai_usage_events FOR SELECT
  USING (waai_is_workspace_admin(workspace_id));

CREATE POLICY "waai_usage_events_insert_service"
  ON public.waai_usage_events FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR waai_is_workspace_member(workspace_id)
  );

-- ============================================================
-- TABLE: waai_usage_counters
-- Monthly aggregated counters per workspace.
-- ============================================================
CREATE TABLE public.waai_usage_counters (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  period_month        text NOT NULL,  -- 'YYYY-MM' e.g. '2026-06'
  messages_sent       int  NOT NULL DEFAULT 0,
  documents_uploaded  int  NOT NULL DEFAULT 0,
  agents_created      int  NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, period_month)
);

ALTER TABLE public.waai_usage_counters ENABLE ROW LEVEL SECURITY;

CREATE INDEX waai_usage_counters_workspace_idx ON public.waai_usage_counters (workspace_id, period_month);

CREATE POLICY "waai_usage_counters_select_admin"
  ON public.waai_usage_counters FOR SELECT
  USING (waai_is_workspace_admin(workspace_id));

CREATE POLICY "waai_usage_counters_upsert_service"
  ON public.waai_usage_counters FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "waai_usage_counters_update_service"
  ON public.waai_usage_counters FOR UPDATE
  USING (auth.role() = 'service_role');

-- RPC: increment message counter atomically
CREATE OR REPLACE FUNCTION waai_increment_message_counter(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text := to_char(now(), 'YYYY-MM');
BEGIN
  INSERT INTO public.waai_usage_counters (workspace_id, period_month, messages_sent)
  VALUES (p_workspace_id, v_period, 1)
  ON CONFLICT (workspace_id, period_month)
  DO UPDATE SET
    messages_sent = waai_usage_counters.messages_sent + 1,
    updated_at    = now();
END;
$$;

-- RPC: check if workspace is within plan limits for messages
CREATE OR REPLACE FUNCTION waai_check_message_limit(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period        text := to_char(now(), 'YYYY-MM');
  v_used          int  := 0;
  v_limit         int;
BEGIN
  SELECT COALESCE(uc.messages_sent, 0)
  INTO v_used
  FROM public.waai_usage_counters uc
  WHERE uc.workspace_id = p_workspace_id
    AND uc.period_month = v_period;

  SELECT p.messages_limit
  INTO v_limit
  FROM public.waai_subscriptions s
  JOIN public.waai_plans p ON p.id = s.plan_id
  WHERE s.workspace_id = p_workspace_id;

  -- -1 = unlimited
  RETURN v_limit = -1 OR v_used < v_limit;
END;
$$;

-- ============================================================
-- TABLE: waai_audit_logs
-- Immutable event log for critical actions. Insert-only.
-- ============================================================
CREATE TABLE public.waai_audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid REFERENCES public.waai_workspaces(id),
  actor_user_id   uuid REFERENCES auth.users(id),
  event_type      text NOT NULL,
  entity_type     text,
  entity_id       uuid,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waai_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX waai_audit_logs_workspace_idx ON public.waai_audit_logs (workspace_id, created_at DESC);

CREATE POLICY "waai_audit_logs_select_admin"
  ON public.waai_audit_logs FOR SELECT
  USING (
    workspace_id IS NULL
    OR waai_is_workspace_admin(workspace_id)
  );

CREATE POLICY "waai_audit_logs_insert_authenticated"
  ON public.waai_audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- Audit logs are immutable — no UPDATE or DELETE policies

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION waai_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER waai_profiles_set_updated_at
  BEFORE UPDATE ON public.waai_profiles
  FOR EACH ROW EXECUTE FUNCTION waai_set_updated_at();

CREATE TRIGGER waai_workspaces_set_updated_at
  BEFORE UPDATE ON public.waai_workspaces
  FOR EACH ROW EXECUTE FUNCTION waai_set_updated_at();

CREATE TRIGGER waai_subscriptions_set_updated_at
  BEFORE UPDATE ON public.waai_subscriptions
  FOR EACH ROW EXECUTE FUNCTION waai_set_updated_at();

CREATE TRIGGER waai_usage_counters_set_updated_at
  BEFORE UPDATE ON public.waai_usage_counters
  FOR EACH ROW EXECUTE FUNCTION waai_set_updated_at();

-- Trigger: auto-create waai_profiles on auth.users insert
CREATE OR REPLACE FUNCTION waai_on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.waai_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER waai_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION waai_on_auth_user_created();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX waai_workspace_members_user_idx ON public.waai_workspace_members (user_id);
CREATE INDEX waai_workspace_members_workspace_idx ON public.waai_workspace_members (workspace_id);
CREATE INDEX waai_workspaces_slug_idx ON public.waai_workspaces (slug);
CREATE INDEX waai_workspaces_created_by_idx ON public.waai_workspaces (created_by);
CREATE INDEX waai_subscriptions_workspace_idx ON public.waai_subscriptions (workspace_id);
