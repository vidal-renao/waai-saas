# Architecture 18 — Conversation Storage

## Tablas

### waai_conversations
Representa una sesión de conversación entre un usuario y un agente.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| workspace_id | uuid | FK waai_workspaces — aislamiento RLS |
| agent_id | uuid | FK waai_agents |
| channel | text | 'sandbox' | 'whatsapp' | 'web' |
| external_conversation_id | text | null en sandbox; usado en WhatsApp (Fase 5) |
| status | text | open / closed / handoff_required / archived |
| title | text | para mostrar en lista |
| last_message_at | timestamptz | actualizado vía waai_update_conversation_last_message |
| created_by | uuid | FK auth.users |
| created_at / updated_at | timestamptz | timestamps estándar |

### waai_messages
Mensajes individuales. **Inmutables** (no UPDATE en RLS ni en la capa de repositorio).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| conversation_id | uuid | FK waai_conversations |
| workspace_id | uuid | FK waai_workspaces — aislamiento RLS |
| agent_id | uuid | FK waai_agents — puede ser null si no hay agente activo |
| role | text | user / assistant / system / tool |
| content | text | texto del mensaje |
| channel | text | mirror de conversation.channel |
| provider_message_id | text | ID devuelto por Anthropic (rawMetadata.id) |
| metadata | jsonb | tokens, model, latency, etc. |
| created_at | timestamptz | solo insertar, no actualizar |

### waai_agent_runs
Registro de cada llamada al LLM. **Append-only**.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| workspace_id / agent_id | uuid | FKs |
| conversation_id | uuid | FK waai_conversations (puede ser null si se borra conv) |
| prompt_version_id | uuid | FK waai_agent_prompt_versions |
| provider | text | 'anthropic' |
| model | text | modelo efectivamente usado |
| input_tokens / output_tokens / total_tokens | integer | de usage API |
| estimated_cost_cents | integer | null en MVP; calculable en Fase 6 |
| status | text | success / error / canceled |
| error_message | text | null si success |
| latency_ms | integer | tiempo total desde llamada hasta respuesta |
| metadata | jsonb | rawMetadata del provider |
| created_at | timestamptz | solo insertar |

### waai_sandbox_sessions
Sesión de prueba. Vincula workspace + agente + conversación + usuario creador.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| workspace_id | uuid | FK waai_workspaces |
| agent_id | uuid | FK waai_agents |
| conversation_id | uuid | FK waai_conversations |
| created_by | uuid | FK auth.users |
| created_at / updated_at | timestamptz | timestamps estándar |

---

## Funciones SQL

| Función | Tipo | Propósito |
|---------|------|-----------|
| waai_get_conversation_workspace(p_conversation_id) | SECURITY DEFINER | Devuelve workspace_id de una conversación — para queries cruzadas |
| waai_update_conversation_last_message(p_conversation_id) | SECURITY DEFINER | Actualiza last_message_at y updated_at atómicamente |
| waai_can_use_message(p_workspace_id) | SECURITY DEFINER | Comprueba límite mensual de mensajes vs plan |

---

## Crecimiento esperado de datos

| Tabla | Volumen esperado (sandbox MVP) |
|-------|-------------------------------|
| waai_conversations | ~10 por agente por usuario |
| waai_messages | ~50-200 por conversación |
| waai_agent_runs | 1 por mensaje assistant exitoso |
| waai_sandbox_sessions | 1 por página load del sandbox |

---

## Índices

```sql
idx_waai_conversations_workspace_id
idx_waai_conversations_agent_id
idx_waai_messages_conversation_id
idx_waai_messages_workspace_id
idx_waai_agent_runs_workspace_id
idx_waai_agent_runs_conversation_id
idx_waai_sandbox_sessions_workspace_id
```

---

## Retención y limpieza (Fase futura)

- Conversaciones `archived`: candidatas a limpieza tras 90 días
- `waai_agent_runs`: mantener indefinidamente para analytics
- `waai_messages`: mantener para auditoría; comprimir si > 1M filas por workspace
