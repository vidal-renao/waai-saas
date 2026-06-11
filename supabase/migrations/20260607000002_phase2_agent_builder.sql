-- =============================================================
-- WAAI SaaS — Fase 2: Agent Builder
-- Schema: public | Prefix: waai_
-- Created: 2026-06-07
-- Spec: docs/specs/09-agent-builder-spec.md
-- ADR: docs/adr/ADR-0002-supabase-public-schema-and-waai-prefix.md
-- =============================================================

-- ============================================================
-- TABLE: waai_agents
-- One agent per row. Belongs to a workspace.
-- ============================================================
CREATE TABLE public.waai_agents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name             text NOT NULL,
  description      text,
  status           text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  primary_language text NOT NULL DEFAULT 'es',
  channel          text NOT NULL DEFAULT 'whatsapp'
                   CHECK (channel IN ('whatsapp')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_waai_agents_workspace_id ON public.waai_agents(workspace_id);
CREATE INDEX idx_waai_agents_status ON public.waai_agents(workspace_id, status);

ALTER TABLE public.waai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_agents_select_member"
  ON public.waai_agents FOR SELECT
  USING (waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_agents_insert_manager"
  ON public.waai_agents FOR INSERT
  WITH CHECK (
    waai_get_workspace_role(workspace_id) IN ('owner', 'admin', 'agent_manager')
  );

CREATE POLICY "waai_agents_update_manager"
  ON public.waai_agents FOR UPDATE
  USING (
    waai_get_workspace_role(workspace_id) IN ('owner', 'admin', 'agent_manager')
  )
  WITH CHECK (
    waai_get_workspace_role(workspace_id) IN ('owner', 'admin', 'agent_manager')
  );

-- No DELETE policy: use archive (status = 'archived') instead

-- ============================================================
-- TABLE: waai_agent_configs
-- Full configuration for an agent. One per agent (unique).
-- ============================================================
CREATE TABLE public.waai_agent_configs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id              uuid NOT NULL UNIQUE REFERENCES public.waai_agents(id) ON DELETE CASCADE,
  business_name         text NOT NULL,
  industry              text NOT NULL,
  country               text,
  city                  text,
  timezone              text,
  tone                  text NOT NULL DEFAULT 'professional',
  primary_goal          text NOT NULL,
  target_audience       text,
  business_description  text,
  opening_message       text,
  fallback_message      text,
  human_handoff_message text,
  working_hours         jsonb NOT NULL DEFAULT '{}'::jsonb,
  service_areas         jsonb NOT NULL DEFAULT '[]'::jsonb,
  services              jsonb NOT NULL DEFAULT '[]'::jsonb,
  faqs                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  lead_capture_fields   jsonb NOT NULL DEFAULT '[]'::jsonb,
  handoff_rules         jsonb NOT NULL DEFAULT '[]'::jsonb,
  restrictions          jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_waai_agent_configs_agent_id ON public.waai_agent_configs(agent_id);

ALTER TABLE public.waai_agent_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_agent_configs_select_member"
  ON public.waai_agent_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.waai_agents a
      WHERE a.id = agent_id
        AND waai_is_workspace_member(a.workspace_id)
    )
  );

CREATE POLICY "waai_agent_configs_insert_manager"
  ON public.waai_agent_configs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.waai_agents a
      WHERE a.id = agent_id
        AND waai_get_workspace_role(a.workspace_id) IN ('owner', 'admin', 'agent_manager')
    )
  );

CREATE POLICY "waai_agent_configs_update_manager"
  ON public.waai_agent_configs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.waai_agents a
      WHERE a.id = agent_id
        AND waai_get_workspace_role(a.workspace_id) IN ('owner', 'admin', 'agent_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.waai_agents a
      WHERE a.id = agent_id
        AND waai_get_workspace_role(a.workspace_id) IN ('owner', 'admin', 'agent_manager')
    )
  );

-- ============================================================
-- TABLE: waai_agent_questions
-- Wizard question definitions. Seeded below. Read-only from app.
-- ============================================================
CREATE TABLE public.waai_agent_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_key  text UNIQUE NOT NULL,
  question_text text NOT NULL,
  description   text,
  input_type    text NOT NULL
                CHECK (input_type IN ('text', 'textarea', 'select', 'multiselect', 'json_list', 'time_schedule', 'boolean')),
  section       text NOT NULL
                CHECK (section IN ('business_identity', 'communication_style', 'services', 'knowledge', 'lead_capture', 'handoff', 'safety')),
  required      boolean NOT NULL DEFAULT false,
  options       jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waai_agent_questions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read wizard questions
CREATE POLICY "waai_agent_questions_select_authenticated"
  ON public.waai_agent_questions FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- No INSERT/UPDATE/DELETE from app: seed only via migration (postgres superuser bypasses RLS)

-- ============================================================
-- TABLE: waai_agent_prompt_versions
-- Versioned system prompts for each agent.
-- ============================================================
CREATE TABLE public.waai_agent_prompt_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid NOT NULL REFERENCES public.waai_agents(id) ON DELETE CASCADE,
  version         integer NOT NULL,
  system_prompt   text NOT NULL,
  prompt_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active       boolean NOT NULL DEFAULT true,
  generated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_id, version)
);

CREATE INDEX idx_waai_agent_prompt_versions_agent_id ON public.waai_agent_prompt_versions(agent_id);

ALTER TABLE public.waai_agent_prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_agent_prompt_versions_select_member"
  ON public.waai_agent_prompt_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.waai_agents a
      WHERE a.id = agent_id
        AND waai_is_workspace_member(a.workspace_id)
    )
  );

CREATE POLICY "waai_agent_prompt_versions_insert_manager"
  ON public.waai_agent_prompt_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.waai_agents a
      WHERE a.id = agent_id
        AND waai_get_workspace_role(a.workspace_id) IN ('owner', 'admin', 'agent_manager')
    )
  );

-- Only is_active flag can be toggled by owner/admin
CREATE POLICY "waai_agent_prompt_versions_update_admin"
  ON public.waai_agent_prompt_versions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.waai_agents a
      WHERE a.id = agent_id
        AND waai_get_workspace_role(a.workspace_id) IN ('owner', 'admin')
    )
  );

-- ============================================================
-- TABLE: waai_agent_events
-- Append-only audit trail for agent lifecycle events.
-- ============================================================
CREATE TABLE public.waai_agent_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.waai_workspaces(id) ON DELETE CASCADE,
  agent_id      uuid REFERENCES public.waai_agents(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type    text NOT NULL
                CHECK (event_type IN (
                  'agent_created', 'agent_updated', 'agent_activated',
                  'agent_paused', 'agent_archived', 'prompt_generated',
                  'wizard_completed'
                )),
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_waai_agent_events_workspace_id ON public.waai_agent_events(workspace_id, created_at DESC);
CREATE INDEX idx_waai_agent_events_agent_id ON public.waai_agent_events(agent_id);

ALTER TABLE public.waai_agent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waai_agent_events_select_member"
  ON public.waai_agent_events FOR SELECT
  USING (waai_is_workspace_member(workspace_id));

CREATE POLICY "waai_agent_events_insert_member"
  ON public.waai_agent_events FOR INSERT
  WITH CHECK (waai_is_workspace_member(workspace_id));

-- No UPDATE/DELETE: append-only

-- ============================================================
-- TRIGGERS — updated_at
-- ============================================================

-- waai_set_updated_at already exists from Phase 1

CREATE TRIGGER waai_agents_set_updated_at
  BEFORE UPDATE ON public.waai_agents
  FOR EACH ROW EXECUTE FUNCTION waai_set_updated_at();

CREATE TRIGGER waai_agent_configs_set_updated_at
  BEFORE UPDATE ON public.waai_agent_configs
  FOR EACH ROW EXECUTE FUNCTION waai_set_updated_at();

CREATE TRIGGER waai_agent_questions_set_updated_at
  BEFORE UPDATE ON public.waai_agent_questions
  FOR EACH ROW EXECUTE FUNCTION waai_set_updated_at();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Count active (non-archived) agents in a workspace
CREATE OR REPLACE FUNCTION waai_get_agent_count(p_workspace_id uuid)
RETURNS integer
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.waai_agents
  WHERE workspace_id = p_workspace_id
    AND status != 'archived';
$$;

-- Check if workspace can create another agent (respects plan limit)
CREATE OR REPLACE FUNCTION waai_can_create_agent(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agents_limit integer;
  v_agent_count  integer;
BEGIN
  SELECT wp.agents_limit INTO v_agents_limit
  FROM public.waai_subscriptions ws
  JOIN public.waai_plans wp ON wp.id = ws.plan_id
  WHERE ws.workspace_id = p_workspace_id
  LIMIT 1;

  IF v_agents_limit IS NULL THEN
    RETURN false;
  END IF;

  IF v_agents_limit = -1 THEN
    RETURN true;
  END IF;

  v_agent_count := waai_get_agent_count(p_workspace_id);
  RETURN v_agent_count < v_agents_limit;
END;
$$;

-- Get next version number for a prompt
CREATE OR REPLACE FUNCTION waai_get_next_prompt_version(p_agent_id uuid)
RETURNS integer
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(version), 0) + 1
  FROM public.waai_agent_prompt_versions
  WHERE agent_id = p_agent_id;
$$;

-- Increment agents_created counter atomically (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION waai_increment_agent_counter(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text := to_char(now(), 'YYYY-MM');
BEGIN
  INSERT INTO public.waai_usage_counters (workspace_id, period_month, agents_created)
  VALUES (p_workspace_id, v_period, 1)
  ON CONFLICT (workspace_id, period_month)
  DO UPDATE SET
    agents_created = waai_usage_counters.agents_created + 1,
    updated_at     = now();
END;
$$;

-- Log an agent event (convenience RPC)
CREATE OR REPLACE FUNCTION waai_log_agent_event(
  p_workspace_id  uuid,
  p_agent_id      uuid,
  p_actor_user_id uuid,
  p_event_type    text,
  p_metadata      jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.waai_agent_events(
    workspace_id, agent_id, actor_user_id, event_type, metadata
  ) VALUES (
    p_workspace_id, p_agent_id, p_actor_user_id, p_event_type, p_metadata
  );
$$;

-- ============================================================
-- SEED DATA: waai_agent_questions
-- 20 wizard questions across 7 sections
-- ============================================================

INSERT INTO public.waai_agent_questions
  (question_key, question_text, description, input_type, section, required, options, sort_order)
VALUES
  -- business_identity (sort 10-60)
  ('business_name',
   '¿Cuál es el nombre de tu negocio?',
   'Este nombre identificará a tu empresa en las conversaciones.',
   'text', 'business_identity', true, '[]'::jsonb, 10),

  ('industry',
   '¿A qué sector pertenece tu negocio?',
   'Selecciona el sector más cercano a tu actividad.',
   'select', 'business_identity', true,
   '["Limpieza","Restaurante / Cafetería","Clínica / Salud","Inmobiliaria","Academia / Formación","Construcción / Reformas","Ecommerce","Consultoría / Coaching","Logística","Tecnología / IT","Belleza / Estética","Jardinería / Paisajismo","Otro"]'::jsonb,
   20),

  ('business_description',
   'Describe brevemente qué hace tu empresa.',
   'Esta descripción ayuda al agente a entender tu negocio.',
   'textarea', 'business_identity', true, '[]'::jsonb, 30),

  ('country',
   '¿En qué país opera principalmente?',
   null,
   'select', 'business_identity', false,
   '["ES","CH","MX","AR","CO","CL","PE","EC","UY","US"]'::jsonb,
   40),

  ('city',
   '¿En qué ciudad o zona principal trabaja?',
   null,
   'text', 'business_identity', false, '[]'::jsonb, 50),

  ('timezone',
   '¿Cuál es la zona horaria?',
   null,
   'select', 'business_identity', false,
   '["Europe/Madrid","Europe/Zurich","America/Mexico_City","America/Argentina/Buenos_Aires","America/Bogota","America/Santiago","America/Lima","America/New_York","UTC"]'::jsonb,
   60),

  -- communication_style (sort 70-100)
  ('primary_language',
   '¿En qué idioma debe responder el agente?',
   null,
   'select', 'communication_style', true,
   '["es","en","fr","de","pt","ca","it"]'::jsonb,
   70),

  ('tone',
   '¿Qué tono debe usar el agente?',
   'El tono define cómo se comunica el agente con los clientes.',
   'select', 'communication_style', true,
   '["professional","friendly","casual","formal","empathetic"]'::jsonb,
   80),

  ('target_audience',
   '¿Quiénes son tus clientes principales?',
   'Describe brevemente a tu cliente ideal.',
   'textarea', 'communication_style', false, '[]'::jsonb, 90),

  ('opening_message',
   '¿Cómo debe saludar el agente al cliente?',
   'Mensaje inicial cuando el cliente contacta por primera vez.',
   'textarea', 'communication_style', false, '[]'::jsonb, 100),

  -- services (sort 110-130)
  ('services',
   '¿Qué servicios ofrece tu empresa?',
   'Escribe un servicio por línea.',
   'json_list', 'services', true, '[]'::jsonb, 110),

  ('service_areas',
   '¿En qué zonas atiendes?',
   'Escribe una zona o ciudad por línea.',
   'json_list', 'services', false, '[]'::jsonb, 120),

  ('working_hours',
   '¿Cuál es el horario de atención?',
   'Ej: Lunes a Viernes 9:00-18:00, Sábado 10:00-14:00.',
   'time_schedule', 'services', false, '[]'::jsonb, 130),

  -- knowledge (sort 140-150)
  ('faqs',
   'Añade preguntas frecuentes y su respuesta.',
   'Escribe una por línea. Pueden ser preguntas + respuesta o datos clave.',
   'json_list', 'knowledge', false, '[]'::jsonb, 140),

  ('fallback_message',
   '¿Qué debe decir el agente cuando no sepa responder?',
   'Mensaje de respaldo cuando el agente no tiene la información.',
   'textarea', 'knowledge', true, '[]'::jsonb, 150),

  -- lead_capture (sort 160-170)
  ('primary_goal',
   '¿Cuál es el objetivo principal del agente?',
   'Define qué debe conseguir el agente en cada conversación.',
   'select', 'lead_capture', true,
   '["Capturar leads","Responder preguntas frecuentes","Agendar citas","Derivar al equipo humano","Proporcionar información","Tomar pedidos"]'::jsonb,
   160),

  ('lead_capture_fields',
   '¿Qué datos debe pedir a un cliente interesado?',
   'Escribe un campo por línea (ej: nombre, teléfono, email).',
   'json_list', 'lead_capture', false, '[]'::jsonb, 170),

  -- handoff (sort 180-190)
  ('handoff_rules',
   '¿Cuándo debe escalar a una persona?',
   'Escribe una regla por línea.',
   'json_list', 'handoff', false, '[]'::jsonb, 180),

  ('human_handoff_message',
   '¿Qué mensaje debe enviar antes de escalar?',
   null,
   'textarea', 'handoff', false, '[]'::jsonb, 190),

  -- safety (sort 200)
  ('restrictions',
   '¿Qué cosas no debe prometer o responder el agente?',
   'Escribe una restricción por línea.',
   'json_list', 'safety', false, '[]'::jsonb, 200);
