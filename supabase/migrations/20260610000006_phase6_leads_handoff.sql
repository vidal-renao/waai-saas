-- =============================================================================
-- Fase 6: Leads & Human Handoff
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. waai_leads
-- ---------------------------------------------------------------------------
CREATE TABLE public.waai_leads (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid        NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  agent_id          uuid        REFERENCES public.waai_agents(id) ON DELETE SET NULL,
  conversation_id   uuid        REFERENCES public.waai_conversations(id) ON DELETE SET NULL,
  source_channel    text        NOT NULL DEFAULT 'whatsapp'
                                CHECK (source_channel IN ('whatsapp','sandbox','web','manual')),
  status            text        NOT NULL DEFAULT 'new'
                                CHECK (status IN ('new','qualified','contacted','won','lost','archived')),
  priority          text        NOT NULL DEFAULT 'medium'
                                CHECK (priority IN ('low','medium','high','urgent')),
  customer_name     text,
  customer_phone    text,
  customer_email    text,
  company_name      text,
  requested_service text,
  location          text,
  desired_date      text,
  budget            text,
  urgency           text,
  summary           text,
  extracted_data    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  confidence_score  numeric,
  assigned_to       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. waai_lead_events
-- ---------------------------------------------------------------------------
CREATE TABLE public.waai_lead_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  lead_id       uuid        NOT NULL REFERENCES public.waai_leads(id) ON DELETE CASCADE,
  actor_user_id uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type    text        NOT NULL,
  metadata      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. waai_conversation_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE public.waai_conversation_assignments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid        NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  conversation_id uuid        NOT NULL REFERENCES public.waai_conversations(id) ON DELETE CASCADE,
  assigned_to     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  status          text        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','resolved','transferred','closed')),
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. waai_handoffs
-- ---------------------------------------------------------------------------
CREATE TABLE public.waai_handoffs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid        NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  conversation_id   uuid        NOT NULL REFERENCES public.waai_conversations(id) ON DELETE CASCADE,
  agent_id          uuid        REFERENCES public.waai_agents(id) ON DELETE SET NULL,
  requested_by      text        NOT NULL DEFAULT 'agent'
                                CHECK (requested_by IN ('agent','user','customer','system')),
  status            text        NOT NULL DEFAULT 'requested'
                                CHECK (status IN ('requested','active','resolved','canceled')),
  reason            text,
  trigger_type      text        CHECK (trigger_type IN (
                                  'customer_request','low_confidence','angry_customer',
                                  'urgent_request','sensitive_topic','manual','system_rule'
                                )),
  automation_paused boolean     NOT NULL DEFAULT true,
  assigned_to       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. waai_internal_notes
-- ---------------------------------------------------------------------------
CREATE TABLE public.waai_internal_notes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid        NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  conversation_id uuid        REFERENCES public.waai_conversations(id) ON DELETE CASCADE,
  lead_id         uuid        REFERENCES public.waai_leads(id) ON DELETE CASCADE,
  author_user_id  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  note            text        NOT NULL,
  visibility      text        NOT NULL DEFAULT 'internal'
                              CHECK (visibility IN ('internal','owner_admin')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. waai_lead_detection_runs
-- ---------------------------------------------------------------------------
CREATE TABLE public.waai_lead_detection_runs (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid        NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  agent_id              uuid        REFERENCES public.waai_agents(id) ON DELETE SET NULL,
  conversation_id       uuid        NOT NULL REFERENCES public.waai_conversations(id) ON DELETE CASCADE,
  lead_id               uuid        REFERENCES public.waai_leads(id) ON DELETE SET NULL,
  provider              text,
  model                 text,
  status                text        NOT NULL CHECK (status IN ('success','no_lead','error')),
  input_messages_count  integer,
  confidence_score      numeric,
  detected_intent       text,
  extracted_data        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  error_message         text,
  latency_ms            integer,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX waai_leads_workspace_id_idx       ON public.waai_leads(workspace_id);
CREATE INDEX waai_leads_agent_id_idx           ON public.waai_leads(agent_id);
CREATE INDEX waai_leads_conversation_id_idx    ON public.waai_leads(conversation_id);
CREATE INDEX waai_leads_status_idx             ON public.waai_leads(status);
CREATE INDEX waai_leads_assigned_to_idx        ON public.waai_leads(assigned_to);

CREATE INDEX waai_lead_events_lead_id_idx      ON public.waai_lead_events(lead_id);

CREATE INDEX waai_conversation_assignments_conversation_id_idx
  ON public.waai_conversation_assignments(conversation_id);

CREATE INDEX waai_handoffs_conversation_id_idx ON public.waai_handoffs(conversation_id);
CREATE INDEX waai_handoffs_status_idx          ON public.waai_handoffs(status);

CREATE INDEX waai_internal_notes_conversation_id_idx
  ON public.waai_internal_notes(conversation_id);
CREATE INDEX waai_internal_notes_lead_id_idx
  ON public.waai_internal_notes(lead_id);

CREATE INDEX waai_lead_detection_runs_conversation_id_idx
  ON public.waai_lead_detection_runs(conversation_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse waai_set_updated_at from Fase 5)
-- ---------------------------------------------------------------------------
CREATE TRIGGER waai_leads_updated_at
  BEFORE UPDATE ON public.waai_leads
  FOR EACH ROW EXECUTE FUNCTION public.waai_set_updated_at();

CREATE TRIGGER waai_conversation_assignments_updated_at
  BEFORE UPDATE ON public.waai_conversation_assignments
  FOR EACH ROW EXECUTE FUNCTION public.waai_set_updated_at();

CREATE TRIGGER waai_handoffs_updated_at
  BEFORE UPDATE ON public.waai_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.waai_set_updated_at();

CREATE TRIGGER waai_internal_notes_updated_at
  BEFORE UPDATE ON public.waai_internal_notes
  FOR EACH ROW EXECUTE FUNCTION public.waai_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — Enable on all 6 tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.waai_leads                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waai_lead_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waai_conversation_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waai_handoffs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waai_internal_notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waai_lead_detection_runs      ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS policies — waai_leads
-- ---------------------------------------------------------------------------
CREATE POLICY "waai_leads_select_member"
  ON public.waai_leads FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_leads_insert_member"
  ON public.waai_leads FOR INSERT
  WITH CHECK (
    public.waai_is_workspace_member(workspace_id)
    AND public.waai_get_workspace_role(workspace_id) IN ('owner','admin','agent_manager','human_agent')
  );

CREATE POLICY "waai_leads_update_member"
  ON public.waai_leads FOR UPDATE
  USING (
    public.waai_is_workspace_member(workspace_id)
    AND public.waai_get_workspace_role(workspace_id) IN ('owner','admin','agent_manager','human_agent')
  );

-- ---------------------------------------------------------------------------
-- RLS policies — waai_lead_events (append-only; reads for workspace members)
-- ---------------------------------------------------------------------------
CREATE POLICY "waai_lead_events_select_member"
  ON public.waai_lead_events FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_lead_events_insert_member"
  ON public.waai_lead_events FOR INSERT
  WITH CHECK (public.waai_is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- RLS policies — waai_conversation_assignments
-- ---------------------------------------------------------------------------
CREATE POLICY "waai_conversation_assignments_select_member"
  ON public.waai_conversation_assignments FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_conversation_assignments_insert_privileged"
  ON public.waai_conversation_assignments FOR INSERT
  WITH CHECK (
    public.waai_is_workspace_member(workspace_id)
    AND public.waai_get_workspace_role(workspace_id) IN ('owner','admin','agent_manager')
  );

CREATE POLICY "waai_conversation_assignments_update_privileged"
  ON public.waai_conversation_assignments FOR UPDATE
  USING (
    public.waai_is_workspace_member(workspace_id)
    AND public.waai_get_workspace_role(workspace_id) IN ('owner','admin','agent_manager')
  );

-- ---------------------------------------------------------------------------
-- RLS policies — waai_handoffs
-- ---------------------------------------------------------------------------
CREATE POLICY "waai_handoffs_select_member"
  ON public.waai_handoffs FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_handoffs_insert_member"
  ON public.waai_handoffs FOR INSERT
  WITH CHECK (
    public.waai_is_workspace_member(workspace_id)
    AND public.waai_get_workspace_role(workspace_id) IN ('owner','admin','agent_manager','human_agent')
  );

CREATE POLICY "waai_handoffs_update_member"
  ON public.waai_handoffs FOR UPDATE
  USING (
    public.waai_is_workspace_member(workspace_id)
    AND public.waai_get_workspace_role(workspace_id) IN ('owner','admin','agent_manager','human_agent')
  );

-- ---------------------------------------------------------------------------
-- RLS policies — waai_internal_notes
-- ---------------------------------------------------------------------------
CREATE POLICY "waai_internal_notes_select_member"
  ON public.waai_internal_notes FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_internal_notes_insert_member"
  ON public.waai_internal_notes FOR INSERT
  WITH CHECK (
    public.waai_is_workspace_member(workspace_id)
    AND public.waai_get_workspace_role(workspace_id) IN ('owner','admin','agent_manager','human_agent')
  );

CREATE POLICY "waai_internal_notes_update_author"
  ON public.waai_internal_notes FOR UPDATE
  USING (
    public.waai_is_workspace_member(workspace_id)
    AND author_user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- RLS policies — waai_lead_detection_runs (server-side inserts, read for privileged)
-- ---------------------------------------------------------------------------
CREATE POLICY "waai_lead_detection_runs_select_member"
  ON public.waai_lead_detection_runs FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_lead_detection_runs_insert_member"
  ON public.waai_lead_detection_runs FOR INSERT
  WITH CHECK (public.waai_is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- Functions / RPCs
-- ---------------------------------------------------------------------------

-- waai_has_active_handoff: used by webhook to check before calling Claude
CREATE OR REPLACE FUNCTION public.waai_has_active_handoff(
  p_conversation_id uuid
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.waai_handoffs
    WHERE conversation_id = p_conversation_id
      AND status IN ('requested', 'active')
      AND automation_paused = true
  );
$$;

-- waai_log_lead_event: append-only lead audit log
CREATE OR REPLACE FUNCTION public.waai_log_lead_event(
  p_workspace_id  uuid,
  p_lead_id       uuid,
  p_actor_user_id uuid,
  p_event_type    text,
  p_metadata      jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.waai_lead_events (workspace_id, lead_id, actor_user_id, event_type, metadata)
  VALUES (p_workspace_id, p_lead_id, p_actor_user_id, p_event_type, p_metadata);
END;
$$;

-- waai_pause_conversation_automation: set handoff_required status
CREATE OR REPLACE FUNCTION public.waai_pause_conversation_automation(
  p_conversation_id uuid,
  p_reason          text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.waai_conversations
  SET status = 'handoff_required', updated_at = now()
  WHERE id = p_conversation_id;
END;
$$;

-- waai_resume_conversation_automation: set back to open
CREATE OR REPLACE FUNCTION public.waai_resume_conversation_automation(
  p_conversation_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.waai_conversations
  SET status = 'open', updated_at = now()
  WHERE id = p_conversation_id
    AND status = 'handoff_required';
END;
$$;

-- waai_assign_conversation: creates/updates assignment
CREATE OR REPLACE FUNCTION public.waai_assign_conversation(
  p_workspace_id    uuid,
  p_conversation_id uuid,
  p_assigned_to     uuid,
  p_assigned_by     uuid,
  p_reason          text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
BEGIN
  -- Close any active assignment
  UPDATE public.waai_conversation_assignments
  SET status = 'transferred', updated_at = now()
  WHERE conversation_id = p_conversation_id
    AND status = 'active';

  -- Create new active assignment
  INSERT INTO public.waai_conversation_assignments
    (workspace_id, conversation_id, assigned_to, assigned_by, status, reason)
  VALUES
    (p_workspace_id, p_conversation_id, p_assigned_to, p_assigned_by, 'active', p_reason)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- waai_log_handoff_event: (future use; for now handoff events are in lead_events or agent_runs)
-- Kept minimal — handoffs have their own status transitions in waai_handoffs table.
