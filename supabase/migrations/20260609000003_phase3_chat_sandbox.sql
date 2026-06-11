-- ============================================================
-- Fase 3: Chat Sandbox
-- Migration: 20260609000003_phase3_chat_sandbox.sql
-- Tables: waai_conversations, waai_messages, waai_agent_runs,
--         waai_sandbox_sessions
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. waai_conversations
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.waai_conversations (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id              uuid        NOT NULL REFERENCES public.waai_workspaces(id)  ON DELETE CASCADE,
  agent_id                  uuid        NOT NULL REFERENCES public.waai_agents(id)      ON DELETE CASCADE,
  channel                   text        NOT NULL DEFAULT 'sandbox',
  external_conversation_id  text,
  status                    text        NOT NULL DEFAULT 'open',
  title                     text,
  last_message_at           timestamptz,
  created_by                uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT waai_conversations_status_check
    CHECK (status IN ('open', 'closed', 'handoff_required', 'archived')),
  CONSTRAINT waai_conversations_channel_check
    CHECK (channel IN ('sandbox', 'whatsapp', 'web'))
);

CREATE TRIGGER set_waai_conversations_updated_at
  BEFORE UPDATE ON public.waai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.waai_set_updated_at();

CREATE INDEX idx_waai_conversations_workspace_id ON public.waai_conversations(workspace_id);
CREATE INDEX idx_waai_conversations_agent_id     ON public.waai_conversations(agent_id);
CREATE INDEX idx_waai_conversations_status       ON public.waai_conversations(status);

-- ────────────────────────────────────────────────────────────
-- 2. waai_messages
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.waai_messages (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id      uuid        NOT NULL REFERENCES public.waai_conversations(id) ON DELETE CASCADE,
  workspace_id         uuid        NOT NULL REFERENCES public.waai_workspaces(id)    ON DELETE CASCADE,
  agent_id             uuid        REFERENCES public.waai_agents(id)                 ON DELETE CASCADE,
  role                 text        NOT NULL,
  content              text        NOT NULL,
  channel              text        NOT NULL DEFAULT 'sandbox',
  provider_message_id  text,
  metadata             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT waai_messages_role_check
    CHECK (role IN ('user', 'assistant', 'system', 'tool'))
);

CREATE INDEX idx_waai_messages_conversation_id ON public.waai_messages(conversation_id);
CREATE INDEX idx_waai_messages_workspace_id    ON public.waai_messages(workspace_id);
CREATE INDEX idx_waai_messages_created_at      ON public.waai_messages(created_at);

-- ────────────────────────────────────────────────────────────
-- 3. waai_agent_runs
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.waai_agent_runs (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid        NOT NULL REFERENCES public.waai_workspaces(id)          ON DELETE CASCADE,
  agent_id             uuid        NOT NULL REFERENCES public.waai_agents(id)               ON DELETE CASCADE,
  conversation_id      uuid        REFERENCES public.waai_conversations(id)                 ON DELETE SET NULL,
  prompt_version_id    uuid        REFERENCES public.waai_agent_prompt_versions(id)         ON DELETE SET NULL,
  provider             text        NOT NULL,
  model                text        NOT NULL,
  input_tokens         integer,
  output_tokens        integer,
  total_tokens         integer,
  estimated_cost_cents integer,
  status               text        NOT NULL,
  error_message        text,
  latency_ms           integer,
  metadata             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT waai_agent_runs_status_check
    CHECK (status IN ('success', 'error', 'canceled'))
);

CREATE INDEX idx_waai_agent_runs_workspace_id    ON public.waai_agent_runs(workspace_id);
CREATE INDEX idx_waai_agent_runs_agent_id        ON public.waai_agent_runs(agent_id);
CREATE INDEX idx_waai_agent_runs_conversation_id ON public.waai_agent_runs(conversation_id);
CREATE INDEX idx_waai_agent_runs_created_at      ON public.waai_agent_runs(created_at);

-- ────────────────────────────────────────────────────────────
-- 4. waai_sandbox_sessions
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.waai_sandbox_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL REFERENCES public.waai_workspaces(id)    ON DELETE CASCADE,
  agent_id         uuid        NOT NULL REFERENCES public.waai_agents(id)         ON DELETE CASCADE,
  conversation_id  uuid        NOT NULL REFERENCES public.waai_conversations(id)  ON DELETE CASCADE,
  created_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_waai_sandbox_sessions_updated_at
  BEFORE UPDATE ON public.waai_sandbox_sessions
  FOR EACH ROW EXECUTE FUNCTION public.waai_set_updated_at();

CREATE INDEX idx_waai_sandbox_sessions_workspace_id    ON public.waai_sandbox_sessions(workspace_id);
CREATE INDEX idx_waai_sandbox_sessions_agent_id        ON public.waai_sandbox_sessions(agent_id);
CREATE INDEX idx_waai_sandbox_sessions_conversation_id ON public.waai_sandbox_sessions(conversation_id);

-- ────────────────────────────────────────────────────────────
-- SQL Functions
-- ────────────────────────────────────────────────────────────

-- waai_get_conversation_workspace: returns workspace_id for a conversation
-- Useful for cross-table queries without joins
CREATE OR REPLACE FUNCTION public.waai_get_conversation_workspace(p_conversation_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.waai_conversations
  WHERE id = p_conversation_id;
$$;

-- waai_update_conversation_last_message: atomic update of last_message_at
-- SECURITY DEFINER: bypasses RLS (no UPDATE policy on waai_conversations)
CREATE OR REPLACE FUNCTION public.waai_update_conversation_last_message(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.waai_conversations
     SET last_message_at = now(),
         updated_at      = now()
   WHERE id = p_conversation_id;
END;
$$;

-- waai_can_use_message: check whether workspace has not exceeded monthly message limit
-- Returns true if allowed, false if limit reached
CREATE OR REPLACE FUNCTION public.waai_can_use_message(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_limit   integer;
  v_current integer;
  v_period  text;
BEGIN
  -- Get plan limit for workspace
  SELECT p.messages_limit
    INTO v_limit
    FROM public.waai_subscriptions s
    JOIN public.waai_plans         p ON p.id = s.plan_id
   WHERE s.workspace_id = p_workspace_id
   LIMIT 1;

  IF v_limit IS NULL THEN
    RETURN false;
  END IF;

  -- -1 means unlimited
  IF v_limit = -1 THEN
    RETURN true;
  END IF;

  -- Get current month usage
  v_period := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');

  SELECT COALESCE(uc.messages_sent, 0)
    INTO v_current
    FROM public.waai_usage_counters uc
   WHERE uc.workspace_id = p_workspace_id
     AND uc.period_month = v_period;

  RETURN COALESCE(v_current, 0) < v_limit;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────

-- waai_conversations
ALTER TABLE public.waai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_conversations_select"
  ON public.waai_conversations FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_conversations_insert"
  ON public.waai_conversations FOR INSERT
  WITH CHECK (
    public.waai_get_workspace_role(workspace_id)
      IN ('owner', 'admin', 'agent_manager', 'human_agent')
  );

-- No UPDATE policy: only waai_update_conversation_last_message (SECURITY DEFINER) can update

-- waai_messages
ALTER TABLE public.waai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_messages_select"
  ON public.waai_messages FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_messages_insert"
  ON public.waai_messages FOR INSERT
  WITH CHECK (
    public.waai_get_workspace_role(workspace_id)
      IN ('owner', 'admin', 'agent_manager', 'human_agent')
  );

-- waai_agent_runs
ALTER TABLE public.waai_agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_agent_runs_select"
  ON public.waai_agent_runs FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_agent_runs_insert"
  ON public.waai_agent_runs FOR INSERT
  WITH CHECK (
    public.waai_get_workspace_role(workspace_id)
      IN ('owner', 'admin', 'agent_manager', 'human_agent')
  );

-- waai_sandbox_sessions
ALTER TABLE public.waai_sandbox_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_sandbox_sessions_select"
  ON public.waai_sandbox_sessions FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_sandbox_sessions_insert"
  ON public.waai_sandbox_sessions FOR INSERT
  WITH CHECK (
    public.waai_get_workspace_role(workspace_id)
      IN ('owner', 'admin', 'agent_manager', 'human_agent')
  );
