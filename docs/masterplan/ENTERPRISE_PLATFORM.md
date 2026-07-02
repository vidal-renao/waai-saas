# WAAI v3 — Enterprise Platform Design
**Document Type:** Architecture Reference  
**Date:** 2026-06-30  
**Status:** Authoritative

---

## Overview

Enterprise features are the capabilities that allow WAAI to be adopted by organizations with 50–10,000 employees, multiple teams, compliance requirements, and existing identity providers. This document covers the features required to close enterprise deals.

---

## Organizational Hierarchy

### Current State
Single workspace per user. No org layer. No departments. No multi-workspace.

### v3 Target

```
Organization (new: top-level tenant)
├── Enterprise Agreement (billing, custom limits)
├── SSO Configuration (SAML/OIDC)
├── Data Residency (CH / EU / US)
├── Global Policies (org-wide agent rules)
│
├── Department: Customer Service
│   ├── Workspace: Support Tier 1
│   │   ├── Agents, Knowledge, WhatsApp connections
│   │   └── Members: 5 human_agents, 1 agent_manager
│   └── Workspace: Support Tier 2
│
├── Department: Sales
│   └── Workspace: DACH Sales Bot
│
└── Department: Operations
    └── Workspace: Internal HR Bot
```

### DB Migration

```sql
-- New tables (additive, backwards-compatible)
CREATE TABLE waai_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan text not null default 'enterprise',
  sso_config_id uuid,
  data_residency text not null default 'eu'
    check (data_residency in ('ch', 'eu', 'us', 'apac')),
  max_workspaces int,
  max_users int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE waai_departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references waai_organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz default now(),
  UNIQUE(org_id, slug)
);

-- Extend workspaces
ALTER TABLE waai_workspaces
  ADD COLUMN IF NOT EXISTS org_id uuid references waai_organizations(id),
  ADD COLUMN IF NOT EXISTS department_id uuid references waai_departments(id);

-- Organization members (admins who span all workspaces in the org)
CREATE TABLE waai_organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references waai_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('org_owner', 'org_admin', 'dept_admin', 'viewer')),
  department_id uuid references waai_departments(id),  -- null = all departments
  created_at timestamptz default now(),
  UNIQUE(org_id, user_id)
);
```

---

## Identity Features

### 1. SSO — SAML 2.0 / OIDC

**Supported Identity Providers:**
- Microsoft Azure AD / Entra ID
- Google Workspace
- Okta
- OneLogin
- PingIdentity
- Any SAML 2.0 compliant IdP

**Implementation:**
```sql
CREATE TABLE waai_sso_configs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references waai_organizations(id) on delete cascade,
  provider text not null check (provider in ('azure_ad', 'google', 'okta', 'saml_generic', 'oidc_generic')),
  protocol text not null check (protocol in ('saml2', 'oidc')),
  -- SAML fields
  idp_entity_id text,
  idp_sso_url text,
  idp_certificate text,
  sp_entity_id text,
  -- OIDC fields
  client_id text,
  client_secret_encrypted text,
  discovery_url text,
  -- Common
  attribute_mapping jsonb,     -- { "email": "http://schemas...", "name": "..." }
  is_active bool default false,
  created_at timestamptz default now()
);
```

**SSO Flow:**
```
1. User visits waai.ai/login
2. Enters work email → detect org SSO config
3. Redirect to IdP (Azure AD / Okta)
4. IdP authenticates → SAML assertion / OIDC tokens
5. WAAI validates assertion → create/update Supabase user
6. Create workspace member if not exists (JIT provisioning)
7. Redirect to dashboard
```

**Supabase Integration:**
Supabase supports custom SAML providers via Auth → Enterprise SSO. WAAI configures one SSO provider per organization in Supabase Auth settings.

---

### 2. SCIM — Automated Provisioning

SCIM 2.0 enables IdPs (Azure AD, Okta) to automatically create, update, and deactivate users in WAAI.

```
Azure AD SCIM sync
     ↓
POST /api/scim/v2/Users        → create user + workspace member
PATCH /api/scim/v2/Users/{id}  → update name/email/active
DELETE /api/scim/v2/Users/{id} → deactivate (soft delete, archive data)
POST /api/scim/v2/Groups       → create department
PATCH /api/scim/v2/Groups/{id} → sync members
```

```typescript
// src/app/api/scim/v2/Users/route.ts
export async function POST(request: NextRequest) {
  const scimToken = extractBearerToken(request);
  const orgId = await validateSCIMToken(scimToken);  // per-org SCIM token

  const body = await request.json();
  const user = await scimService.provisionUser(orgId, {
    email: body.emails[0].value,
    name: body.displayName,
    departmentId: resolveDepartmentFromGroup(body.groups),
    role: resolveRoleFromScimAttributes(body),
  });

  return Response.json(toSCIMUser(user), { status: 201 });
}
```

---

### 3. Multi-Factor Authentication

```
MFA Options:
├── TOTP (Google Authenticator, Authy) — via Supabase MFA
├── WebAuthn / Passkeys — via Supabase MFA
└── SMS OTP — via Twilio (optional, less secure)

MFA Enforcement Policies:
├── Optional (default for Starter/Pro)
├── Required for admin roles (default for Enterprise)
└── Required for all users (configurable per org)
```

---

### 4. API Keys

```sql
CREATE TABLE waai_api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references waai_workspaces(id) on delete cascade,
  name text not null,                          -- human-readable label
  key_hash text not null unique,               -- SHA-256 of the actual key
  key_prefix text not null,                    -- first 8 chars for display
  scopes jsonb not null default '["messages:write", "agents:read"]',
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
```

**Scopes:**
```
messages:read     — read conversation history
messages:write    — send messages via agent
agents:read       — read agent configurations
agents:write      — create/update agents
knowledge:write   — upload documents
analytics:read    — read analytics data
webhooks:write    — register webhook subscriptions
```

---

## Role-Based Access Control (RBAC) — v3

### Role Hierarchy (expanded)

| Role | Scope | Capabilities |
|---|---|---|
| `platform_owner` | Platform | Full access, all orgs |
| `platform_admin` | Platform | Support access, all orgs |
| `org_owner` | Organization | Full org access, billing |
| `org_admin` | Organization | User management, all workspaces |
| `dept_admin` | Department | All workspaces in department |
| `workspace_owner` | Workspace | Full workspace access |
| `workspace_admin` | Workspace | Agents, members, settings |
| `agent_manager` | Workspace | Agents, knowledge, approvals |
| `human_agent` | Workspace | Conversations, handoffs, approvals |
| `viewer` | Workspace | Read-only |

### Permission Matrix (key capabilities)

| Action | platform | org | dept | ws_owner | ws_admin | agent_mgr | human | viewer |
|---|---|---|---|---|---|---|---|---|
| Manage SSO | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create workspace | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create agent | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Deploy agent | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View conversations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve decisions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Access billing | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export audit log | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Enterprise Agreements

### Custom Pricing
Enterprise customers have negotiated limits outside the standard plan tiers:

```sql
CREATE TABLE waai_enterprise_agreements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references waai_organizations(id) on delete cascade,
  contract_start date not null,
  contract_end date not null,
  custom_limits jsonb not null,    -- override any plan limit
  committed_monthly_spend_cents int,
  overage_rate_cents_per_1k_msgs int,
  dedicated_support bool default false,
  sla_uptime_percentage numeric default 99.5,
  data_processing_agreement_signed bool default false,
  created_at timestamptz default now()
);
```

### Enterprise Features Unlocked
- Custom data residency (Swiss, EU, US)
- Dedicated Supabase instance (optional)
- SLA guarantees with credits
- SCIM provisioning
- SIEM log streaming
- Priority support SLA
- Custom model configuration (GPT-4o, Azure OpenAI)
- Unlimited API rate limits

---

## Data Residency

### Regions
| Region | Supabase | Vercel | Compliance |
|---|---|---|---|
| Switzerland (CH) | eu-central-1 (Frankfurt) | Frankfurt edge | DSG/nDSG, GDPR |
| European Union | eu-west-1 (Ireland/Frankfurt) | EU edge | GDPR |
| United States | us-east-1 | US edge | CCPA, SOC 2 |

### Implementation
- Supabase project per region (separate DB instances)
- Customer org is pinned to a region at creation
- Data never leaves the region without explicit consent
- AI API calls: Anthropic is US-based; for strict CH residency, route through Azure OpenAI in Switzerland North

---

## Compliance Certifications Target

| Certification | Target Phase | Notes |
|---|---|---|
| Swiss DSG/nDSG | ✅ Phase A | Already implemented (RLS, audit logs) |
| GDPR Article 30 | Phase B | Records of processing + DPA template |
| ISO 27001 | Phase F | Security management system |
| SOC 2 Type II | Phase G | 6-month audit window |

---

## Admin Portal

A dedicated org-level admin portal (beyond the workspace dashboard):

```
/admin/
├── /organizations/{org_id}/
│   ├── /members           — user management, role assignment
│   ├── /sso               — SSO configuration
│   ├── /scim              — SCIM token, sync logs
│   ├── /departments       — department management
│   ├── /workspaces        — all workspaces in org
│   ├── /billing           — enterprise agreement, invoices
│   ├── /audit             — org-wide audit log
│   └── /settings          — data residency, MFA policy, API keys
```

Role-gated: only `org_owner` and `org_admin` can access `/admin/`.
