# Architecture 33 — Usage and Cost Metrics

## Plan Limits Model

Plan limits are stored in `waai_plans` and joined via `waai_subscriptions`:

| Field | Type | Description |
|---|---|---|
| `agents_limit` | int | Max active agents. -1 = unlimited |
| `messages_limit` | int | Max messages per month. -1 = unlimited |
| `documents_limit` | int | Max knowledge docs. -1 = unlimited |
| `whatsapp_numbers_limit` | int | Max WhatsApp connections. -1 = unlimited |

Enterprise plan stores -1 for all limits.

## Usage Counters

Monthly usage tracked in `waai_usage_counters`:

| Field | Description |
|---|---|
| `messages_sent` | Incremented by `waai_increment_agent_counter` RPC on each assistant message |
| `documents_uploaded` | Incremented on document create |
| `agents_created` | Incremented on agent create |

`period_month` is ISO format `YYYY-MM` (e.g., `2026-06`).

## Real-time Counts

Some limits need real-time counts (not just counters):

| Resource | Live Count Query |
|---|---|
| Active agents | `COUNT(*) FROM waai_agents WHERE workspace_id=$1 AND status != 'archived'` |
| Active documents | `COUNT(*) FROM waai_knowledge_documents WHERE workspace_id=$1 AND status != 'archived'` |
| Active WhatsApp connections | `COUNT(*) FROM waai_whatsapp_connections WHERE workspace_id=$1 AND status='active'` |
| Workspace members | `COUNT(*) FROM waai_workspace_members WHERE workspace_id=$1` |

## Usage Percentage Calculation

```typescript
function usagePct(used: number, limit: number): number | null {
  if (limit === -1) return null; // unlimited
  if (limit === 0) return 100;   // zero limit, any use = 100%
  return Math.round((used / limit) * 100);
}
```

## Warning Thresholds

| Threshold | Severity | Label |
|---|---|---|
| < 80% | — | Normal (no badge) |
| >= 80% | warning | "Atención: 80% usado" |
| >= 95% | critical | "Crítico: 95% usado" |

## AI Cost Estimation

`waai_agent_runs.estimated_cost_cents` is already calculated by `AnthropicClaudeProvider` at run time. Analytics sums this field for the selected period.

Display: divide by 100 to get USD cents → format as `$X.XX USD` or `€X.XX` based on workspace country.

For MVP: always display in USD cents as a raw estimate label "~$X.XX estimado".

## Members Limit

`waai_plans` does not have a `members_limit` column currently. For MVP, display member count without a limit comparison. Documento como tech debt.
