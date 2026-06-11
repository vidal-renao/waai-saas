# Architecture 32 — Operational Dashboard Architecture

## Pages

| Route | Purpose | Access |
|---|---|---|
| `/dashboard/analytics` | Main overview + alerts | all roles |
| `/dashboard/analytics/agents` | Per-agent performance table | owner/admin/agent_manager |
| `/dashboard/analytics/leads` | Lead funnel and conversion | all roles |
| `/dashboard/analytics/usage` | Plan usage + AI cost | owner/admin only |

## API Routes

| Route | Response | Auth |
|---|---|---|
| `GET /api/analytics/overview` | WorkspaceOverviewData | required |
| `GET /api/analytics/agents` | AgentPerformanceData[] | required |
| `GET /api/analytics/leads` | LeadFunnelData | required |
| `GET /api/analytics/channels` | ChannelUsageData | required |
| `GET /api/analytics/usage` | UsageLimitsData | required, owner/admin |
| `GET /api/analytics/alerts` | OperationalAlert[] | required |

Query params accepted by all routes: `from`, `to`, `preset` (today/7d/30d/month/custom).

## Component Hierarchy

```
/dashboard/analytics (page.tsx)
├── OperationalAlertsPanel      ← urgent items (client, auto-refresh optional)
├── MetricCard × 7              ← conversations, messages, leads, agents, handoffs...
├── ChannelUsageCard            ← sandbox/whatsapp/web bars
├── HandoffMetricsCard          ← active/resolved + trigger breakdown
├── RagUsageCard                ← rag_used rate + document health
├── AiUsageCard                 ← tokens, cost, latency
└── AnalyticsDateFilter         ← preset selector (client)

/dashboard/analytics/agents (page.tsx)
└── AgentPerformanceTable       ← sortable table per agent

/dashboard/analytics/leads (page.tsx)
├── LeadFunnelCard              ← status funnel with rates
└── ChannelUsageCard            ← leads by source channel

/dashboard/analytics/usage (page.tsx)
└── UsageLimitCard × 5         ← per-resource progress bars
```

## Data Fetching Pattern

Pages are **Server Components** — they fetch data server-side using use-cases and pass as props to client components. No client-side data fetching for initial load. The `AnalyticsDateFilter` triggers navigation (search params) which causes the server component to re-fetch with new dates.

```
page.tsx (server) → read searchParams → call use-case → pass data to components
```

## Empty States

- Zero metrics → show metric cards with `0` (never break or divide by zero)
- No agents → agent performance table shows empty message
- No WhatsApp connection → WhatsApp card shows "Sin conexión activa"
- Plan limits = -1 → show "Ilimitado" instead of percentage

## Navigation Update

`src/app/(dashboard)/layout.tsx` adds `Analytics` link after `Leads`.

Dashboard home (`/dashboard`) updated to include:
- Compact metrics strip (conversations, leads, active handoffs, open alerts)
- OperationalAlertsPanel (collapsed summary, max 3 items)
