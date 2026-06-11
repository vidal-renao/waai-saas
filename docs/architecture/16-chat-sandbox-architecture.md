# Architecture 16 — Chat Sandbox

## Capas del sistema

```
UI (client)
  ChatWindow (use client)
    → POST /api/agents/[agentId]/sandbox/start
    → POST /api/agents/[agentId]/sandbox/message

API Routes (server)
  sandbox/start/route.ts  → startSandboxConversationUseCase
  sandbox/message/route.ts → sendSandboxMessageUseCase

Use Cases
  startSandboxConversationUseCase
    → WorkspaceMembersRepository
    → AgentRepository
    → ConversationRepository
    → SandboxSessionRepository

  sendSandboxMessageUseCase
    → WorkspaceMembersRepository
    → AgentRuntimeService

Services
  AgentRuntimeService
    → AgentPermissionService      (check role)
    → db.rpc(waai_can_use_message) (check limit)
    → AgentRepository             (load agent)
    → AgentPromptVersionRepository (load active prompt)
    → ConversationRepository      (create/get conv)
    → MessageRepository           (save user msg)
    → MessageRepository           (fetch history)
    → LLMProvider.generateResponse (call Claude)
    → MessageRepository           (save assistant msg)
    → AgentRunRepository          (save run)
    → db.rpc(waai_update_conversation_last_message)
    → db.rpc(waai_increment_message_counter)

LLM Layer
  AnthropicClaudeProvider implements LLMProvider
    → @anthropic-ai/sdk
    → ANTHROPIC_API_KEY (server env only)
    → ANTHROPIC_MODEL (server env, fallback: claude-haiku-4-5-20251001)

Repositories
  ConversationRepository    → waai_conversations
  MessageRepository         → waai_messages
  AgentRunRepository        → waai_agent_runs
  SandboxSessionRepository  → waai_sandbox_sessions

Database (Supabase)
  public.waai_conversations
  public.waai_messages
  public.waai_agent_runs
  public.waai_sandbox_sessions
```

---

## Flujo técnico: envío de mensaje

```
Client → POST /api/agents/[agentId]/sandbox/message
  body: { conversationId, content }

Route handler:
  1. getUser() — verifica sesión Supabase
  2. sendMessageSchema.safeParse(body) — valida input
  3. sendSandboxMessageUseCase(db, userId, agentId, data)

Use case:
  1. getUserWorkspaceId → workspaceId
  2. findMembership(workspaceId, userId) → role
  3. AgentRuntimeService.processMessage({ workspaceId, agentId, conversationId, userMessage, userId, role })

AgentRuntimeService.processMessage:
  1. canPerformAction(role, "read") → FORBIDDEN si viewer
  2. waai_can_use_message(workspaceId) → 402 si supera límite
  3. agentRepo.findById → AGENT_NOT_FOUND si no existe o workspace mismatch
  4. promptVersionRepo.findActiveByAgent → NO_PROMPT si no hay prompt
  5. createLLMProvider() → NO_API_KEY si falta ANTHROPIC_API_KEY
  6. convRepo.create si conversationId === null → nuevo conversationId
  7. msgRepo.create(role=user) → userMessage
  8. msgRepo.findByConversation(conversationId, 20) → historial
  9. provider.generateResponse({ systemPrompt, messages }) → LLMOutput
     └─ si error: runRepo.create(status=error) → return CLAUDE_ERROR
  10. msgRepo.create(role=assistant) → assistantMessage
  11. runRepo.create(status=success, tokens, latency) → run
  12. rpc(waai_update_conversation_last_message)
  13. rpc(waai_increment_message_counter)
  14. return { conversationId, userMessage, assistantMessage, run }

Response 200:
  { conversationId, userMessage, assistantMessage, run }

Error responses:
  403 FORBIDDEN
  402 MESSAGE_LIMIT
  503 NO_API_KEY
  404 NO_PROMPT / AGENT_NOT_FOUND
  500 CLAUDE_ERROR
```

---

## Relaciones entre tablas

```
waai_workspaces
  ↑
  ├── waai_conversations (workspace_id, agent_id)
  │     ↑
  │     ├── waai_messages (conversation_id, workspace_id)
  │     ├── waai_agent_runs (conversation_id, workspace_id, prompt_version_id)
  │     └── waai_sandbox_sessions (conversation_id, workspace_id)
  └── waai_agents
        ↑
        └── waai_agent_prompt_versions (agent_id) ← usada por agent_runs
```

---

## RLS strategy

Todas las tablas nuevas tienen `workspace_id` como columna de aislamiento.
Las políticas usan `waai_is_workspace_member(workspace_id)` para SELECT
y `waai_get_workspace_role(workspace_id) IN (...)` para INSERT/UPDATE.

Las mutaciones internas del servidor (update last_message_at) usan funciones
con `SECURITY DEFINER` para bypass de RLS de forma controlada.

---

## Seguridad: ANTHROPIC_API_KEY

- Solo accesible desde `process.env.ANTHROPIC_API_KEY` en código servidor
- Nunca en `NEXT_PUBLIC_*`
- `AnthropicClaudeProvider` solo instancia el cliente si la clave existe
- Si falta: error 503 controlado — UI muestra aviso de configuración
- No se expone en logs ni en responses al cliente
