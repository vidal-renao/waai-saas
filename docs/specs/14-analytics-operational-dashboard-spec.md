# Spec 14 — Analytics & Operational Dashboard

## Fase 7 Scope

Provide each workspace with actionable metrics about their WhatsApp AI agents, conversations, leads, handoffs, RAG usage, AI consumption, WhatsApp health, and plan limits — all in a single operational dashboard.

**In scope:**
- Workspace overview with key KPIs
- Conversation metrics by channel and status
- Lead funnel metrics with conversion rates
- Handoff metrics with trigger analysis
- Per-agent performance metrics
- RAG usage and knowledge base health
- AI usage (tokens, cost estimate, latency)
- WhatsApp channel health
- Plan usage vs limits with warnings
- Operational alerts for immediate action
- Date range filtering (today/7d/30d/month/custom)
- Security hardening: human_agent scope restriction + InternalNoteService workspace verification

**Out of scope (Fase 8+):**
- Real-time streaming metrics (WebSocket)
- Custom dashboards / drag-and-drop widgets
- Email/Slack notifications for alerts
- ML-based anomaly detection
- External BI export (CSV/Excel/API)
- Multi-workspace aggregate views
- Historical trend charts with chart library

---

## User Stories

### Overview
- US-7.1: As an **owner/admin**, I can see a workspace overview with total conversations, messages, leads, agents, and open handoffs.
- US-7.2: As any member, I can filter all metrics by date range (today, 7d, 30d, current month, custom).
- US-7.3: As an **owner/admin**, I can see plan usage vs limits with warnings at 80% and 95%.

### Conversations
- US-7.4: As an **owner/admin/agent_manager**, I can see conversation counts by channel (sandbox/whatsapp/web).
- US-7.5: As any member, I can see conversation counts by status (open/closed/handoff_required/archived).
- US-7.6: As any member, I can see total messages and messages by role (user/assistant).

### Leads
- US-7.7: As an **owner/admin/agent_manager**, I can see lead counts by status (new/qualified/contacted/won/lost/archived).
- US-7.8: As any member, I can see lead conversion rate (won / non-archived leads).
- US-7.9: As any member, I can see leads by source channel and priority.

### Handoffs
- US-7.10: As an **owner/admin/agent_manager**, I can see active and resolved handoffs.
- US-7.11: As any member, I can see handoff rate (conversations with handoff / total).
- US-7.12: As any member, I can see handoffs grouped by trigger type.

### Agents
- US-7.13: As an **owner/admin/agent_manager**, I can see per-agent performance: conversations, messages, leads, handoffs, RAG runs, error count.
- US-7.14: As a **human_agent**, I can see performance for conversations assigned to them.

### RAG
- US-7.15: As an **owner/admin/agent_manager**, I can see agent runs with rag_used=true vs total.
- US-7.16: As any member, I can see document health (ready/processing/failed counts).

### AI Usage
- US-7.17: As an **owner/admin**, I can see total agent runs, success/error breakdown, total tokens, estimated cost, and average latency.

### WhatsApp
- US-7.18: As an **owner/admin/agent_manager**, I can see inbound/outbound message counts and failed sends.
- US-7.19: As any member, I can see active connections count and status.

### Operational Alerts
- US-7.20: As any member, I can see operational alerts requiring immediate attention.
- US-7.21: As an **owner/admin**, I receive plan usage warnings when above 80% or 95%.

---

## Metrics — MVP

### 1. Workspace Overview
| Metric | Source |
|---|---|
| total_conversations | waai_conversations |
| total_messages | waai_messages |
| total_leads | waai_leads (non-archived) |
| active_agents | waai_agents WHERE status='active' |
| active_whatsapp_connections | waai_whatsapp_connections WHERE status='active' |
| open_handoffs | waai_handoffs WHERE status IN ('requested','active') |
| open_conversations | waai_conversations WHERE status='open' |

### 2. Conversations
| Metric | Source |
|---|---|
| by_channel | waai_conversations GROUP BY channel |
| by_status | waai_conversations GROUP BY status |
| total_user_messages | waai_messages WHERE role='user' |
| total_assistant_messages | waai_messages WHERE role='assistant' |

### 3. Leads
| Metric | Source |
|---|---|
| by_status | waai_leads GROUP BY status |
| by_priority | waai_leads GROUP BY priority |
| by_source_channel | waai_leads GROUP BY source_channel |
| conversion_rate | won / (total - archived) |
| total_in_period | waai_leads WHERE created_at >= from |

### 4. Handoffs
| Metric | Source |
|---|---|
| active | waai_handoffs WHERE status IN ('requested','active') |
| resolved_in_period | waai_handoffs WHERE status='resolved' AND created_at >= from |
| by_trigger_type | waai_handoffs GROUP BY trigger_type |
| handoff_rate | conversations with handoff / total conversations |

### 5. Agent Performance
| Metric | Source |
|---|---|
| conversations_count | waai_conversations GROUP BY agent_id |
| messages_count | waai_messages GROUP BY agent_id |
| leads_count | waai_leads GROUP BY agent_id |
| handoffs_count | waai_handoffs GROUP BY agent_id |
| rag_runs | waai_agent_runs WHERE metadata->>'rag_used'='true' |
| error_count | waai_agent_runs WHERE status='error' |

### 6. RAG
| Metric | Source |
|---|---|
| rag_used_runs | waai_agent_runs WHERE metadata->>'rag_used'='true' |
| total_runs | waai_agent_runs |
| rag_usage_rate | rag_used_runs / total_runs |
| documents_ready | waai_knowledge_documents WHERE status='ready' |
| documents_processing | waai_knowledge_documents WHERE status='processing' |
| documents_failed | waai_knowledge_documents WHERE status='failed' |

### 7. AI Usage
| Metric | Source |
|---|---|
| total_runs | waai_agent_runs |
| success_runs | WHERE status='success' |
| error_runs | WHERE status='error' |
| total_input_tokens | SUM(input_tokens) |
| total_output_tokens | SUM(output_tokens) |
| total_tokens | SUM(total_tokens) |
| estimated_cost_cents | SUM(estimated_cost_cents) |
| avg_latency_ms | AVG(latency_ms) |

### 8. WhatsApp
| Metric | Source |
|---|---|
| inbound_messages | waai_whatsapp_messages WHERE direction='inbound' |
| outbound_messages | WHERE direction='outbound' |
| failed_outbound | WHERE delivery_status='failed' |
| active_connections | waai_whatsapp_connections WHERE status='active' |
| webhook_processed | waai_whatsapp_webhook_events GROUP BY processing_status |

### 9. Plan Usage
| Metric | Source |
|---|---|
| messages_used | waai_usage_counters (current month) |
| agents_used | COUNT waai_agents active |
| documents_used | COUNT waai_knowledge_documents non-archived |
| connections_used | COUNT waai_whatsapp_connections active |
| members_count | COUNT waai_workspace_members |

### 10. Operational Alerts
| Alert | Severity | Source |
|---|---|---|
| active_handoff | warning | waai_handoffs active |
| whatsapp_send_failed | critical | waai_whatsapp_messages failed (last 24h) |
| claude_error | warning | waai_agent_runs errors (last 24h) |
| knowledge_doc_failed | warning | waai_knowledge_documents failed |
| connection_failed | critical | waai_whatsapp_connections failed/suspended |
| plan_usage_warning | warning/critical | usage >= 80%/95% |

---

## Permissions Matrix

| Action | owner | admin | agent_manager | human_agent | viewer |
|---|---|---|---|---|---|
| View overview | ✓ | ✓ | ✓ | ✓ | ✓ |
| View conversations metrics | ✓ | ✓ | ✓ | ✓* | ✓ |
| View leads metrics | ✓ | ✓ | ✓ | ✓* | ✓ |
| View handoff metrics | ✓ | ✓ | ✓ | ✓* | ✓ |
| View agent performance | ✓ | ✓ | ✓ | limited | ✗ |
| View RAG metrics | ✓ | ✓ | ✓ | ✗ | ✗ |
| View AI usage | ✓ | ✓ | ✗ | ✗ | ✗ |
| View WhatsApp metrics | ✓ | ✓ | ✓ | ✗ | ✗ |
| View plan usage | ✓ | ✓ | ✗ | ✗ | ✗ |
| View operational alerts | ✓ | ✓ | ✓ | ✓ | ✗ |

*human_agent: sees aggregate metrics only, not per-member details

---

## Error Handling

- No workspace → redirect onboarding
- Invalid date range → 400 with Zod error
- Analytics query failure → 500 with generic message, never expose SQL
- Division by zero in rates → return 0 (safe null coalescing)
- Plan limits null / enterprise (−1) → show "Ilimitado"
- Empty workspace → return zeros, no errors
- human_agent accessing restricted metric → 403

---

## Acceptance Criteria

See primary 35-item list in Fase 7 implementation.

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Heavy aggregate queries on large datasets | Date range filters required; indexes on created_at per table |
| Division by zero in conversion rates | Guard with NULLIF or null-coalescing in TypeScript |
| Enterprise plan (-1 limits) showing warnings | Treat -1 as unlimited, skip percentage calculation |
| Human agent accessing sensitive cost data | Role check at API layer + use-case layer |
| Analytics slowing down webhook path | Analytics are read-only, separate DB queries |
| Stale data in views | Views are real-time SQL (no materialized views for MVP) |
