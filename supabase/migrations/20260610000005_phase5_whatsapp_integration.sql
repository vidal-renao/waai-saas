-- =============================================================================
-- Fase 5 — WhatsApp Integration Foundation
-- Migration: 20260610000005_phase5_whatsapp_integration.sql
-- Schema: public (no custom schemas)
-- Prefix: waai_ (all objects)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. waai_whatsapp_connections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waai_whatsapp_connections (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  agent_id              uuid REFERENCES public.waai_agents(id) ON DELETE SET NULL,
  provider              text NOT NULL DEFAULT 'whapi'
                          CHECK (provider IN ('mock', 'whapi', 'meta')),
  display_name          text,
  phone_number          text,
  phone_number_id       text,
  external_instance_id  text,
  status                text NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'pending_verification', 'active',
                                            'failed', 'suspended', 'disconnected', 'archived')),
  webhook_url           text,
  webhook_secret_hash   text,
  provider_metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_connected_at     timestamptz,
  last_error_message    text,
  created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. waai_whatsapp_webhook_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waai_whatsapp_webhook_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  connection_id       uuid REFERENCES public.waai_whatsapp_connections(id) ON DELETE SET NULL,
  provider            text NOT NULL,
  event_type          text NOT NULL,
  external_event_id   text,
  external_message_id text,
  direction           text NOT NULL DEFAULT 'unknown'
                        CHECK (direction IN ('inbound', 'outbound', 'status', 'unknown')),
  raw_payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_payload  jsonb NOT NULL DEFAULT '{}'::jsonb,
  processing_status   text NOT NULL DEFAULT 'received'
                        CHECK (processing_status IN ('received', 'processing',
                                                     'processed', 'ignored', 'failed')),
  error_message       text,
  received_at         timestamptz NOT NULL DEFAULT now(),
  processed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. waai_whatsapp_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waai_whatsapp_messages (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  connection_id         uuid NOT NULL REFERENCES public.waai_whatsapp_connections(id) ON DELETE CASCADE,
  conversation_id       uuid REFERENCES public.waai_conversations(id) ON DELETE SET NULL,
  message_id            uuid REFERENCES public.waai_messages(id) ON DELETE SET NULL,
  external_message_id   text,
  external_chat_id      text NOT NULL,
  from_number           text,
  to_number             text,
  direction             text NOT NULL
                          CHECK (direction IN ('inbound', 'outbound')),
  message_type          text NOT NULL DEFAULT 'text'
                          CHECK (message_type IN ('text', 'image', 'audio', 'document', 'unknown')),
  text_content          text,
  delivery_status       text NOT NULL DEFAULT 'pending'
                          CHECK (delivery_status IN ('pending', 'sent', 'delivered',
                                                     'read', 'failed', 'received')),
  provider_metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at               timestamptz,
  delivered_at          timestamptz,
  read_at               timestamptz,
  failed_at             timestamptz,
  error_message         text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. waai_whatsapp_connection_events  (append-only audit log)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waai_whatsapp_connection_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  connection_id   uuid REFERENCES public.waai_whatsapp_connections(id) ON DELETE CASCADE,
  actor_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type      text NOT NULL,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS waai_whatsapp_connections_workspace_id_idx
  ON public.waai_whatsapp_connections(workspace_id);

CREATE INDEX IF NOT EXISTS waai_whatsapp_connections_agent_id_idx
  ON public.waai_whatsapp_connections(agent_id);

CREATE INDEX IF NOT EXISTS waai_whatsapp_connections_status_idx
  ON public.waai_whatsapp_connections(status);

CREATE INDEX IF NOT EXISTS waai_whatsapp_webhook_events_connection_id_idx
  ON public.waai_whatsapp_webhook_events(connection_id);

CREATE INDEX IF NOT EXISTS waai_whatsapp_webhook_events_external_message_id_idx
  ON public.waai_whatsapp_webhook_events(external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS waai_whatsapp_messages_workspace_id_idx
  ON public.waai_whatsapp_messages(workspace_id);

CREATE INDEX IF NOT EXISTS waai_whatsapp_messages_connection_id_idx
  ON public.waai_whatsapp_messages(connection_id);

CREATE INDEX IF NOT EXISTS waai_whatsapp_messages_external_chat_id_idx
  ON public.waai_whatsapp_messages(external_chat_id);

CREATE INDEX IF NOT EXISTS waai_whatsapp_messages_conversation_id_idx
  ON public.waai_whatsapp_messages(conversation_id)
  WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS waai_whatsapp_connection_events_workspace_id_idx
  ON public.waai_whatsapp_connection_events(workspace_id);

-- Idempotency index for inbound messages
CREATE UNIQUE INDEX IF NOT EXISTS waai_whatsapp_messages_external_message_id_uniq
  ON public.waai_whatsapp_messages(connection_id, external_message_id)
  WHERE external_message_id IS NOT NULL AND direction = 'inbound';

-- ---------------------------------------------------------------------------
-- 6. RPC: waai_can_create_whatsapp_connection
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.waai_can_create_whatsapp_connection(
  p_workspace_id uuid
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit   integer;
  v_current integer;
BEGIN
  -- Caller must be workspace member
  IF NOT public.waai_is_workspace_member(p_workspace_id) THEN
    RETURN false;
  END IF;

  -- Get plan limit
  SELECT p.whatsapp_numbers_limit
  INTO v_limit
  FROM public.waai_subscriptions s
  JOIN public.waai_plans p ON p.id = s.plan_id
  WHERE s.workspace_id = p_workspace_id
  LIMIT 1;

  IF v_limit IS NULL THEN
    v_limit := 0;
  END IF;

  -- Unlimited (-1 or very large)
  IF v_limit < 0 THEN
    RETURN true;
  END IF;

  -- Count non-archived connections
  SELECT COUNT(*)
  INTO v_current
  FROM public.waai_whatsapp_connections
  WHERE workspace_id = p_workspace_id
    AND status != 'archived';

  RETURN v_current < v_limit;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. RPC: waai_get_whatsapp_connection_count
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.waai_get_whatsapp_connection_count(
  p_workspace_id uuid
)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.waai_is_workspace_member(p_workspace_id) THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM public.waai_whatsapp_connections
  WHERE workspace_id = p_workspace_id
    AND status != 'archived';

  RETURN COALESCE(v_count, 0);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. RPC: waai_log_whatsapp_connection_event
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.waai_log_whatsapp_connection_event(
  p_workspace_id    uuid,
  p_connection_id   uuid,
  p_actor_user_id   uuid,
  p_event_type      text,
  p_metadata        jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.waai_whatsapp_connection_events
    (workspace_id, connection_id, actor_user_id, event_type, metadata)
  VALUES
    (p_workspace_id, p_connection_id, p_actor_user_id, p_event_type, p_metadata);
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. RPC: waai_mark_webhook_event_processed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.waai_mark_webhook_event_processed(
  p_event_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.waai_whatsapp_webhook_events
  SET processing_status = 'processed',
      processed_at = now()
  WHERE id = p_event_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. RPC: waai_mark_webhook_event_failed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.waai_mark_webhook_event_failed(
  p_event_id     uuid,
  p_error_message text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.waai_whatsapp_webhook_events
  SET processing_status = 'failed',
      error_message = p_error_message,
      processed_at = now()
  WHERE id = p_event_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 11. RLS — waai_whatsapp_connections
-- ---------------------------------------------------------------------------
ALTER TABLE public.waai_whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- All members can read connections in their workspace
CREATE POLICY "waai_whatsapp_connections_select"
  ON public.waai_whatsapp_connections FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

-- Only owner/admin can insert
CREATE POLICY "waai_whatsapp_connections_insert"
  ON public.waai_whatsapp_connections FOR INSERT
  WITH CHECK (
    public.waai_get_workspace_role(workspace_id) IN ('owner', 'admin')
  );

-- Only owner/admin can update
CREATE POLICY "waai_whatsapp_connections_update"
  ON public.waai_whatsapp_connections FOR UPDATE
  USING (
    public.waai_get_workspace_role(workspace_id) IN ('owner', 'admin')
  );

-- No DELETE — use status = 'archived' instead
CREATE POLICY "waai_whatsapp_connections_no_delete"
  ON public.waai_whatsapp_connections FOR DELETE
  USING (false);

-- ---------------------------------------------------------------------------
-- 12. RLS — waai_whatsapp_webhook_events
-- ---------------------------------------------------------------------------
ALTER TABLE public.waai_whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

-- owner/admin/agent_manager can read events
CREATE POLICY "waai_whatsapp_webhook_events_select"
  ON public.waai_whatsapp_webhook_events FOR SELECT
  USING (
    workspace_id IS NOT NULL AND
    public.waai_get_workspace_role(workspace_id) IN ('owner', 'admin', 'agent_manager')
  );

-- No insert/update/delete from app layer (SECURITY DEFINER RPCs only)
CREATE POLICY "waai_whatsapp_webhook_events_no_insert"
  ON public.waai_whatsapp_webhook_events FOR INSERT
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 13. RLS — waai_whatsapp_messages
-- ---------------------------------------------------------------------------
ALTER TABLE public.waai_whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- All members can read messages in their workspace
CREATE POLICY "waai_whatsapp_messages_select"
  ON public.waai_whatsapp_messages FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

-- No insert/update from app layer — service role only via webhook
CREATE POLICY "waai_whatsapp_messages_no_insert"
  ON public.waai_whatsapp_messages FOR INSERT
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 14. RLS — waai_whatsapp_connection_events
-- ---------------------------------------------------------------------------
ALTER TABLE public.waai_whatsapp_connection_events ENABLE ROW LEVEL SECURITY;

-- All members can read events in their workspace
CREATE POLICY "waai_whatsapp_connection_events_select"
  ON public.waai_whatsapp_connection_events FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

-- No insert from app layer — SECURITY DEFINER RPC only
CREATE POLICY "waai_whatsapp_connection_events_no_insert"
  ON public.waai_whatsapp_connection_events FOR INSERT
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 15. updated_at trigger for waai_whatsapp_connections
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.waai_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Only create trigger if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'waai_whatsapp_connections_updated_at'
  ) THEN
    CREATE TRIGGER waai_whatsapp_connections_updated_at
      BEFORE UPDATE ON public.waai_whatsapp_connections
      FOR EACH ROW EXECUTE FUNCTION public.waai_set_updated_at();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'waai_whatsapp_messages_updated_at'
  ) THEN
    CREATE TRIGGER waai_whatsapp_messages_updated_at
      BEFORE UPDATE ON public.waai_whatsapp_messages
      FOR EACH ROW EXECUTE FUNCTION public.waai_set_updated_at();
  END IF;
END;
$$;
