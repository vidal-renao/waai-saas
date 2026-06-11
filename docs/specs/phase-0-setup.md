# Spec — Fase 0: Setup y Preparación

**Status:** In Progress  
**Date:** 2026-06-07

---

## Objetivo

Crear la estructura base del proyecto, configurar el toolchain, establecer convenciones y preparar la documentación inicial. Sin migraciones de base de datos. Sin features de negocio.

---

## Checklist de Fase 0

### Proyecto
- [x] Repositorio creado
- [x] Next.js 16 (App Router, TypeScript, Tailwind, ESLint, src-dir)
- [x] shadcn/ui inicializado
- [x] Dependencias base instaladas (Supabase, Zod, RHF, TanStack Query, Lucide)

### Estructura de carpetas
- [x] `src/features/*` (auth, workspaces, agents, knowledge, whatsapp, conversations, leads, analytics, billing)
- [x] `src/lib/*` (supabase, llm, whatsapp, rag, security, validators)
- [x] `src/server/*` (services, repositories, use-cases)
- [x] `src/types`, `src/config`
- [x] `docs/adr`, `docs/specs`, `docs/architecture`, `docs/prompts`
- [x] `supabase/migrations`, `supabase/functions`
- [x] `tests/unit`, `tests/integration`, `tests/e2e`

### Documentación
- [x] ADR-0001 Tech Stack
- [x] ADR-0002 Supabase public + waai_ prefix
- [x] ADR-0003 WhatsApp provider abstraction
- [x] ADR-0004 LLM provider abstraction
- [x] ADR-0005 Embedding model and RAG strategy
- [x] ADR-0006 Plan limits and usage enforcement
- [x] ADR-0007 WhatsApp Business API onboarding
- [x] Architecture overview
- [x] README.md con visión, stack, convenciones y fases

### Configuración
- [x] `.env.example` completo
- [x] TypeScript strict mode
- [x] ESLint configurado
- [x] `.gitignore` cubre .env.local

### Base de datos
- [ ] NO hay migraciones creadas (Fase 0 = solo setup)
- [ ] NO hay tablas creadas
- [ ] NO hay schemas personalizados

### Build & Quality
- [x] `npm run lint` pasa sin errores
- [x] `npm run build` pasa sin errores
- [x] Homepage inicial funciona

---

## Definition of Done para Fase 0

Fase 0 está completa cuando:
1. `npm run lint` → 0 errores
2. `npm run build` → build exitoso
3. Homepage visible en localhost:3000
4. Todos los ADRs existen y están completos
5. .env.example tiene todas las variables necesarias hasta Fase 5
6. README.md cubre visión, stack, SDD workflow y convenciones
7. Cero migraciones, cero tablas, cero schemas personalizados
