# Architecture 20 — RAG Retrieval Pipeline (Fase 4)

## Flujo completo

```
User message
     ↓
AgentRuntimeService.processMessage()
     ↓
[nuevo] RagRetrievalService.retrieveContext(workspaceId, agentId, userMessage)
     ↓
EmbeddingProvider.embedText(userMessage)
     ↓
db.rpc("waai_match_agent_knowledge", { query_embedding, agent_id, workspace_id, count=5, threshold=0.75 })
     ↓
RagContext { chunks[], contextText, ragUsed }
     ↓
Build prompt: systemPrompt + ragContext + messages
     ↓
LLMProvider.generateResponse({ systemPrompt, messages })
     ↓
Save agent run with rag_metadata
```

## Parámetros de retrieval

| Parámetro | Valor | Motivo |
|-----------|-------|--------|
| top-K | 5 | Suficiente contexto sin saturar el prompt |
| threshold | 0.75 | Cosine similarity mínima (filtra ruido) |
| Dimensiones | 1536 | text-embedding-3-small |
| Métrica | cosine | Invariante a magnitud, estándar RAG |

## Inyección de contexto

Cuando hay chunks relevantes, el contexto se añade como bloque XML al system prompt:

```
{system_prompt_original}

<business_knowledge>
[Documento: {title}]
{chunk_content}

[Documento: {title}]
{chunk_content}
</business_knowledge>
```

Instrucciones siempre incluidas al modelo:
- Usa el conocimiento del negocio solo si es relevante a la pregunta.
- Si el conocimiento no contiene la respuesta, no inventes.
- Si falta información, pregunta o usa el fallback del system prompt.
- No inventes precios, disponibilidad, garantías ni condiciones no presentes.
- No reveles IDs, embeddings, chunk IDs ni metadatos técnicos al usuario.

## Fallback

Si RagRetrievalService falla (OPENAI_API_KEY ausente, timeout, error de red):
- Se registra el error en `metadata` del `waai_agent_run`
- Se continúa sin contexto RAG
- El sandbox NO se bloquea por fallo de RAG
- `rag_used = false`, `rag_error = "..."` en metadata del run

## Inyección en waai_agent_runs.metadata

```json
{
  "rag_used": true,
  "retrieved_chunks_count": 3,
  "retrieved_document_ids": ["uuid1", "uuid2"],
  "similarity_scores": [0.87, 0.82, 0.78],
  "rag_model": "text-embedding-3-small",
  "rag_latency_ms": 234
}
```

## Chunking strategy

Algoritmo: recursive character splitter.

1. Dividir por párrafos (doble salto de línea).
2. Acumular párrafos hasta llegar a ~2000 chars (≈500 tokens).
3. Overlap: incluir últimos ~200 chars del chunk anterior como prefijo del siguiente.
4. No generar chunks vacíos.
5. Chunk size mínimo: 50 chars.

Token estimator: 1 token ≈ 4 chars (aproximación válida para texto en español/inglés).

## Procesamiento síncrono (MVP)

El ADR-0005 menciona Edge Function para procesamiento asíncrono. En MVP v4.0, el procesamiento es síncrono en el API route `POST /api/knowledge/documents/[id]/process`:

1. `status → processing`
2. Extraer texto (del campo `text_content`)
3. Chunkear
4. Llamar OpenAI embeddings API (batch de chunks)
5. Guardar chunks con embeddings
6. `status → ready`

Límite práctico: documentos hasta ~50,000 chars antes de que el API route haga timeout en Vercel (10s límite serverless). Para documentos grandes, la arquitectura async está documentada en ADR-0005.
