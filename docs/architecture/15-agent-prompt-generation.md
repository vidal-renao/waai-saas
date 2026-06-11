# Architecture — Agent Prompt Generation (Fase 2)

**Status:** Accepted  
**Date:** 2026-06-07

---

## Objetivo

Definir la estrategia de generación del system prompt para los agentes en Fase 2. En esta fase la generación es local (sin Claude API). En Fase 3 se integrará Claude para refinamiento del prompt.

---

## Componentes

### `src/lib/prompt-builder.ts`
Lógica pura de construcción del prompt. Sin dependencias del servidor. Puede importarse tanto en componentes cliente (para preview) como en servicios servidor.

### `src/server/services/agent-prompt-builder-service.ts`
Servicio servidor que usa `src/lib/prompt-builder.ts` y coordina el guardado de versiones en DB.

---

## Input del prompt builder

```typescript
interface AgentPromptConfig {
  agentName: string;
  businessName: string;
  industry: string;
  primaryLanguage: string;
  tone: string;
  primaryGoal: string;
  targetAudience?: string;
  businessDescription?: string;
  services: string[];
  serviceAreas: string[];
  workingHoursRaw?: string;
  faqs: string[];
  leadCaptureFields: string[];
  handoffRules: string[];
  fallbackMessage: string;
  humanHandoffMessage?: string;
  restrictions: string[];
  openingMessage?: string;
}
```

---

## Estructura del system prompt generado

```
You are {agentName}, the AI WhatsApp assistant for {businessName}.
Industry: {industry}.
About the business: {businessDescription}

Communication:
- Respond in {primaryLanguage}.
- Use a {tone} tone at all times.
- Your audience: {targetAudience}.

Primary goal: {primaryGoal}.

Services offered:
- {service1}
- {service2}

Service areas: {areas}.
Working hours: {workingHoursRaw}.

Frequently asked questions / knowledge base:
- {faq1}
- {faq2}

When a customer expresses interest, collect:
- {field1}
- {field2}

Escalation to a human agent:
Escalate when:
- {rule1}
Before escalating: "{humanHandoffMessage}"

When you don't know the answer:
{fallbackMessage}

Strict restrictions — never:
- {restriction1}

Greeting: "{openingMessage}"

Core guardrails (always apply):
- Never invent prices, availability, or information not provided above.
- Never make medical, legal, or financial claims.
- If you lack information, use the fallback message or ask for clarification.
- Only use information explicitly provided in this system prompt.
- Protect customer privacy — never share personal data.
```

---

## Versionado de prompts

Cada vez que se genera un prompt (en creación o regeneración):

1. Se llama `AgentPromptVersionRepository.getNextVersion(agentId)` → `MAX(version) + 1`
2. Se desactivan versiones anteriores: `UPDATE ... SET is_active = false WHERE agent_id = X`
3. Se inserta nueva versión con `is_active = true`
4. Se registra evento `prompt_generated` en `waai_agent_events`

---

## Campos parseados desde texto plano

El wizard recoge listas como texto (una entrada por línea). El use-case las convierte:

| Campo wizard | Almacenado en DB como |
|---|---|
| `services_raw` | `["Servicio A", "Servicio B"]` |
| `service_areas_raw` | `["Madrid", "Toledo"]` |
| `faqs_raw` | `["FAQ item 1", "FAQ item 2"]` |
| `lead_capture_fields_raw` | `["nombre", "teléfono"]` |
| `handoff_rules_raw` | `["Si el cliente está enfadado"]` |
| `restrictions_raw` | `["No prometer descuentos"]` |
| `working_hours_raw` | `{"raw": "Lunes a Viernes 9:00-18:00"}` |

---

## Evolución futura — Fase 3

En Fase 3 se añadirá:
- Llamada a Claude para refinar y mejorar el prompt generado
- El prompt local de Fase 2 se usará como base (draft)
- Claude añadirá coherencia, ejemplos de conversación, y adaptar el tono
- Se almacenará en una nueva versión marcada con `prompt_metadata.generated_by = 'claude'`
- El `prompt_metadata.model` guardará el modelo de Claude usado
