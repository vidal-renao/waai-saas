# Architecture 34 — Agent Performance Metrics

## Per-Agent Metrics

Each agent in the workspace has aggregated performance metrics computed over the selected date range:

| Metric | Query | Notes |
|---|---|---|
| `conversations_count` | COUNT from waai_conversations by agent_id | All channels |
| `messages_count` | COUNT from waai_messages by agent_id | user + assistant |
| `user_messages` | WHERE role='user' | Inbound message count |
| `assistant_messages` | WHERE role='assistant' | Outbound AI responses |
| `leads_count` | COUNT from waai_leads by agent_id | Non-archived |
| `handoffs_count` | COUNT from waai_handoffs by agent_id | All statuses |
| `rag_runs` | COUNT from waai_agent_runs WHERE metadata->>'rag_used'='true' | RAG-assisted replies |
| `total_runs` | COUNT from waai_agent_runs | All Claude invocations |
| `error_count` | COUNT WHERE status='error' | Failed Claude calls |
| `avg_latency_ms` | AVG(latency_ms) | Average response time |

## Agent Status Context

Each agent row in the performance table also shows:
- Agent name + status badge (active/paused/draft/archived)
- Primary language
- Channel (whatsapp/sandbox/web)

## Derived Rates

| Rate | Formula | Notes |
|---|---|---|
| `rag_usage_rate` | rag_runs / total_runs | % of runs that used RAG |
| `error_rate` | error_count / total_runs | % of failed Claude calls |
| `lead_conversion` | N/A at agent level | Available at workspace level |
| `handoff_rate` | handoffs / conversations | % conversations that needed handoff |

## Data Source

Agent performance is computed by the `waai_get_agent_performance` RPC, which returns one row per agent using a lateral join pattern:

```sql
SELECT
  a.id, a.name, a.status, a.primary_language,
  COALESCE(c.cnt, 0) as conversations_count,
  COALESCE(m.cnt, 0) as messages_count,
  COALESCE(l.cnt, 0) as leads_count,
  COALESCE(h.cnt, 0) as handoffs_count,
  COALESCE(r.rag_cnt, 0) as rag_runs,
  COALESCE(r.total_cnt, 0) as total_runs,
  COALESCE(r.error_cnt, 0) as error_count,
  r.avg_latency_ms
FROM waai_agents a
LEFT JOIN LATERAL (SELECT COUNT(*) cnt FROM waai_conversations ...) c ON true
LEFT JOIN LATERAL (SELECT COUNT(*) cnt FROM waai_messages ...) m ON true
...
WHERE a.workspace_id = p_workspace_id
```

## Access Control

- owner/admin: see all agents
- agent_manager: see all agents in workspace
- human_agent: sees only aggregates, not per-agent breakdown
- viewer: no access to agent performance page
