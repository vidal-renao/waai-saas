# Embedding Providers — Guía de configuración

## Variable de entorno

```
EMBEDDING_PROVIDER=openai   # producción (por defecto si no se define)
EMBEDDING_PROVIDER=mock     # staging / testing sin coste
```

La variable se configura en **Vercel → Project Settings → Environment Variables**.

---

## Proveedores disponibles

### `openai` (por defecto)

- **Clase:** `OpenAIEmbeddingProvider`
- **Modelo:** `text-embedding-3-small` (override con `OPENAI_EMBEDDING_MODEL`)
- **Requisito:** `OPENAI_API_KEY` con saldo disponible
- **Dimensiones:** 1536
- **Búsqueda semántica:** Sí — calidad real

**Variables necesarias:**
```
EMBEDDING_PROVIDER=openai        # o simplemente no definir la variable
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small   # opcional
```

**Error 429 (quota exceeded):** Recargar créditos en platform.openai.com → Billing → Add credits.
Tras recargar, re-procesar los documentos desde la UI (botón "Procesar" en cada documento).

---

### `mock`

- **Clase:** `MockEmbeddingProvider`
- **Modelo:** `mock-deterministic-v1`
- **Requisito:** Ninguno — sin llamadas externas, sin coste
- **Dimensiones:** 1536 (compatible con pgvector)
- **Búsqueda semántica:** No — vectores deterministas por hash, sin significado semántico

**Variables necesarias:**
```
EMBEDDING_PROVIDER=mock
# OPENAI_API_KEY no es necesaria
```

**Cuándo usarlo:**
- Staging sin saldo en OpenAI
- CI/CD tests de integración del pipeline RAG
- Verificación del flujo completo (crear → procesar → vincular → sandbox) sin coste

**Limitación importante:** El agente en sandbox recibe chunks de contexto del RAG, pero el
ranking de relevancia es aleatorio — no recuperará el fragmento más relevante para la pregunta.
Lo que sí queda verificado es que todo el pipeline técnico funciona.

---

## Cambiar de mock → openai en producción

1. En Vercel → Project Settings → Environment Variables:
   - Cambiar `EMBEDDING_PROVIDER` de `mock` a `openai` (o eliminar la variable)
   - Confirmar que `OPENAI_API_KEY` tiene saldo

2. Redesplegar: `vercel deploy --prod`

3. Re-procesar los documentos existentes:
   - Ir a `/dashboard/knowledge`
   - Para cada documento: abrir → botón "Procesar documento"
   - Los chunks antiguos (con vectores mock) se eliminan y se regeneran con embeddings reales

4. Verificar en sandbox que el agente responde con información del FAQ correctamente.

---

## Arquitectura

```
createEmbeddingProvider()           ← embedding-provider.ts (factory)
  └── EMBEDDING_PROVIDER=openai  →  OpenAIEmbeddingProvider
  └── EMBEDDING_PROVIDER=mock    →  MockEmbeddingProvider

Ambos implementan EmbeddingProvider (types.ts):
  embedText(input)   → EmbeddingOutput
  embedBatch(input)  → EmbeddingBatchOutput
  getProviderName()  → string
  getDefaultModel()  → string
```

Para añadir un proveedor nuevo (p.ej. Google Gemini, Cohere):
1. Crear `src/lib/embeddings/[nombre]-embedding-provider.ts` implementando `EmbeddingProvider`
2. Añadir el case en `createEmbeddingProvider()` en `embedding-provider.ts`
3. Documentar aquí

---

*Última actualización: 2026-06-12 — mock provider añadido para staging v0.9.0*
