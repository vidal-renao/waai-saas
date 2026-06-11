# Prompt 06 — Analytics Event Taxonomy

## Existing Event Sources (No New Tables Required)

Analytics for Fase 7 reads from events already stored across Fases 1-6.

### waai_agent_runs (Fase 3)
Events for each Claude LLM invocation:
- `status`: success | error | canceled
- `input_tokens`, `output_tokens`, `total_tokens`
- `estimated_cost_cents`
- `latency_ms`
- `metadata.rag_used`: boolean — set by AgentRuntimeService in Fase 4
- `metadata.rag_chunk_count`: number of retrieved chunks
- `metadata.rag_error`: string if RAG failed

### waai_lead_detection_runs (Fase 6)
Each lead detection attempt:
- `provider`: rule_based | anthropic
- `status`: success | no_lead | error
- `confidence_score`: 0-1 for LLM runs
- `error_message`: if detection failed

### waai_whatsapp_webhook_events (Fase 5)
Each webhook received:
- `processing_status`: received | processing | processed | ignored | failed
- `event_type`

### waai_whatsapp_messages (Fase 5)
Each WhatsApp message:
- `direction`: inbound | outbound
- `delivery_status`: pending | sent | delivered | read | failed | received

### waai_lead_events (Fase 6)
Append-only lead audit trail:
- `event_type`: lead_created | lead_status_changed | lead_assigned | lead_marked_won | lead_marked_lost | lead_updated

### waai_handoffs (Fase 6)
- `status`: requested | active | resolved | canceled
- `trigger_type`: customer_request | low_confidence | angry_customer | urgent_request | sensitive_topic | manual | system_rule
- `created_at`, `resolved_at` (for time-to-resolve)

### waai_knowledge_documents (Fase 4)
- `status`: draft | processing | ready | failed | archived

## Event Taxonomy for Operational Alerts

| Alert Type | Source | Condition |
|---|---|---|
| `active_handoff` | waai_handoffs | status IN ('requested','active') |
| `whatsapp_send_failed` | waai_whatsapp_messages | delivery_status='failed' AND created_at > now()-24h |
| `claude_error` | waai_agent_runs | status='error' AND created_at > now()-24h |
| `knowledge_doc_failed` | waai_knowledge_documents | status='failed' |
| `whatsapp_connection_failed` | waai_whatsapp_connections | status IN ('failed','suspended') |
| `plan_usage_warning` | waai_usage_counters + waai_plans | messages_sent/messages_limit >= 0.8 |
| `plan_usage_critical` | waai_usage_counters + waai_plans | messages_sent/messages_limit >= 0.95 |

## Date Range Presets

| Preset | from | to |
|---|---|---|
| `today` | start of today | now() |
| `7d` | now() - 7 days | now() |
| `30d` | now() - 30 days | now() |
| `month` | start of current month | now() |
| `custom` | user-specified ISO datetime | user-specified ISO datetime |

Default if no preset provided: `30d`.
