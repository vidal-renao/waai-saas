# Architecture 19 — Knowledge Base (Fase 4)

## Alcance

La Knowledge Base permite a cada workspace almacenar documentos de conocimiento del negocio y vincularlos a agentes específicos. El sistema procesa los documentos en chunks con embeddings vectoriales para ser recuperados por el pipeline RAG antes de cada respuesta de Claude.

## Capas

```
UI (Next.js pages + components)
  ↓
API Routes (/api/knowledge/*, /api/agents/[id]/knowledge/*)
  ↓
Use Cases (src/server/use-cases/)
  ↓
Services (KnowledgeDocumentService, KnowledgeProcessingService, AgentKnowledgeService)
  ↓
Repositories (KnowledgeDocumentRepo, KnowledgeChunkRepo, AgentKnowledgeSourceRepo, KnowledgeEventRepo)
  ↓
Database (waai_knowledge_documents, waai_knowledge_chunks, waai_agent_knowledge_sources, waai_knowledge_events)
  ↓
Storage (Supabase: waai-knowledge-documents bucket)
```

## Modelo de datos

### waai_knowledge_documents
Principal entidad. Status lifecycle: `draft → processing → ready | failed → archived`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| workspace_id | uuid | FK waai_workspaces |
| uploaded_by | uuid | FK auth.users |
| title | text | requerido |
| description | text | opcional |
| source_type | text | manual/txt/markdown/faq |
| status | text | draft/processing/ready/failed/archived |
| file_name | text | para uploads futuros |
| file_path | text | path en storage |
| mime_type | text | tipo MIME |
| file_size_bytes | bigint | tamaño del archivo |
| text_content | text | contenido extraído |
| metadata | jsonb | datos extra |
| error_message | text | si status = failed |
| created_at | timestamptz | — |
| updated_at | timestamptz | — |

### waai_knowledge_chunks
Chunks individuales con embeddings.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| workspace_id | uuid | FK waai_workspaces |
| document_id | uuid | FK waai_knowledge_documents ON DELETE CASCADE |
| chunk_index | int | orden dentro del documento |
| content | text | texto del chunk |
| token_count | int | estimación |
| embedding | vector(1536) | pgvector |
| embedding_model | text | modelo usado |
| metadata | jsonb | chunk_index, source_type, title, etc. |
| created_at | timestamptz | — |

Constraint: UNIQUE(document_id, chunk_index)

### waai_agent_knowledge_sources
Vínculo entre agente y documento.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| workspace_id | uuid | FK waai_workspaces |
| agent_id | uuid | FK waai_agents |
| document_id | uuid | FK waai_knowledge_documents |
| is_active | boolean | permite desactivar sin desvincular |
| created_by | uuid | FK auth.users |
| created_at | timestamptz | — |

Constraint: UNIQUE(agent_id, document_id)

### waai_knowledge_events
Log append-only del ciclo de vida.

Event types: `document_created`, `document_uploaded`, `document_processing_started`, `document_processed`, `document_failed`, `document_archived`, `document_linked_to_agent`, `document_unlinked_from_agent`, `chunks_generated`, `embeddings_generated`, `retrieval_executed`

## Storage

Bucket: `waai-knowledge-documents` (privado, no público)

Path: `{workspace_id}/{document_id}/{file_name}`

Acceso: solo server-side mediante service role o signed URLs temporales.

En MVP v4.0: el contenido se pega directamente en `text_content`. El bucket está documentado y disponible para uploads de archivos en Fase 6+.

## Índices

- `idx_waai_knowledge_documents_workspace_id` — lookup por workspace
- `idx_waai_knowledge_documents_status` — filtrar por estado
- `idx_waai_knowledge_chunks_workspace_id` — lookup por workspace
- `idx_waai_knowledge_chunks_document_id` — chunks de un documento
- `idx_waai_agent_knowledge_sources_agent_id` — fuentes de un agente
- `idx_waai_agent_knowledge_sources_workspace_id` — fuentes del workspace
- `idx_waai_knowledge_chunks_embedding` — ivfflat cosine, lists=100

## SQL Functions

| Función | Tipo | Propósito |
|---------|------|-----------|
| waai_can_upload_document | STABLE SECURITY DEFINER | check límite de docs del plan |
| waai_get_document_count | STABLE SECURITY DEFINER | cuenta docs no archivados |
| waai_increment_document_counter | SECURITY DEFINER | incrementa contador mensual |
| waai_match_agent_knowledge | STABLE SECURITY DEFINER | búsqueda vectorial top-K |
| waai_log_knowledge_event | SECURITY DEFINER | inserta knowledge event |
