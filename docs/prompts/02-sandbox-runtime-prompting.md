# Prompts 02 — Sandbox Runtime Prompting

## Contexto

El sandbox usa el system prompt activo del agente (generado en Fase 2 por `buildSystemPrompt`)
para llamar a Claude API. No genera un nuevo prompt — reutiliza el ya guardado en
`waai_agent_prompt_versions` donde `is_active = true`.

---

## Estructura de llamada a Claude (Fase 3)

```
POST https://api.anthropic.com/v1/messages

{
  "model": "$ANTHROPIC_MODEL",
  "max_tokens": 1024,
  "system": "<contenido de waai_agent_prompt_versions.system_prompt>",
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." },
    { "role": "user", "content": "<último mensaje del usuario>" }
  ]
}
```

## System prompt

El `system` field se pasa directamente desde `activePrompt.system_prompt` (string en DB).
No se modifica en runtime. La única transformación ocurre en `buildSystemPrompt` (Fase 2).

---

## Historial de mensajes

- Se cargan los últimos **20 mensajes** de la conversación (`findByConversation(id, 20)`)
- Solo roles `user` y `assistant` se incluyen en el array `messages`
- Roles `system` y `tool` se filtran
- El usuario puede ver historial completo en la UI pero Claude solo recibe los últimos 20

### Límite de contexto

Claude Haiku 4.5 soporta 200 000 tokens de contexto. Con mensajes de texto corto,
20 mensajes son ~2 000-5 000 tokens — muy por debajo del límite.
Si en fases futuras se añade RAG, habrá que gestionar el context window explícitamente.

---

## Parámetros de llamada (Fase 3 MVP)

| Parámetro | Valor | Configurable |
|-----------|-------|--------------|
| model | $ANTHROPIC_MODEL (env) | sí |
| max_tokens | 1024 | no (hardcoded MVP) |
| temperature | no se pasa | default del API |
| stream | false | no en MVP |

---

## Manejo de errores

| Error | Acción |
|-------|--------|
| ANTHROPIC_API_KEY no definida | No instanciar provider; retornar código NO_API_KEY |
| Error de red / timeout (30s) | Catch → guardar run status=error → retornar CLAUDE_ERROR |
| Error 401 Unauthorized | Catch → guardar run status=error → retornar CLAUDE_ERROR |
| Error 429 Rate limit | Catch → guardar run status=error → retornar CLAUDE_ERROR |
| Error 5xx Anthropic | Catch → guardar run status=error → retornar CLAUDE_ERROR |

En ningún caso se expone el stack trace ni el mensaje de error crudo al usuario.

---

## Evolución futura

| Fase | Cambio |
|------|--------|
| Fase 4 | Añadir contexto RAG al system prompt o como bloque `user` antes del mensaje |
| Fase 5 | WhatsApp usa el mismo `AgentRuntimeService` con `channel='whatsapp'` |
| Fase 6 | Streaming: `provider.streamResponse()` + SSE al cliente |
| Fase 7 | Analytics de tokens y coste estimado por workspace |
