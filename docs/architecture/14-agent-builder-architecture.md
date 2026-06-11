# Architecture — Agent Builder (Fase 2)

**Status:** Accepted  
**Date:** 2026-06-07

---

## Visión general

El Agent Builder es el módulo central del producto. Permite a los usuarios de un workspace crear y gestionar agentes inteligentes de WhatsApp mediante un wizard guiado. La arquitectura sigue el patrón Repository → Service → Use Case establecido en Fase 1.

---

## Capas de la arquitectura

```
UI (React Server/Client Components)
  └─ /dashboard/agents           → AgentList
  └─ /dashboard/agents/new       → AgentWizard (client)
  └─ /dashboard/agents/[id]      → AgentDetail
  └─ /dashboard/agents/[id]/edit → AgentConfigForm (client)
  └─ /dashboard/agents/[id]/prompt → AgentPromptPreview

API Routes (Next.js Route Handlers)
  └─ POST   /api/agents
  └─ GET    /api/agents/[agentId]
  └─ PUT    /api/agents/[agentId]
  └─ PUT    /api/agents/[agentId]/config
  └─ POST   /api/agents/[agentId]/prompt
  └─ POST   /api/agents/[agentId]/archive

Use Cases (src/server/use-cases/)
  └─ create-agent.ts
  └─ list-agents.ts
  └─ get-agent-builder-data.ts
  └─ update-agent-config.ts
  └─ generate-agent-system-prompt.ts
  └─ archive-agent.ts

Services (src/server/services/)
  └─ agent-service.ts              → orquestación
  └─ agent-prompt-builder-service.ts → generación de prompts
  └─ agent-permission-service.ts   → control de permisos

Repositories (src/server/repositories/)
  └─ agent-repository.ts
  └─ agent-config-repository.ts
  └─ agent-question-repository.ts
  └─ agent-prompt-version-repository.ts
  └─ agent-event-repository.ts

Validators (src/lib/validators/)
  └─ agent.ts                     → Zod schemas

Lib (src/lib/)
  └─ prompt-builder.ts            → lógica pura (sin deps. del servidor)

Database (Supabase)
  └─ waai_agents
  └─ waai_agent_configs
  └─ waai_agent_questions
  └─ waai_agent_prompt_versions
  └─ waai_agent_events
```

---

## Flujo técnico — Crear agente

```
POST /api/agents
  ↓ createClient() → Supabase SSR
  ↓ supabase.auth.getUser() → verificar autenticación
  ↓ WorkspaceMembersRepository.getUserWorkspaceId(userId)
  ↓ WorkspaceMembersRepository.findMembership(workspaceId, userId)
  ↓ AgentPermissionService.canPerformAction(role, 'create') → 403 si no
  ↓ BillingService.checkAgentLimitForWorkspace(workspaceId) → 402 si excede
  ↓ AgentRepository.create({ workspaceId, name, ... })
  ↓ AgentConfigRepository.create({ agentId, businessName, ... })
  ↓ AgentPromptBuilderService.build(config) → system_prompt string
  ↓ AgentPromptVersionRepository.create({ agentId, version: 1, system_prompt })
  ↓ AgentEventRepository.log(agent_created)
  ↓ AgentEventRepository.log(wizard_completed)
  ↓ AgentEventRepository.log(prompt_generated)
  ↓ SubscriptionsRepository.incrementAgentsCounter(workspaceId)
  ↓ AuditLogsRepository.log(agent.created)
  ↓ return 201 { agent }
```

---

## Flujo técnico — Verificar límites

```
BillingService.checkAgentLimitForWorkspace(workspaceId)
  ↓ SubscriptionsRepository.findByWorkspace(workspaceId) → sub.plan.agents_limit
  ↓ AgentRepository.countActiveByWorkspace(workspaceId)   → count(status != 'archived')
  ↓ return { allowed: limit == -1 || count < limit, limit, current: count }
```

---

## Relaciones entre tablas

```
waai_workspaces (1)
  └── waai_agents (N)
        └── waai_agent_configs (1)    -- unique(agent_id)
        └── waai_agent_prompt_versions (N)  -- versioned
        └── waai_agent_events (N)     -- audit trail

waai_agent_questions  -- global wizard questions, no FK to workspace
```

---

## Generación de system prompt

El prompt se genera de forma local (sin Claude API) usando `AgentPromptBuilderService`.

**Input**: `WaaiAgentConfig` + agente  
**Output**: string (system prompt estructurado en inglés)

El servicio usa plantillas estáticas con interpolación de variables. Se almacena como versión `v1` en `waai_agent_prompt_versions`. Cada regeneración incrementa la versión y desactiva la anterior.

Detalles: ver `docs/architecture/15-agent-prompt-generation.md`

---

## Seguridad

- Toda escritura pasa por API Routes (Next.js) que verifican auth
- RLS en todas las tablas: las queries de Supabase usan el token del usuario (anon key)
- La service_role key nunca se expone al frontend
- AgentPermissionService valida el rol del usuario antes de cada operación
- Las queries entre workspaces son imposibles gracias a RLS + `waai_is_workspace_member()`

---

## Restricciones de diseño

- No usar joins tipados (Supabase TypeScript no infiere FK joins con Relationships: [])
- Usar queries separadas y combinar en TypeScript
- No llamar Claude API en Fase 2
- No exponer service_role al cliente
- Todas las páginas del dashboard usan `export const dynamic = "force-dynamic"`
- El cliente Supabase browser se crea dentro de los event handlers (no a nivel componente)
