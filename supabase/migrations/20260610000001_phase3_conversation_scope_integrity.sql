-- ============================================================
-- Fase 3 hardening: conversation tenant/agent integrity
-- Ensures rows linked to a conversation cannot spoof workspace_id
-- or agent_id across tenant boundaries.
-- ============================================================

CREATE OR REPLACE FUNCTION public.waai_validate_conversation_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_agent_id uuid;
BEGIN
  IF NEW.conversation_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT workspace_id, agent_id
    INTO v_workspace_id, v_agent_id
    FROM public.waai_conversations
   WHERE id = NEW.conversation_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'waai conversation % not found', NEW.conversation_id
      USING ERRCODE = '23503';
  END IF;

  IF NEW.workspace_id <> v_workspace_id THEN
    RAISE EXCEPTION 'waai conversation workspace mismatch'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.agent_id IS NOT NULL AND NEW.agent_id <> v_agent_id THEN
    RAISE EXCEPTION 'waai conversation agent mismatch'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_waai_messages_conversation_scope
  BEFORE INSERT OR UPDATE ON public.waai_messages
  FOR EACH ROW EXECUTE FUNCTION public.waai_validate_conversation_scope();

CREATE TRIGGER validate_waai_agent_runs_conversation_scope
  BEFORE INSERT OR UPDATE ON public.waai_agent_runs
  FOR EACH ROW EXECUTE FUNCTION public.waai_validate_conversation_scope();

CREATE TRIGGER validate_waai_sandbox_sessions_conversation_scope
  BEFORE INSERT OR UPDATE ON public.waai_sandbox_sessions
  FOR EACH ROW EXECUTE FUNCTION public.waai_validate_conversation_scope();
