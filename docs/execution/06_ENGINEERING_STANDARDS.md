# WAAI — Engineering Standards
**Document Type:** Engineering Standard  
**Version:** 1.0  
**Date:** 2026-07-02  
**Status:** Authoritative — every engineer working on WAAI must read and follow this document

---

## 1. TypeScript Standards

### 1.1 Strict Mode

`tsconfig.json` must contain:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Consequences:
- `any` is banned. Use `unknown` and narrow with type guards.
- `as Type` casts must be justified. Prefer `satisfies Type` or type guards.
- Optional chaining `?.` is preferred over `!` non-null assertions.
- Array index access returns `T | undefined` with `noUncheckedIndexedAccess` — always check.

### 1.2 Type Definitions

```typescript
// ✅ Correct — interface for public contracts (API request/response shapes, service boundaries)
interface CreateAgentRequest {
  name: string;
  systemPrompt: string;
  workspaceId: string;
}

// ✅ Correct — type alias for computed types, unions, mapped types
type AgentStatus = 'draft' | 'review' | 'published' | 'deprecated';
type AgentHealthSummary = Pick<Agent, 'id' | 'name'> & { status: AgentStatus };

// ❌ Wrong — never use class for data transfer objects
class CreateAgentRequest {
  constructor(public name: string) {}
}
```

### 1.3 Error Handling

```typescript
// ✅ Correct — explicit error type, structured error context
try {
  const result = await anthropicProvider.complete(request);
  return result;
} catch (error) {
  Sentry.captureException(error, {
    extra: { workspaceId, agentId, operation: 'agent-runtime' }
  });
  throw new AgentRuntimeError('LLM call failed', { cause: error });
}

// ❌ Wrong — swallowed error
try {
  return await anthropicProvider.complete(request);
} catch {
  return null;
}
```

---

## 2. Folder and File Standards

### 2.1 Directory Structure

```
src/
├── app/
│   ├── api/                    ← Route Handlers only. No business logic.
│   │   ├── agents/             ← Agent domain routes
│   │   │   └── [agentId]/
│   │   │       └── route.ts    ← GET, POST, PUT, DELETE handlers
│   │   ├── billing/            ← Billing routes
│   │   ├── webhooks/           ← External webhooks (WhatsApp, Stripe)
│   │   └── v1/                 ← Public API (Phase G)
│   └── (dashboard)/            ← Protected app pages
│
├── lib/
│   ├── llm/                    ← LLMProvider interface + implementations
│   ├── embeddings/             ← EmbeddingProvider interface + implementations
│   ├── whatsapp/               ← WhatsappProvider interface + implementations
│   ├── connectors/             ← ConnectorRegistry + all connectors (Phase E)
│   ├── rag/                    ← Chunker, text extractor, token estimator
│   ├── supabase/               ← client.ts, server.ts, middleware.ts, service-role.ts
│   ├── security/               ← redact-secrets.ts, encryption.ts
│   ├── validators/             ← Zod schemas (one file per domain)
│   └── utils.ts                ← Shared utilities (keep minimal)
│
└── server/
    ├── repositories/           ← DB access only. Returns domain types.
    ├── services/               ← Business logic. Calls repositories + providers.
    └── use-cases/              ← Orchestration. Calls services. Called by Route Handlers.
```

### 2.2 File Naming

| Type | Convention | Example |
|---|---|---|
| Route Handler | `route.ts` | `src/app/api/agents/[agentId]/route.ts` |
| Repository | `{domain}-repository.ts` | `agent-repository.ts` |
| Service | `{domain}-service.ts` | `agent-runtime-service.ts` |
| Use Case | `{verb}-{domain}-use-case.ts` | `create-agent-use-case.ts` |
| Provider | `{vendor}-{domain}-provider.ts` | `anthropic-claude-provider.ts` |
| Validator | `{domain}.ts` | `src/lib/validators/agent.ts` |
| Type definitions | `types.ts` | `src/lib/llm/types.ts` |
| React Component | `PascalCase.tsx` | `AgentCard.tsx` |
| Hook | `use{Name}.ts` | `useAgentHealth.ts` |
| Test | `{filename}.test.ts` | `agent-runtime-service.test.ts` |

### 2.3 Component Organization

```
components/
├── ui/           ← Primitives: Button, Card, Input, Badge, Modal
├── sections/     ← Page sections: no business logic, receives props only
└── features/     ← Domain components: may import hooks and use-cases
    ├── agents/
    │   ├── AgentCard.tsx
    │   ├── AgentPolicyEditor.tsx
    │   └── index.ts            ← barrel export
    └── billing/
        ├── PlanUpgradeModal.tsx
        └── index.ts
```

---

## 3. API Standards

### 3.1 Route Handler Structure

Every Route Handler must follow this exact structure:

```typescript
// src/app/api/agents/route.ts
import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { CreateAgentUseCase } from '@/server/use-cases/create-agent-use-case';
import { createAgentSchema } from '@/lib/validators/agent';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate input
    const body = await request.json();
    const validated = createAgentSchema.parse(body);

    // 2. Authenticate
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 3. Execute use case
    const useCase = new CreateAgentUseCase(supabase);
    const agent = await useCase.execute({ ...validated, userId: user.id });

    // 4. Return response
    return Response.json(agent, { status: 201 });

  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    Sentry.captureException(error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.2 HTTP Status Codes

| Status | When to Use |
|---|---|
| 200 | Successful GET, successful action (no new resource created) |
| 201 | Resource created (POST that creates a record) |
| 204 | Successful DELETE or operation with no response body |
| 400 | Validation failure (Zod error) |
| 401 | Not authenticated (no session) |
| 403 | Authenticated but not authorised (wrong workspace, wrong role) |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate workspace slug) |
| 402 | Plan limit exceeded (from `ADR-0006`) |
| 422 | Semantically invalid request (passes validation but cannot be processed) |
| 500 | Unexpected server error — always log with Sentry |

### 3.3 Response Shape

All API responses use consistent shapes:

```typescript
// Success (single resource)
{ "id": "...", "name": "...", "createdAt": "..." }

// Success (list)
{ "data": [...], "count": 42, "hasMore": false }

// Error
{ "error": "Human-readable message", "code": "OPTIONAL_ERROR_CODE" }

// Validation error
{ "error": "Validation failed", "details": { "fieldErrors": {...}, "formErrors": [] } }
```

### 3.4 Public API v1 (Phase G)

All public API routes live under `/api/v1/` and must:
- Authenticate via API key in `Authorization: Bearer waai_...` header
- Return JSON with `Content-Type: application/json`
- Include `X-Request-Id` in response
- Be versioned: `/api/v1/` never has breaking changes once launched; `/api/v2/` is additive
- Be rate-limited: Upstash Rate Limit middleware applied to all `/api/v1/` routes

---

## 4. Database Standards

### 4.1 Naming Conventions

All WAAI tables use the `waai_` prefix (ADR-0002 — immutable).

| Object | Convention | Example |
|---|---|---|
| Table | `waai_{domain}_{noun}` | `waai_agent_policies` |
| Column | `snake_case` | `workspace_id`, `created_at` |
| Primary key | `id uuid primary key default gen_random_uuid()` | Standard across all tables |
| Foreign key | `{table_name}_id` | `agent_id`, `workspace_id` |
| Timestamps | `created_at timestamptz default now()`, `updated_at timestamptz default now()` | On every table |
| Soft delete | `archived_at timestamptz` (never `deleted_at`, never hard delete) | |
| Boolean flag | `is_{adjective}` or action in past tense | `is_active`, `policy_enforcement_enabled` |
| JSONB column | `{descriptive_name} jsonb` with explicit CHECK constraint where possible | `rule_definition jsonb`, `graph_definition jsonb` |

### 4.2 Required Columns on Every Table

```sql
CREATE TABLE waai_example (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES waai_workspaces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Exception: Junction tables and audit tables may omit `workspace_id` if isolation is provided by the referenced entity.

### 4.3 RLS Policy Pattern

Every new table must have RLS enabled and the following policies:

```sql
ALTER TABLE waai_example ENABLE ROW LEVEL SECURITY;

-- Read: members of the workspace
CREATE POLICY "workspace_members_select" ON waai_example
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM waai_workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Insert: members with appropriate role
CREATE POLICY "workspace_members_insert" ON waai_example
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM waai_workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'agent_manager')
    )
  );

-- Service role bypass (for server-side operations)
-- Supabase service role bypasses RLS automatically
```

### 4.4 Migration Standards

- One migration file per logical change (not one per table if tables are related)
- Migration files are additive and backward-compatible with current production code
- Always include a comment explaining the migration purpose at the top of the file
- Test rollback: every migration has a verified rollback path documented in the PR
- Never use `DROP COLUMN` or `DROP TABLE` in a migration without a two-phase approach (1: remove references in code, 2: drop in next release)

### 4.5 Query Standards

```typescript
// ✅ Correct — explicit column selection, no SELECT *
const { data, error } = await supabase
  .from('waai_agents')
  .select('id, name, status, created_at')
  .eq('workspace_id', workspaceId)
  .order('created_at', { ascending: false });

// ❌ Wrong — SELECT * leaks columns, breaks typed returns
const { data } = await supabase.from('waai_agents').select('*');

// ✅ Correct — batch fetch, not N+1
const agentIds = conversations.map(c => c.agent_id);
const { data: agents } = await supabase
  .from('waai_agents')
  .select('id, name')
  .in('id', agentIds);

// ❌ Wrong — N+1 query
for (const conv of conversations) {
  const agent = await supabase.from('waai_agents').select('id, name').eq('id', conv.agent_id);
}
```

---

## 5. AI Standards

Full AI engineering standards in `docs/execution/10_AI_ENGINEERING_GUIDE.md`. Summary:

- Every AI call must record `input_tokens`, `output_tokens`, and `estimated_cost_cents` in `waai_agent_runs`
- No AI call without retry logic (min 3 attempts, exponential backoff)
- Prompts assembled in `src/lib/prompt-builder.ts` — never inline in service files
- System prompt (Layer 1) is cacheable; inject `cache_control: { type: "ephemeral" }` on every request
- AI responses must never be returned directly to the user without PII/safety filtering

---

## 6. Connector Standards

Full connector standards in `docs/execution/11_CONNECTOR_GUIDE.md`. Summary:

- Every channel connector implements the `Connector` interface from `src/lib/connectors/connector.ts`
- Connectors are registered in `ConnectorRegistry` — no switch/case in `AgentRuntimeService`
- Connector business logic stays in the connector — `AgentRuntimeService` is provider-agnostic
- All credentials encrypted at rest before storage
- Every connector has a `health()` method that returns `{ status: 'ok' | 'degraded' | 'down' }`

---

## 7. Agent Standards

Full agent standards in `docs/execution/12_AGENT_DEVELOPMENT_GUIDE.md`. Summary:

- Agents are created with explicit `goals`, `policies`, and `tools` — not just a system prompt
- No agent is deployed to production without passing the Agent Lifecycle review gate (`draft → review → published`)
- Every agent interaction writes to `waai_agent_runs` and `waai_audit_logs`
- Agents cannot access data outside their workspace (enforced by RLS + service layer checks)

---

## 8. Security Standards

- **Input validation**: Zod at every HTTP boundary. No exceptions.
- **Output encoding**: No raw HTML string interpolation in React. Use JSX.
- **Secret detection**: `src/lib/security/redact-secrets.ts` applied before any logging
- **Webhook signatures**: Always verify before processing payload
- **Principle of least privilege**: Service role client used only in server-side contexts that cannot use user JWT; user's JWT used for all user-scoped operations
- **OWASP Top 10 review**: Required for all auth, payment, and webhook features before merge
