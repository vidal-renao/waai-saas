# Architecture 22 — Storage and Document Security (Fase 4)

## Bucket

Nombre: `waai-knowledge-documents`

Configuración:
- **Público:** NO
- **Acceso:** Solo server-side (service role key o signed URLs)
- **No acceso directo** desde el browser al bucket

## Path convention

```
{workspace_id}/{document_id}/{file_name}
```

Ejemplo:
```
3a7f8b2c-1234-5678-abcd-ef0123456789/
  c9d2e1f0-aaaa-bbbb-cccc-111122223333/
    catalogo-productos.txt
```

## MVP v4.0 — Modo texto

En Fase 4, los documentos se crean pegando texto directamente en el formulario. El campo `text_content` de `waai_knowledge_documents` almacena el contenido. Los campos `file_name`, `file_path`, `mime_type`, `file_size_bytes` quedan `NULL` para documentos de tipo `manual`/`faq`/`txt`/`markdown` en modo texto.

La integración real de uploads de archivos (multipart form → storage bucket → extracción) se implementa en Fase 6+.

## Seguridad multi-tenant

1. RLS en `waai_knowledge_documents`: SELECT/INSERT/UPDATE solo si `waai_is_workspace_member(workspace_id)`
2. RLS en `waai_knowledge_chunks`: SELECT solo si `waai_is_workspace_member(workspace_id)`; INSERT solo roles autorizados
3. `waai_match_agent_knowledge` filtra por `match_workspace_id` para prevenir cross-workspace
4. API routes verifican que `document.workspace_id === user.workspace_id` antes de cualquier operación
5. El bucket (futuro) usa paths prefijados por `workspace_id` — no se puede acceder a paths de otros workspaces

## Tipos de archivo soportados (MVP)

| Source type | Descripción | Implementado |
|-------------|-------------|--------------|
| manual | Texto libre pegado en formulario | ✓ Fase 4 |
| faq | Pares pregunta-respuesta en formulario | ✓ Fase 4 |
| txt | Texto plano (pegado o upload) | ✓ Fase 4 |
| markdown | Markdown (pegado o upload) | ✓ Fase 4 |
| pdf | PDF con extracción de texto | ✗ Fase 6+ |

## Validación de inputs

- `title`: requerido, max 200 chars
- `source_type`: enum validado (manual/faq/txt/markdown)
- `text_content`: requerido para MVP, min 10 chars, max 200,000 chars
- Sin HTML peligroso (Zod string trim)
- `file_size_bytes`: máx 10MB para archivos futuros
- mime_types aceptados: text/plain, text/markdown (futuro)
