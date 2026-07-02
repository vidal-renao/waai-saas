# WAAI v3 — Scalability Plan
**Document Type:** Architecture Reference  
**Date:** 2026-06-30  
**Status:** Authoritative

---

## Design Principle

Scale the system to handle the next order of magnitude before hitting the ceiling of the current one. The current architecture (Vercel + Supabase + pgvector) can handle 1,000 customers without structural changes. Plan architectural interventions in advance, not in response to production crises.

---

## Scale Tier 1 — 10 Customers (Current)

**Infrastructure:** Supabase Free/Pro, Vercel Hobby/Pro  
**Architecture:** Current monolith — perfect as-is  
**Bottlenecks:** None at this scale

**Action:** Fix the P0 blockers (Stripe, Meta, headers). No scalability work needed.

**Metrics:**
- ~100–1,000 messages/day
- < 100 DB connections at any time
- Vercel serverless: handles bursts trivially

---

## Scale Tier 2 — 100 Customers

**Infrastructure:** Supabase Pro ($25/mo), Vercel Pro  
**Architecture:** Add connection pooler

**Bottleneck:** Supabase default: 60 concurrent DB connections. At 100 customers with bursts, this is the first ceiling.

**Solution:** Enable Supabase PgBouncer (built into Supabase Pro):
```
Transaction mode pooling
Max client connections: 1,000
Pool size: 20 per Vercel region
```

**No code changes required** — connection string changes from `:5432` to `:6543`.

**Added monitoring:**
- Supabase dashboard: connection pool utilization
- Vercel: function invocation count
- Sentry: error rate

**Metrics:**
- ~1,000–10,000 messages/day
- pgvector index: < 10k vectors (trivially fast)

---

## Scale Tier 3 — 1,000 Customers

**Infrastructure:** Supabase Pro + read replica, Vercel Pro, Inngest (queue)  
**Architecture:** Async execution, read replicas for analytics

**Bottlenecks at this scale:**
1. WhatsApp webhooks: synchronous processing blocks Vercel function timeout
2. Embedding generation on document upload: long-running, blocks HTTP response
3. Analytics queries: heavy aggregations on write DB
4. pgvector: IVFFlat rebuild becomes slow at > 500k vectors

**Solutions:**

### 1. Async Webhook Processing (Inngest)

```typescript
// Webhook receives → enqueues job → returns 200 immediately
export async function POST(request: NextRequest) {
  const payload = await request.text();
  // Verify signature
  await inngest.send({ name: 'webhook/whatsapp', data: { payload, headers } });
  return new Response('ok', { status: 200 });  // < 100ms response
}

// Inngest function processes asynchronously
export const processWebhook = inngest.createFunction(
  { id: 'process-whatsapp-webhook', retries: 3 },
  { event: 'webhook/whatsapp' },
  async ({ event }) => {
    await whatsappWebhookService.processWebhook(event.data);
  }
);
```

### 2. Background Document Processing

```typescript
// Upload returns job_id immediately
const job = await inngest.send({ name: 'knowledge/process-document', data: { documentId } });
return Response.json({ documentId, jobId: job.ids[0], status: 'processing' });

// Client polls /api/knowledge/documents/{id}/status
```

### 3. Supabase Read Replica for Analytics

```typescript
// src/lib/supabase/analytics-client.ts
export function createAnalyticsClient() {
  return createClient(
    process.env.SUPABASE_ANALYTICS_URL!,   // read replica URL
    process.env.SUPABASE_ANON_KEY!,
  );
}
// Analytics routes use this client instead of write DB
```

### 4. HNSW Index (replace IVFFlat)

```sql
-- At ~100k vectors, switch from IVFFlat to HNSW
CREATE INDEX CONCURRENTLY idx_knowledge_chunks_hnsw
  ON public.waai_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
DROP INDEX CONCURRENTLY idx_waai_knowledge_chunks_embedding;
```

**Metrics:**
- ~10,000–100,000 messages/day
- 100k–1M vectors in pgvector
- Inngest handles 10k+ jobs/day

---

## Scale Tier 4 — 10,000 Customers

**Infrastructure:** Supabase Scale ($599+/mo), Vercel Enterprise, dedicated queue workers  
**Architecture:** Tenant sharding strategy, caching layer, search separation

**Bottlenecks at this scale:**
1. Single Supabase instance: write throughput ceiling (~5,000 writes/sec)
2. RLS policy evaluation: becomes expensive at this scale
3. Vector search: > 10M vectors, HNSW needs dedicated search service
4. AI cost: Anthropic API rate limits per org

**Solutions:**

### 1. Tenant Sharding by Organization

```
Shard 0 (Supabase instance A): orgs 0-999
Shard 1 (Supabase instance B): orgs 1000-1999
...

Shard resolver in middleware:
const shard = await shardRegistry.resolve(orgId);
const db = await createClient(shard.url, shard.key);
```

**Migration path:** New orgs assigned to new shards. Existing orgs migrated during maintenance windows with `pg_dump` + restore.

### 2. Redis Caching Layer

```
Cache:
├── Session tokens (avoid DB lookup on every request)
├── Agent configurations (change rarely)
├── Plan limits (read on every message)
├── RLS-cleared workspace membership (avoid per-request RLS eval)
└── Embedding cache (same text → same vector, skip API call)
```

Recommended: Upstash Redis (serverless, Vercel-native, no infra).

### 3. Dedicated Vector Search Service

At 10M+ vectors, pgvector becomes a bottleneck even with HNSW. Options:
- **Pinecone** — managed, expensive
- **Weaviate** — self-hosted or cloud
- **Qdrant** — open source, Docker/cloud
- **Keep pgvector** — Supabase Scale includes dedicated Postgres; often sufficient to 50M vectors

**Recommendation:** Stay on pgvector until 10M vectors are benchmarked. Only migrate if p95 retrieval > 200ms.

### 4. Anthropic Rate Limits

At 10k customers, daily token usage exceeds Anthropic Tier 2 limits. Solutions:
- Apply for Anthropic Tier 3/4 early (at 1k customers)
- Route high-volume workspaces to Azure OpenAI (no platform rate limit)
- Implement per-workspace rate limiting to prevent one tenant consuming org quota

**Metrics:**
- 1M–10M messages/day
- 10M+ vectors
- $50k–$200k/month Anthropic API cost

---

## Scale Tier 5 — 100,000 Customers

**Infrastructure:** Multi-region Supabase, Vercel Enterprise, dedicated AI gateway  
**Architecture:** Service decomposition begins

**New services extracted from monolith:**

### Execution Service (separate deployment)
The AI execution pipeline (LLM calls, RAG, memory) is extracted to a dedicated service. This allows:
- Independent scaling of AI execution
- Different runtime (Node.js workers instead of serverless)
- Connection pooling to Anthropic API

```
Vercel (API routes, webhooks, frontend)
     ↓ gRPC or HTTP
Execution Service (dedicated Node.js/Bun workers)
     ↓
Anthropic / Azure OpenAI / Anthropic failover
```

### Vector Search Service
Dedicated pgvector with Supabase dedicated server per region.

### Multi-Region Deployment

| Region | Users Served | Latency Target |
|---|---|---|
| EU West (Frankfurt/Dublin) | DACH, EU | < 200ms p95 |
| US East | Americas | < 200ms p95 |
| APAC (Singapore) | Asia Pacific | < 300ms p95 |

**Session affinity:** Users routed to nearest region. Workspaces pinned to one region (data residency).

**Metrics:**
- 10M–100M messages/day
- 100M+ vectors
- 500+ writes/sec per region

---

## Scale Tier 6 — 1 Million Customers

**Infrastructure:** Fully distributed, multi-cloud  
**Architecture:** Full microservices, event-driven

At 1M customers, each domain becomes an independent service:

```
API Gateway (Kong / Cloudflare)
     ↓
├── Identity Service    (stateless, JWT)
├── Workspace Service   (Supabase per region cluster)
├── Agent Service       (Supabase per region cluster)
├── Execution Service   (dedicated GPU workers for LLM)
├── Knowledge Service   (dedicated Qdrant cluster)
├── Connector Service   (dedicated webhook processors)
├── Billing Service     (Stripe + event ledger)
├── Analytics Service   (ClickHouse for time-series)
└── Audit Service       (immutable append-only log, S3)
```

**Event-Driven Architecture:**

```
Domain Event → Kafka / Supabase Realtime → Consumers
Example: message_sent → [analytics, audit, billing, connector]
```

**Note:** This is a 3–5 year horizon. Do not architect for this today. The current monolith can scale to Tier 4 without structural decomposition. Extract services only when a specific bottleneck demands it.

---

## Scalability Summary

| Tier | Customers | Key Addition | Effort | Timeline |
|---|---|---|---|---|
| 1 | 10 | Nothing (fix P0 bugs) | P0 sprint | Now |
| 2 | 100 | PgBouncer connection pooler | 1 day | Phase A |
| 3 | 1,000 | Inngest queues, HNSW index, read replica | 2 weeks | Phase B |
| 4 | 10,000 | Sharding, Redis cache, Azure OpenAI failover | 4 weeks | Phase D |
| 5 | 100,000 | Execution service extraction, multi-region | 12 weeks | Phase G |
| 6 | 1,000,000 | Full MSA, Kafka, ClickHouse | 24+ weeks | v4 |

---

## Performance SLOs

| Metric | Phase A | Phase C | Phase G |
|---|---|---|---|
| API p95 latency | < 2,000ms | < 1,000ms | < 500ms |
| Agent runtime p95 | < 8,000ms | < 5,000ms | < 3,000ms |
| RAG retrieval p95 | < 500ms | < 300ms | < 100ms |
| Webhook ingestion | < 60s | < 10s | < 2s |
| Uptime SLA | 99.5% | 99.9% | 99.95% |
| TTFB (streaming) | N/A | < 800ms | < 500ms |
