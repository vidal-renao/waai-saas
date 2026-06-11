# Spec — Fase 2: Agent Builder

**Status:** Accepted  
**Date:** 2026-06-07  
**Author:** Vidal Reñao Lopelo  
**Phase:** 2

---

## Objetivo

Construir el módulo principal del producto: un Agent Builder que permita a cada workspace crear, configurar y gestionar agentes inteligentes de WhatsApp. Al finalizar esta fase, el usuario puede crear un agente mediante un wizard de 5 pasos, configurarlo completamente, y obtener un system prompt base generado de forma local (sin Claude API real).

---

## User Stories

### US-201 — Listado de agentes
**Como** usuario con workspace,  
**quiero** ver la lista de mis agentes,  
**para** gestionar los agentes de mi empresa.

**Criterios de aceptación:**
- `/dashboard/agents` muestra todos los agentes del workspace
- Se muestra el estado de cada agente (draft, active, paused, archived)
- Se muestra el número de agentes usados vs el límite del plan
- CTA para crear nuevo agente si hay capacidad disponible
- Si el límite está alcanzado, mostrar advertencia y enlace para actualizar plan

### US-202 — Crear agente mediante wizard
**Como** usuario con rol owner/admin/agent_manager,  
**quiero** crear un agente mediante un wizard de configuración,  
**para** configurar el comportamiento de mi agente de WhatsApp.

**Criterios de aceptación:**
- Wizard de 5 pasos con indicador de progreso
- Validación Zod por paso (no se avanza sin completar los campos requeridos)
- Los datos se acumulan entre pasos
- Paso 5 genera una vista previa del system prompt (cliente, sin Claude)
- Al crear el agente: se guardan waai_agents + waai_agent_configs + waai_agent_prompt_versions
- Se registra evento `agent_created`, `wizard_completed`, `prompt_generated`
- Se incrementa el contador `agents_created` en waai_usage_counters
- Se crea entrada en waai_audit_logs
- Redirect a `/dashboard/agents/[agentId]` al completar

### US-203 — Verificación de límites antes de crear
**Como** plataforma,  
**quiero** verificar el límite de agentes del plan antes de permitir crear,  
**para** respetar las restricciones del plan activo.

**Criterios de aceptación:**
- Antes de crear: contar agentes no archivados del workspace
- Si count >= agents_limit (y agents_limit != -1): retornar error 402
- La UI muestra mensaje claro con enlace para actualizar plan
- Los planes con agents_limit = -1 no tienen restricción

### US-204 — Ver detalle de agente
**Como** usuario del workspace,  
**quiero** ver el detalle de un agente,  
**para** revisar su configuración y system prompt.

**Criterios de aceptación:**
- `/dashboard/agents/[agentId]` muestra el agente con su config
- Muestra el estado del agente con badge de color
- Muestra el system prompt de la versión activa
- Botones para editar configuración y regenerar prompt
- Sólo miembros del workspace pueden ver sus agentes

### US-205 — Editar configuración de agente
**Como** usuario con rol owner/admin/agent_manager,  
**quiero** editar la configuración de un agente existente,  
**para** actualizar el comportamiento del agente.

**Criterios de aceptación:**
- `/dashboard/agents/[agentId]/edit` muestra el formulario de configuración
- Se pre-rellena con la configuración actual
- Al guardar: actualiza waai_agent_configs
- Permite regenerar el system prompt tras guardar
- human_agent y viewer no pueden editar

### US-206 — Archivar agente
**Como** usuario con rol owner/admin,  
**quiero** archivar un agente,  
**para** desactivarlo sin eliminarlo permanentemente.

**Criterios de aceptación:**
- Botón "Archivar" en el detalle del agente
- Solo owner/admin pueden archivar
- El agente queda con status = 'archived'
- Ya no cuenta para el límite de agentes activos
- Se registra evento `agent_archived`

### US-207 — Ver y regenerar system prompt
**Como** usuario con rol owner/admin/agent_manager,  
**quiero** ver el historial de versiones del system prompt,  
**para** auditar cambios y regenerar si es necesario.

**Criterios de aceptación:**
- `/dashboard/agents/[agentId]/prompt` muestra todas las versiones
- Indica cuál es la versión activa
- Botón "Regenerar prompt" crea nueva versión
- Cada regeneración desactiva versiones anteriores y crea nueva
- human_agent y viewer solo pueden leer

---

## Wizard — 5 pasos

### Paso 1 — Identidad del negocio
Campos: `name` (agente), `business_name`, `industry`, `business_description`, `country`, `city`

### Paso 2 — Estilo de comunicación
Campos: `primary_language`, `tone`, `target_audience`, `opening_message`

### Paso 3 — Servicios y disponibilidad
Campos: `services_raw`, `service_areas_raw`, `working_hours_raw`

### Paso 4 — Lead capture y handoff
Campos: `primary_goal`, `lead_capture_fields_raw`, `handoff_rules_raw`, `human_handoff_message`

### Paso 5 — Seguridad y vista previa
Campos: `faqs_raw`, `fallback_message`, `restrictions_raw`  
Acción: Generar vista previa del system prompt (client-side)  
Acción: Guardar agente (POST /api/agents)

---

## Modelo de datos

Ver `docs/specs/data-model.md` — tablas Fase 2:
- `waai_agents`
- `waai_agent_configs`
- `waai_agent_questions`
- `waai_agent_prompt_versions`
- `waai_agent_events`

---

## Permisos por rol

| Acción | owner | admin | agent_manager | human_agent | viewer |
|--------|-------|-------|---------------|-------------|--------|
| Ver lista | ✓ | ✓ | ✓ | ✓ | ✓ |
| Crear agente | ✓ | ✓ | ✓ | ✗ | ✗ |
| Editar config | ✓ | ✓ | ✓ | ✗ | ✗ |
| Activar/Pausar | ✓ | ✓ | ✓ | ✗ | ✗ |
| Archivar | ✓ | ✓ | ✗ | ✗ | ✗ |
| Ver prompt | ✓ | ✓ | ✓ | ✓ | ✓ |
| Regenerar prompt | ✓ | ✓ | ✓ | ✗ | ✗ |

---

## Relación con billing limits

- Antes de crear un agente: `BillingService.checkAgentLimitForWorkspace(workspaceId)`
- Se cuenta el número de agentes con status != 'archived'
- Si `count >= plan.agents_limit` y `plan.agents_limit != -1`: error 402
- Al crear correctamente: incrementar `agents_created` en `waai_usage_counters`

---

## Relación futura con sandbox Claude (Fase 3)

- El `system_prompt` generado en Fase 2 será el input para el sandbox de Claude en Fase 3
- La tabla `waai_agent_prompt_versions` ya tiene `is_active` para saber qué versión usar
- El `prompt_metadata` almacenará parámetros de generación cuando se integre Claude

---

## Relación futura con WhatsApp (Fase 5)

- El agente (`waai_agents`) tendrá un `whatsapp_number_id` cuando se conecte en Fase 5
- El campo `channel = 'whatsapp'` ya está preparado para multi-canal futuro
- El `primary_language` se pasará al sistema de respuestas en Fase 5

---

## Criterios de aceptación globales

1. Documentación de Fase 2 creada y coherente con implementación
2. Migración Supabase creada para 5 tablas nuevas
3. Todas las tablas en schema public con prefijo waai_
4. RLS activo en todas las tablas nuevas
5. No hay acceso cruzado entre workspaces
6. El usuario puede listar agentes en /dashboard/agents
7. El usuario puede crear agente mediante wizard de 5 pasos
8. Se verifica límite de agentes antes de crear
9. Si supera límite → UI muestra warning controlado, no crea
10. El agente queda vinculado al workspace activo del usuario
11. La configuración queda guardada en waai_agent_configs
12. Se genera system prompt local (sin Claude API)
13. Se guarda una versión en waai_agent_prompt_versions
14. El prompt preview se puede ver en /dashboard/agents/[agentId]/prompt
15. El dashboard principal muestra CTA y agentes
16. Se registran agent events en waai_agent_events
17. Se crea audit log en waai_audit_logs
18. No se implementó Claude API real
19. No se implementó WhatsApp real
20. No se implementó RAG funcional
21. Lint pasa 0 errores
22. Build pasa sin warnings

---

## Restricciones de Fase 2

- NO llamar Claude API
- NO integrar WhatsApp real
- NO implementar RAG
- NO implementar Stripe checkout real
- NO implementar conversaciones/mensajes reales
- NO implementar sandbox de prueba real (Fase 3)
