# Spec 10 — Chat Sandbox (Fase 3)

## Objetivo

Permitir que un usuario autenticado pruebe un agente creado en Fase 2 antes de conectarlo a WhatsApp.
El sandbox usa el system prompt activo generado por el Agent Builder y llama a Claude API en tiempo real.

---

## User Stories

| ID | Como... | Quiero... | Para... |
|----|---------|-----------|---------|
| US-301 | agent_manager | abrir el sandbox de un agente | probar cómo responde antes de conectarlo a WhatsApp |
| US-302 | agent_manager | escribir un mensaje y recibir respuesta de Claude | verificar que el agente responde correctamente |
| US-303 | agent_manager | ver el historial de la conversación de prueba | entender el flujo completo |
| US-304 | owner/admin | ver runs de Claude con tokens y latencia | controlar costes y rendimiento |
| US-305 | viewer | ver conversaciones pasadas (solo lectura) | auditar el comportamiento del agente |
| US-306 | cualquier usuario | ver aviso si se supera el límite mensual | saber que debo actualizar el plan |
| US-307 | cualquier usuario | ver aviso si falta ANTHROPIC_API_KEY | saber que hay un problema de configuración |

---

## Flujo de interacción

1. Usuario entra en `/dashboard/agents/[agentId]/sandbox`
2. Página carga: agente, configuración, system prompt activo
3. Página muestra aviso si no hay prompt activo o falta API key
4. Al montar el componente chat, se llama POST `/api/agents/[agentId]/sandbox/start` → `conversationId`
5. Usuario escribe mensaje → POST `/api/agents/[agentId]/sandbox/message`
6. Backend: valida permisos → comprueba límite de mensajes → carga agente y prompt → guarda mensaje usuario
7. Backend: llama a `LLMProvider.generateResponse` con historial
8. Backend: guarda respuesta assistant → guarda `waai_agent_runs` → actualiza `last_message_at` → incrementa contador
9. UI muestra respuesta de Claude en el chat
10. Historial crece en la sesión actual

---

## Modelo de datos

### waai_conversations
Representa una conversación entre un usuario y un agente. Puede ser canal `sandbox`, `whatsapp` (Fase 5), etc.

### waai_messages
Mensajes individuales dentro de una conversación. Roles: user, assistant, system, tool. Inmutables (sin UPDATE).

### waai_agent_runs
Registro de cada llamada a Claude: tokens, coste, latencia, status. Append-only.

### waai_sandbox_sessions
Sesión de prueba sandbox: une workspace + agente + conversación + usuario.

---

## Permisos

| Acción | owner | admin | agent_manager | human_agent | viewer |
|--------|-------|-------|---------------|-------------|--------|
| Abrir sandbox | ✓ | ✓ | ✓ | ✓ | ✗ |
| Enviar mensaje | ✓ | ✓ | ✓ | ✓ | ✗ |
| Ver conversaciones | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver runs | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Billing / Límites

- **Antes de llamar a Claude**: comprobar `waai_can_use_message(workspace_id)` → false → error 402
- **Después de respuesta exitosa**: llamar `waai_increment_message_counter(workspace_id)` → incrementa `messages_sent`
- Si el plan es `free`: `messages_limit = 100` (ver seed waai_plans)
- Si el plan es `-1`: ilimitado

---

## Restricciones de Fase 3

No implementar en esta fase:
- WhatsApp real (Fase 5)
- RAG / documentos (Fase 4)
- Lead capture automático
- Streaming de respuestas
- Múltiples workspaces por usuario
- Stripe checkout real
- Human handoff real

---

## Criterios de aceptación

1. Existe documentación específica de Fase 3 (specs, arquitectura, prompts)
2. Existe arquitectura LLM provider documentada (ADR-0004 + doc 17)
3. Existe migración Supabase con waai_conversations, waai_messages, waai_agent_runs, waai_sandbox_sessions
4. Todas las tablas están en schema public
5. Todas las tablas tienen prefijo waai_
6. No existe CREATE SCHEMA en la migración
7. RLS activo en las 4 tablas nuevas
8. No hay cross-workspace access (workspace_id en todas las tablas + RLS)
9. Existe interfaz LLMProvider con generateResponse, getProviderName, getDefaultModel
10. Existe AnthropicClaudeProvider implementando LLMProvider
11. ANTHROPIC_API_KEY no se expone al frontend
12. Existe AgentRuntimeService orquestando el flujo completo
13. Sandbox usa el system prompt activo generado en Fase 2
14. Usuario puede abrir sandbox de un agente desde la página de detalle
15. Usuario puede enviar un mensaje y recibir respuesta
16. Claude responde usando el system prompt del agente
17. La conversación queda guardada en waai_conversations
18. Los mensajes quedan guardados en waai_messages
19. El agent run queda registrado en waai_agent_runs
20. El límite de mensajes se comprueba antes de llamar a Claude
21. Si falta ANTHROPIC_API_KEY, el error es controlado (503 + mensaje UI)
22. Si se supera el límite, error controlado (402 + mensaje UI con upgrade)
23. No se implementó WhatsApp real
24. No se implementó RAG funcional
25. No se implementó lead capture automático
26. Lint pasa con 0 errores
27. Build pasa limpio
