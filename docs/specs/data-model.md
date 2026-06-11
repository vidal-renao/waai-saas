# Data Model — WAAI SaaS

**Status:** Draft (pre-Fase 1)  
**Convention:** All tables in `public` schema with `waai_` prefix. See [ADR-0002](../adr/ADR-0002-supabase-public-schema-and-waai-prefix.md).

> ⚠️ Migrations will be created in Fase 1. This document is the authoritative spec for what will be built.

---

## Tables overview

| Table | Created in | Purpose |
|---|---|---|
| `waai_workspaces` | Fase 1 | Tenant root |
| `waai_workspace_members` | Fase 1 | User ↔ workspace membership + roles |
| `waai_audit_logs` | Fase 1 | Immutable event log |
| `waai_subscriptions` | Fase 1 | Plan limits per workspace |
| `waai_agents` | Fase 2 | Agent config, system prompt |
| `waai_agent_questions` | Fase 2 | Wizard answers |
| `waai_documents` | Fase 4 | Uploaded knowledge base files |
| `waai_document_chunks` | Fase 4 | Vectorized document chunks (pgvector) |
| `waai_whatsapp_connections` | Fase 5 | WhatsApp provider connections |
| `waai_conversations` | Fase 3 | Conversation sessions |
| `waai_messages` | Fase 3 | Individual messages in a conversation |
| `waai_leads` | Fase 6 | Captured leads from conversations |

---

## Fase 1 tables

### `waai_workspaces`
```sql
id uuid primary key default gen_random_uuid(),
name text not null,
slug text unique not null,
business_type text,
country text default 'ES',
timezone text default 'Europe/Madrid',
status text not null default 'trial' check (status in ('active','paused','trial','cancelled')),
created_by uuid references auth.users(id),
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### `waai_workspace_members`
```sql
id uuid primary key default gen_random_uuid(),
workspace_id uuid not null references waai_workspaces(id) on delete cascade,
user_id uuid not null references auth.users(id) on delete cascade,
role text not null check (role in ('platform_owner','platform_admin','agency_owner','workspace_owner','workspace_admin','operator','viewer')),
created_at timestamptz default now(),
unique(workspace_id, user_id)
```

### `waai_subscriptions`
```sql
id uuid primary key default gen_random_uuid(),
workspace_id uuid unique not null references waai_workspaces(id) on delete cascade,
plan text not null default 'free' check (plan in ('free','starter','pro','agency','enterprise')),
messages_used_this_month int not null default 0,
messages_reset_at timestamptz default now(),
agents_limit int not null default 1,
messages_limit int not null default 100,
documents_limit int not null default 3,
whatsapp_numbers_limit int not null default 0,
human_handoff_enabled bool not null default false,
stripe_customer_id text,
stripe_subscription_id text,
current_period_end timestamptz,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### `waai_audit_logs`
```sql
id uuid primary key default gen_random_uuid(),
workspace_id uuid references waai_workspaces(id),
actor_user_id uuid references auth.users(id),
event_type text not null,
entity_type text,
entity_id uuid,
metadata jsonb default '{}',
created_at timestamptz default now()
```

---

## Fase 2 tables

### `waai_agents`
```sql
id uuid primary key default gen_random_uuid(),
workspace_id uuid not null references waai_workspaces(id) on delete cascade,
name text not null,
description text,
tone text default 'professional',
language text default 'es',
business_context jsonb default '{}',
system_prompt text,
system_prompt_version int default 1,
status text not null default 'draft' check (status in ('draft','testing','active','paused')),
model_provider text not null default 'anthropic',
model_name text default 'claude-haiku-4-5-20251001',
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### `waai_agent_questions`
```sql
id uuid primary key default gen_random_uuid(),
agent_id uuid not null references waai_agents(id) on delete cascade,
workspace_id uuid not null references waai_workspaces(id) on delete cascade,
question_key text not null,
question text not null,
answer text,
order_index int not null default 0,
created_at timestamptz default now()
```

---

## Fase 3 tables

### `waai_conversations`
```sql
id uuid primary key default gen_random_uuid(),
workspace_id uuid not null references waai_workspaces(id) on delete cascade,
agent_id uuid not null references waai_agents(id),
external_chat_id text,
customer_phone text not null,
customer_name text,
status text not null default 'bot_active' check (status in ('bot_active','human_needed','human_active','closed','blocked')),
intent text,
lead_score int default 0,
last_message_at timestamptz default now(),
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### `waai_messages`
```sql
id uuid primary key default gen_random_uuid(),
conversation_id uuid not null references waai_conversations(id) on delete cascade,
workspace_id uuid not null references waai_workspaces(id) on delete cascade,
external_message_id text unique,
direction text not null check (direction in ('inbound','outbound')),
sender_type text not null check (sender_type in ('customer','agent','human','system')),
content text not null,
raw_payload jsonb default '{}',
llm_metadata jsonb default '{}',
created_at timestamptz default now()
```

---

## Fase 4 tables

### `waai_documents`
```sql
id uuid primary key default gen_random_uuid(),
workspace_id uuid not null references waai_workspaces(id) on delete cascade,
agent_id uuid references waai_agents(id),
title text not null,
file_url text,
content_text text,
mime_type text,
status text not null default 'uploaded' check (status in ('uploaded','processing','ready','failed')),
error_message text,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### `waai_document_chunks`
```sql
id uuid primary key default gen_random_uuid(),
document_id uuid not null references waai_documents(id) on delete cascade,
workspace_id uuid not null references waai_workspaces(id) on delete cascade,
agent_id uuid references waai_agents(id),
chunk_index int not null,
content text not null,
embedding vector(1536),
metadata jsonb default '{}',
created_at timestamptz default now()
```

---

## Fase 5 tables

### `waai_whatsapp_connections`
```sql
id uuid primary key default gen_random_uuid(),
workspace_id uuid not null references waai_workspaces(id) on delete cascade,
provider text not null check (provider in ('whapi','meta_cloud','twilio')),
phone_number text,
display_name text,
provider_account_id text,
webhook_secret text,
access_token_encrypted text,
opt_in_confirmed bool not null default false,
status text not null default 'sandbox' check (status in ('sandbox','connected','disconnected','error')),
meta_waba_id text,
meta_phone_number_id text,
templates jsonb default '[]',
created_at timestamptz default now(),
updated_at timestamptz default now()
```

---

## Fase 6 tables

### `waai_leads`
```sql
id uuid primary key default gen_random_uuid(),
workspace_id uuid not null references waai_workspaces(id) on delete cascade,
conversation_id uuid references waai_conversations(id),
name text,
phone text,
email text,
interest text,
budget text,
urgency text,
status text not null default 'new' check (status in ('new','qualified','contacted','won','lost')),
notes text,
created_at timestamptz default now(),
updated_at timestamptz default now()
```
