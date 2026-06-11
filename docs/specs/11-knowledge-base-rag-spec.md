# Spec 11 — Knowledge Base + RAG (Fase 4)

## Objetivo

Permitir que cada workspace suba conocimiento del negocio y lo vincule a agentes para que el Chat Sandbox (y futuro WhatsApp) respondan usando recuperación vectorial (RAG) además del system prompt activo.

Antes de Fase 4: `system prompt + historial`
Después de Fase 4: `system prompt + historial + business knowledge (RAG)`

---

## User Stories

| ID | Como... | Quiero... | Para... |
|----|---------|-----------|---------|
| US-401 | owner/admin/agent_manager | crear un documento de conocimiento | añadir información real del negocio |
| US-402 | owner/admin/agent_manager | procesar el documento | generar chunks y embeddings para búsqueda |
| US-403 | owner/admin/agent_manager | vincular documentos a un agente | que el agente use ese conocimiento al responder |
| US-404 | owner/admin/agent_manager | desvincular documentos de un agente | desactivar conocimiento sin eliminarlo |
| US-405 | owner/admin/agent_manager | archivar un documento | retirar conocimiento obsoleto |
| US-406 | viewer/human_agent | ver documentos del workspace | auditar el conocimiento disponible |
| US-407 | cualquier usuario autorizado | ver qué documentos están vinculados a un agente | entender con qué conocimiento responde |
| US-408 | usuario del sandbox | recibir respuestas con conocimiento real | verificar que el RAG funciona antes de conectar WhatsApp |

---

## Flujo de interacción

1. Usuario entra en `/dashboard/knowledge/new`
2. Rellena título, descripción, tipo de fuente, contenido de texto
3. Sistema crea `waai_knowledge_documents` con status `draft`
4. Usuario pulsa "Procesar" → `POST /api/knowledge/documents/[id]/process`
5. Backend: extrae texto → chunkea → genera embeddings → guarda chunks → status `ready`
6. Usuario va a `/dashboard/agents/[agentId]/knowledge`
7. Vincula documento ready al agente → `waai_agent_knowledge_sources`
8. Al siguiente mensaje en sandbox:
   - AgentRuntimeService genera embedding de la query
   - Llama `waai_match_agent_knowledge` → top-5 chunks por cosine similarity
   - Inyecta contexto en el prompt bajo `<business_knowledge>...</business_knowledge>`
   - Claude responde usando ese contexto

---

## Modelo de datos

### waai_knowledge_documents
Almacena documentos de conocimiento del negocio. Source types: `manual`, `txt`, `markdown`, `faq`.

### waai_knowledge_chunks
Fragmentos del documento con embedding vectorial. Append-only (sin UPDATE RLS).

### waai_agent_knowledge_sources
Vínculos entre agentes y documentos. Permite activar/desactivar por vínculo.

### waai_knowledge_events
Log inmutable de eventos sobre el ciclo de vida de documentos y chunks.

---

## Permisos

| Acción | owner | admin | agent_manager | human_agent | viewer |
|--------|-------|-------|---------------|-------------|--------|
| Crear documento | ✓ | ✓ | ✓ | ✗ | ✗ |
| Procesar documento | ✓ | ✓ | ✓ | ✗ | ✗ |
| Archivar documento | ✓ | ✓ | ✗ | ✗ | ✗ |
| Ver documentos | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vincular a agente | ✓ | ✓ | ✓ | ✗ | ✗ |
| Desvincular | ✓ | ✓ | ✓ | ✗ | ✗ |
| Ver vínculos | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Billing / Límites

- **Antes de crear documento**: `waai_can_upload_document(workspace_id)` → false → 402
- Free: 3 documentos, Starter: 10, Pro: 50, Agency: 500, Enterprise: -1 (unlimited)
- Al procesar exitosamente: `waai_increment_document_counter(workspace_id)`
- Archivado no consume slot (no count en `status != 'archived'`)

---

## Restricciones de Fase 4

No implementar en esta fase:
- WhatsApp real (Fase 5)
- lead capture automático
- streaming
- Stripe checkout real
- human handoff real
- PDF parsing (documentado como futura extensión)
- carga de archivos binarios (solo texto paste)

---

## Criterios de aceptación

1. Existe documentación específica de Fase 4 (specs, arquitectura, prompts)
2. Existe arquitectura RAG documentada
3. Existe migración Supabase con 4 tablas de Fase 4
4. La extensión vector está habilitada en la migración
5. Todas las tablas nuevas están en schema public
6. Todas las tablas nuevas tienen prefijo waai_
7. No existe CREATE SCHEMA en la migración
8. RLS activo en todas las tablas nuevas
9. No hay cross-workspace access
10. Existe bucket/documentación de waai-knowledge-documents
11. Existe EmbeddingProvider abstraction
12. Existe OpenAIEmbeddingProvider
13. OPENAI_API_KEY no se expone al frontend
14. Usuario puede crear documento manual
15. Usuario puede procesar documento
16. Se generan chunks
17. Se generan embeddings
18. Se guardan chunks con embeddings
19. Usuario puede vincular documento a agente
20. AgentRuntimeService recupera chunks relevantes antes de Claude
21. Sandbox usa contexto RAG cuando existe
22. Agent run guarda metadata RAG
23. Si no hay contexto relevante, el agente no inventa
24. Si falta OPENAI_API_KEY, error controlado
25. Si supera límite de documentos, error controlado
26. No se implementó WhatsApp real
27. No se implementó lead capture automático
28. No se implementó Stripe checkout real
29. Lint pasa con 0 errores
30. Build pasa limpio
