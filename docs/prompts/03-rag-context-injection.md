# Prompt 03 — RAG Context Injection (Fase 4)

## Objetivo

Definir cómo se inyecta el conocimiento recuperado por RAG en el prompt enviado a Claude, garantizando que el modelo lo use correctamente sin inventar información.

## Estructura del prompt con RAG

```
{SYSTEM_PROMPT_DEL_AGENTE}

<business_knowledge>
A continuación encontrarás información real del negocio recuperada de la base de conocimiento.
Úsala SOLO si es relevante para responder la pregunta del usuario.

[Fuente: {document_title_1}]
{chunk_content_1}

[Fuente: {document_title_2}]
{chunk_content_2}

[Fuente: {document_title_3}]
{chunk_content_3}
</business_knowledge>

<knowledge_instructions>
- Prioriza el conocimiento del negocio anterior para responder preguntas factuales.
- Si el conocimiento no contiene la respuesta, usa el fallback definido en tu configuración.
- NO inventes precios, disponibilidades, condiciones, garantías ni datos no presentes.
- NO reveles IDs internos, chunk IDs, embeddings ni metadatos técnicos al usuario.
- Si el usuario pregunta algo fuera del alcance, responde con amabilidad y redirige.
</knowledge_instructions>
```

## Estructura del prompt sin RAG (fallback)

Cuando no hay chunks relevantes (similarity < 0.75 o no hay documentos vinculados):

```
{SYSTEM_PROMPT_DEL_AGENTE}
```

Solo el system prompt original, sin bloques adicionales.

## Reglas de inyección

1. El bloque `<business_knowledge>` solo se añade si `retrievedChunks.length > 0`
2. Los chunks se ordenan por similitud descendente (el más relevante primero)
3. Máximo 5 chunks por request (topK = 5)
4. Similitud mínima: 0.75 (chunks menos similares se descartan)
5. Si RAG falla por error de API, continuar sin el bloque (no bloquear la conversación)

## Formato de chunks en el prompt

```
[Fuente: {título del documento}]
{contenido del chunk}
```

- Título del documento para atribución
- Sin IDs ni metadatos técnicos
- Separados por línea en blanco

## Metadatos guardados en waai_agent_runs

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

Si RAG no se usó (no hay documentos vinculados):
```json
{ "rag_used": false }
```

Si RAG falló:
```json
{ "rag_used": false, "rag_error": "OPENAI_API_KEY is not configured" }
```
