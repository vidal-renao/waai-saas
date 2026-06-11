# Architecture 38 — AI Cost Control

## Objetivo

Estimar y registrar el coste de las ejecuciones de IA para visibilidad operativa y futuro límite de gasto.

## Principios

1. **Sin llamadas externas.** `AiCostService` usa tabla de precios local.
2. **Aproximado y documentado.** Precios pueden variar; se indican como referencia.
3. **Granularidad por run.** `waai_agent_runs.estimated_cost_cents` ya existe en schema.
4. **Snapshots periódicos.** `waai_ai_cost_snapshots` agrega costes por período.
5. **No bloquea operaciones.** Si el coste no se puede estimar, se usa `null` (no error).

## AiCostService

```typescript
interface CostEstimate {
  estimated_cost_cents: number; // entero, fracciones redondeadas arriba
  model: string;
  input_tokens: number;
  output_tokens: number;
}

class AiCostService {
  estimateCost(model: string, inputTokens: number, outputTokens: number): CostEstimate
  getPricingTable(): Record<string, ModelPricing>
}
```

## Tabla de Precios (Aproximada, Junio 2026)

Precios en USD por millón de tokens (MTok). Convertidos a cents/token:

| Modelo | Input $/MTok | Output $/MTok | Input cents/tok | Output cents/tok |
|--------|-------------|---------------|-----------------|------------------|
| `claude-haiku-4-5-20251001` | $0.80 | $4.00 | 0.000080 | 0.000400 |
| `claude-sonnet-4-6` | $3.00 | $15.00 | 0.000300 | 0.001500 |
| `claude-opus-4-7` | $15.00 | $75.00 | 0.001500 | 0.007500 |
| `text-embedding-3-small` | $0.02 | — | 0.000002 | — |
| `text-embedding-3-large` | $0.13 | — | 0.000013 | — |
| fallback / unknown | $0 | $0 | 0 | 0 |

**IMPORTANTE**: Precios son aproximados. Verificar en https://www.anthropic.com/pricing antes de usar para facturación real.

## Cálculo

```
estimated_cost_cents = ceil(inputTokens * inputCentsPerToken + outputTokens * outputCentsPerToken)
```

Ejemplo: Haiku, 500 input tokens, 200 output tokens:
```
= ceil(500 * 0.000080 + 200 * 0.000400)
= ceil(0.040 + 0.080)
= ceil(0.120)
= 1 centavo
```

Mínimo: `0` si tokens = 0.

## Integración con AgentRunService

```typescript
// En agent-run-service.ts al guardar un run:
const costEstimate = aiCostService.estimateCost(model, inputTokens, outputTokens);
await agentRunRepo.updateCost(runId, costEstimate.estimated_cost_cents);
```

`waai_agent_runs.estimated_cost_cents` ya está en el schema (Fase 3). Si `null`, se puede rellenar retroactivamente via SQL.

## waai_ai_cost_snapshots

Tabla para snapshots de coste agregados por período:

```sql
waai_ai_cost_snapshots (
  id, workspace_id,
  period_start date, period_end date,
  provider,          -- 'anthropic' | 'openai'
  model,
  total_runs integer,
  total_input_tokens integer,
  total_output_tokens integer,
  estimated_cost_cents integer,
  metadata jsonb,
  created_at
)
```

### Cómo se Genera un Snapshot

En Fase 8: manual (via API interna o SQL directo).
En Fase 9: cron job diario que agrega `waai_agent_runs` del período anterior.

```sql
-- Snapshot diario manual:
INSERT INTO waai_ai_cost_snapshots (workspace_id, period_start, period_end, provider, model, ...)
SELECT workspace_id, CURRENT_DATE - 1, CURRENT_DATE,
       provider, model,
       COUNT(*), SUM(input_tokens), SUM(output_tokens), SUM(estimated_cost_cents)
FROM waai_agent_runs
WHERE created_at >= CURRENT_DATE - 1 AND created_at < CURRENT_DATE
GROUP BY workspace_id, provider, model;
```

## RPC waai_get_ai_cost_snapshot

```sql
FUNCTION waai_get_ai_cost_snapshot(p_workspace_id uuid, p_from date, p_to date)
RETURNS jsonb
```

Agrega desde `waai_agent_runs` en tiempo real para el período solicitado. No requiere snapshots previos.

## API de Costes

```
GET /api/billing/costs?preset=30d
```

Devuelve:
```json
{
  "total_runs": 450,
  "total_input_tokens": 125000,
  "total_output_tokens": 45000,
  "estimated_cost_cents": 187,
  "by_model": [
    { "model": "claude-haiku-4-5-20251001", "runs": 400, "cost_cents": 120 },
    { "model": "claude-sonnet-4-6", "runs": 50, "cost_cents": 67 }
  ],
  "period": { "from": "...", "to": "..." }
}
```

## Variables de Entorno

No requiere variables adicionales. El pricing está hardcodeado en `AiCostService` como constantes documentadas.

Si en el futuro se quiere pricing dinámico:
```env
AI_PRICING_OVERRIDE={"claude-haiku-4-5-20251001":{"input":0.0001,"output":0.0005}}
```
