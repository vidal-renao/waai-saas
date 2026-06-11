# ADR-0005 — Embedding Model and RAG Strategy

**Status:** Accepted  
**Date:** 2026-06-07  
**Author:** Vidal Reñao Lopelo

---

## Context

The Knowledge Base feature requires converting business documents (PDF, TXT, MD) into searchable vector representations so the LLM agent can retrieve relevant context before responding. Decisions needed: embedding model, chunk size, retrieval strategy, and pgvector index type.

## Decision

### Embedding model

**`text-embedding-3-small` (OpenAI)** — 1536 dimensions, $0.02/1M tokens.

**Why not a Claude embedding model:** Anthropic does not currently offer a public embedding API. OpenAI's `text-embedding-3-small` is the best price/quality ratio available.

**Fallback:** If OpenAI is unavailable, `all-MiniLM-L6-v2` via a self-hosted endpoint. Not needed for MVP.

Embedding calls are isolated in `src/lib/rag/embeddings.ts` behind an `EmbeddingProvider` interface to allow future swaps.

### Chunking strategy

| Parameter | Value | Reason |
|---|---|---|
| Chunk size | 500 tokens | Fits comfortably in context window for retrieval |
| Chunk overlap | 50 tokens | Preserves sentence continuity across boundaries |
| Splitting method | Recursive character splitter (newline → sentence → word) | Respects document structure |
| Metadata stored | `document_id`, `chunk_index`, `source_title`, `page` | Enables source attribution |

### Vector storage

- **pgvector extension** in Supabase PostgreSQL
- **Table:** `waai_document_chunks` with column `embedding vector(1536)`
- **Index:** `ivfflat` with `lists = 100` for up to ~1M chunks
- **Distance metric:** cosine similarity (`<=>`)

### Retrieval strategy

1. Embed the incoming user message.
2. Run similarity search: top-5 chunks with `cosine_similarity > 0.75`.
3. Inject retrieved chunks into the agent's system prompt under `{{retrieved_knowledge}}`.
4. Include source attribution in the response if a chunk was used.

### Document processing pipeline

```
Upload → Extract text (pdf-parse / raw read) → Split into chunks → Embed each chunk → Store in waai_document_chunks
```

Processing is **asynchronous** via a Supabase Edge Function triggered on document insert. Status tracked in `waai_documents.status` (`uploaded → processing → ready | failed`).

## Consequences

- **Positive:** pgvector keeps everything in one database — no extra vector DB service.
- **Positive:** 500-token chunks fit well in WhatsApp-length context windows.
- **Negative:** OpenAI dependency for embeddings. Mitigated by the abstraction interface.
- **Negative:** `ivfflat` requires an approximate search — exact results not guaranteed. Acceptable for FAQ/document retrieval use case.

## Related ADRs

- [ADR-0004](ADR-0004-llm-provider-abstraction.md) — LLM provider abstraction
