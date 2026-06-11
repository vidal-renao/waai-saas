-- ============================================================
-- Fase 4: Knowledge Base + RAG
-- Migration: 20260610000004_phase4_knowledge_base_rag.sql
-- Tables: waai_knowledge_documents, waai_knowledge_chunks,
--         waai_agent_knowledge_sources, waai_knowledge_events
-- ============================================================

-- Enable pgvector extension (idempotent — safe to run even if already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- ────────────────────────────────────────────────────────────
-- 1. waai_knowledge_documents
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.waai_knowledge_documents (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  uploaded_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  title            text        NOT NULL,
  description      text,
  source_type      text        NOT NULL DEFAULT 'manual',
  status           text        NOT NULL DEFAULT 'draft',
  file_name        text,
  file_path        text,
  mime_type        text,
  file_size_bytes  bigint,
  text_content     text,
  metadata         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  error_message    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT waai_knowledge_documents_source_type_check
    CHECK (source_type IN ('manual', 'txt', 'markdown', 'faq', 'pdf')),
  CONSTRAINT waai_knowledge_documents_status_check
    CHECK (status IN ('draft', 'processing', 'ready', 'failed', 'archived'))
);

CREATE TRIGGER set_waai_knowledge_documents_updated_at
  BEFORE UPDATE ON public.waai_knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.waai_set_updated_at();

CREATE INDEX idx_waai_knowledge_documents_workspace_id ON public.waai_knowledge_documents(workspace_id);
CREATE INDEX idx_waai_knowledge_documents_status       ON public.waai_knowledge_documents(status);

-- ────────────────────────────────────────────────────────────
-- 2. waai_knowledge_chunks
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.waai_knowledge_chunks (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid    NOT NULL REFERENCES public.waai_workspaces(id)          ON DELETE CASCADE,
  document_id     uuid    NOT NULL REFERENCES public.waai_knowledge_documents(id) ON DELETE CASCADE,
  chunk_index     integer NOT NULL,
  content         text    NOT NULL,
  token_count     integer,
  embedding       vector(1536),
  embedding_model text,
  metadata        jsonb   NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT waai_knowledge_chunks_unique_index UNIQUE (document_id, chunk_index)
);

CREATE INDEX idx_waai_knowledge_chunks_workspace_id ON public.waai_knowledge_chunks(workspace_id);
CREATE INDEX idx_waai_knowledge_chunks_document_id  ON public.waai_knowledge_chunks(document_id);

-- Vector index for cosine similarity search
-- ivfflat: approximate nearest-neighbour, built lazily as data grows
CREATE INDEX idx_waai_knowledge_chunks_embedding
  ON public.waai_knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ────────────────────────────────────────────────────────────
-- 3. waai_agent_knowledge_sources
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.waai_agent_knowledge_sources (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid    NOT NULL REFERENCES public.waai_workspaces(id)          ON DELETE CASCADE,
  agent_id     uuid    NOT NULL REFERENCES public.waai_agents(id)               ON DELETE CASCADE,
  document_id  uuid    NOT NULL REFERENCES public.waai_knowledge_documents(id)  ON DELETE CASCADE,
  is_active    boolean NOT NULL DEFAULT true,
  created_by   uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT waai_agent_knowledge_sources_unique UNIQUE (agent_id, document_id)
);

CREATE INDEX idx_waai_agent_knowledge_sources_agent_id     ON public.waai_agent_knowledge_sources(agent_id);
CREATE INDEX idx_waai_agent_knowledge_sources_workspace_id ON public.waai_agent_knowledge_sources(workspace_id);
CREATE INDEX idx_waai_agent_knowledge_sources_document_id  ON public.waai_agent_knowledge_sources(document_id);

-- ────────────────────────────────────────────────────────────
-- 4. waai_knowledge_events
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.waai_knowledge_events (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid    NOT NULL REFERENCES public.waai_workspaces(id)          ON DELETE CASCADE,
  document_id    uuid    REFERENCES public.waai_knowledge_documents(id)           ON DELETE CASCADE,
  agent_id       uuid    REFERENCES public.waai_agents(id)                        ON DELETE CASCADE,
  actor_user_id  uuid    REFERENCES auth.users(id)                                ON DELETE SET NULL,
  event_type     text    NOT NULL,
  metadata       jsonb   NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_waai_knowledge_events_workspace_id ON public.waai_knowledge_events(workspace_id);
CREATE INDEX idx_waai_knowledge_events_document_id  ON public.waai_knowledge_events(document_id);
CREATE INDEX idx_waai_knowledge_events_agent_id     ON public.waai_knowledge_events(agent_id);

-- ────────────────────────────────────────────────────────────
-- SQL Functions
-- ────────────────────────────────────────────────────────────

-- waai_can_upload_document: check if workspace has not hit document limit
CREATE OR REPLACE FUNCTION public.waai_can_upload_document(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_limit   integer;
  v_current integer;
BEGIN
  SELECT p.documents_limit
    INTO v_limit
    FROM public.waai_subscriptions s
    JOIN public.waai_plans p ON p.id = s.plan_id
   WHERE s.workspace_id = p_workspace_id
   LIMIT 1;

  IF v_limit IS NULL THEN
    RETURN false;
  END IF;

  -- -1 means unlimited
  IF v_limit = -1 THEN
    RETURN true;
  END IF;

  SELECT COUNT(*)::integer
    INTO v_current
    FROM public.waai_knowledge_documents
   WHERE workspace_id = p_workspace_id
     AND status != 'archived';

  RETURN v_current < v_limit;
END;
$$;

-- waai_get_document_count: count non-archived documents for workspace
CREATE OR REPLACE FUNCTION public.waai_get_document_count(p_workspace_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::integer
    FROM public.waai_knowledge_documents
   WHERE workspace_id = p_workspace_id
     AND status != 'archived';
$$;

-- waai_increment_document_counter: atomically increment monthly document counter
CREATE OR REPLACE FUNCTION public.waai_increment_document_counter(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_period text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
BEGIN
  INSERT INTO public.waai_usage_counters (workspace_id, period_month, documents_uploaded)
  VALUES (p_workspace_id, v_period, 1)
  ON CONFLICT (workspace_id, period_month)
  DO UPDATE SET
    documents_uploaded = waai_usage_counters.documents_uploaded + 1,
    updated_at         = now();
END;
$$;

-- waai_match_agent_knowledge: cosine similarity search for agent's linked knowledge
-- Returns top-K chunks above similarity threshold from documents linked to the agent
CREATE OR REPLACE FUNCTION public.waai_match_agent_knowledge(
  query_embedding    vector(1536),
  match_agent_id     uuid,
  match_workspace_id uuid,
  match_count        int   DEFAULT 5,
  similarity_threshold float DEFAULT 0.75
)
RETURNS TABLE (
  chunk_id    uuid,
  document_id uuid,
  content     text,
  similarity  float,
  metadata    jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id                                           AS chunk_id,
    c.document_id,
    c.content,
    (1 - (c.embedding <=> query_embedding))::float AS similarity,
    c.metadata
  FROM public.waai_knowledge_chunks c
  JOIN public.waai_knowledge_documents     d   ON d.id  = c.document_id
  JOIN public.waai_agent_knowledge_sources aks ON aks.document_id = c.document_id
  WHERE
    aks.agent_id     = match_agent_id
    AND aks.workspace_id  = match_workspace_id
    AND aks.is_active     = true
    AND d.workspace_id    = match_workspace_id
    AND d.status          = 'ready'
    AND c.embedding       IS NOT NULL
    AND (1 - (c.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY c.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- waai_log_knowledge_event: append-only insert into knowledge events
CREATE OR REPLACE FUNCTION public.waai_log_knowledge_event(
  p_workspace_id  uuid,
  p_document_id   uuid,
  p_agent_id      uuid,
  p_actor_user_id uuid,
  p_event_type    text,
  p_metadata      jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.waai_knowledge_events (
    workspace_id, document_id, agent_id, actor_user_id, event_type, metadata
  ) VALUES (
    p_workspace_id, p_document_id, p_agent_id, p_actor_user_id, p_event_type, p_metadata
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────

-- waai_knowledge_documents
ALTER TABLE public.waai_knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_knowledge_documents_select"
  ON public.waai_knowledge_documents FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_knowledge_documents_insert"
  ON public.waai_knowledge_documents FOR INSERT
  WITH CHECK (
    public.waai_get_workspace_role(workspace_id)
      IN ('owner', 'admin', 'agent_manager')
  );

CREATE POLICY "waai_knowledge_documents_update"
  ON public.waai_knowledge_documents FOR UPDATE
  USING (
    public.waai_get_workspace_role(workspace_id)
      IN ('owner', 'admin', 'agent_manager')
  )
  WITH CHECK (
    public.waai_get_workspace_role(workspace_id)
      IN ('owner', 'admin', 'agent_manager')
  );

-- waai_knowledge_chunks
ALTER TABLE public.waai_knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_knowledge_chunks_select"
  ON public.waai_knowledge_chunks FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

-- Insert controlled by server-side only (processing service)
CREATE POLICY "waai_knowledge_chunks_insert"
  ON public.waai_knowledge_chunks FOR INSERT
  WITH CHECK (
    public.waai_get_workspace_role(workspace_id)
      IN ('owner', 'admin', 'agent_manager')
  );

-- No UPDATE policy on chunks — append-only; re-process replaces via DELETE+INSERT
CREATE POLICY "waai_knowledge_chunks_delete"
  ON public.waai_knowledge_chunks FOR DELETE
  USING (
    public.waai_get_workspace_role(workspace_id)
      IN ('owner', 'admin', 'agent_manager')
  );

-- waai_agent_knowledge_sources
ALTER TABLE public.waai_agent_knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_agent_knowledge_sources_select"
  ON public.waai_agent_knowledge_sources FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_agent_knowledge_sources_insert"
  ON public.waai_agent_knowledge_sources FOR INSERT
  WITH CHECK (
    public.waai_get_workspace_role(workspace_id)
      IN ('owner', 'admin', 'agent_manager')
  );

CREATE POLICY "waai_agent_knowledge_sources_update"
  ON public.waai_agent_knowledge_sources FOR UPDATE
  USING (
    public.waai_get_workspace_role(workspace_id)
      IN ('owner', 'admin', 'agent_manager')
  )
  WITH CHECK (
    public.waai_get_workspace_role(workspace_id)
      IN ('owner', 'admin', 'agent_manager')
  );

CREATE POLICY "waai_agent_knowledge_sources_delete"
  ON public.waai_agent_knowledge_sources FOR DELETE
  USING (
    public.waai_get_workspace_role(workspace_id)
      IN ('owner', 'admin', 'agent_manager')
  );

-- waai_knowledge_events
ALTER TABLE public.waai_knowledge_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_knowledge_events_select"
  ON public.waai_knowledge_events FOR SELECT
  USING (public.waai_is_workspace_member(workspace_id));

-- Insert via SECURITY DEFINER function waai_log_knowledge_event only
-- No direct INSERT policy from app layer to keep events append-only
