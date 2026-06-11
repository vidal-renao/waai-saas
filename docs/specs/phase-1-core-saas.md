# Spec — Fase 1: Core SaaS Multi-tenant

**Status:** Accepted  
**Date:** 2026-06-07  
**Author:** Vidal Reñao Lopelo

---

## Objetivo

Construir la infraestructura base del SaaS multi-tenant: autenticación, workspaces, roles, billing foundation y audit log. Al final de esta fase, un usuario puede registrarse, crear su workspace, y acceder al dashboard. Sin features de negocio (agentes, WhatsApp, RAG).

---

## User Stories

### US-101 — Registro
**Como** visitante,  
**quiero** registrarme con email y contraseña,  
**para** crear mi cuenta en la plataforma.

**Criterios de aceptación:**
- Formulario con email, contraseña, nombre completo
- Validación Zod en cliente y servidor
- Supabase Auth crea el usuario
- Se crea automáticamente `waai_profiles` vía trigger
- Redirect a `/onboarding` si no tiene workspace

### US-102 — Login
**Como** usuario registrado,  
**quiero** hacer login con email y contraseña,  
**para** acceder a mi cuenta.

**Criterios de aceptación:**
- Formulario con email y contraseña
- Error claro si credenciales incorrectas
- Redirect a `/dashboard` si tiene workspace
- Redirect a `/onboarding` si no tiene workspace

### US-103 — Crear workspace
**Como** usuario autenticado sin workspace,  
**quiero** crear mi empresa/workspace,  
**para** empezar a usar la plataforma.

**Criterios de aceptación:**
- Formulario: nombre empresa, tipo de negocio, país
- Slug generado automáticamente desde el nombre
- Usuario queda como `owner` del workspace
- Se crea `waai_subscriptions` con plan `free` automáticamente
- Se crea entrada en `waai_audit_logs`
- Redirect a `/dashboard` al completar

### US-104 — Dashboard
**Como** usuario con workspace,  
**quiero** ver mi dashboard principal,  
**para** ver el estado de mi cuenta.

**Criterios de aceptación:**
- Protegido por autenticación (redirect a `/login` si no autenticado)
- Muestra nombre del workspace
- Muestra plan activo
- Muestra límites de uso
- Muestra rol del usuario en el workspace

### US-105 — Protección de rutas
**Como** plataforma,  
**quiero** que las rutas protegidas redirijan correctamente,  
**para** garantizar seguridad y UX consistente.

**Criterios de aceptación:**
- `/dashboard/*` → redirect `/login` si no autenticado
- `/dashboard/*` → redirect `/onboarding` si autenticado sin workspace
- `/onboarding` → redirect `/dashboard` si ya tiene workspace
- `/login`, `/register` → redirect `/dashboard` si autenticado con workspace

---

## Modelo de datos

Ver `docs/specs/data-model.md` — tablas Fase 1:
- `waai_profiles`
- `waai_workspaces`
- `waai_workspace_members`
- `waai_plans`
- `waai_subscriptions`
- `waai_usage_events`
- `waai_usage_counters`
- `waai_audit_logs`

---

## Flujo técnico — Crear workspace

```
POST /api/workspaces
  ↓ Zod validation (CreateWorkspaceSchema)
  ↓ AuthService.getAuthenticatedUser()
  ↓ WorkspaceRepository.findByOwner(userId) → must be empty
  ↓ WorkspaceRepository.create({ name, slug, businessType, country })
  ↓ WorkspaceMemberRepository.create({ workspaceId, userId, role: 'owner' })
  ↓ BillingService.createFreeSubscription(workspaceId)
  ↓ AuditLogRepository.log({ event: 'workspace.created', ... })
  ↓ return { workspace }
```

---

## Roles

| Role | Description | Can modify data | Can manage members | Can see billing |
| --- | --- | --- | --- | --- |
| `owner` | Workspace creator | Yes | Yes | Yes |
| `admin` | Full admin | Yes | Yes | Yes |
| `agent_manager` | Manages agents | Yes (agents only) | No | No |
| `human_agent` | Handles escalated chats | No | No | No |
| `viewer` | Read-only | No | No | No |

---

## Plan seed data

| Plan | Agents | Messages/mo | Documents | WhatsApp numbers | Handoff |
| --- | --- | --- | --- | --- | --- |
| free | 1 | 100 | 3 | 0 | No |
| starter | 1 | 1,000 | 10 | 1 | No |
| pro | 3 | 10,000 | 50 | 3 | Yes |
| agency | 20 | 100,000 | 500 | 20 | Yes |
| enterprise | -1 (unlimited) | -1 | -1 | -1 | Yes |

---

## Criterios de aceptación globales

1. Usuario puede registrarse → perfil creado automáticamente
2. Usuario puede hacer login
3. Sin workspace → va a `/onboarding`
4. Puede crear workspace → suscripción free creada automáticamente
5. Con workspace → va a `/dashboard`
6. RLS impide ver datos de otros tenants
7. Lint pasa 0 errores
8. Build exitoso
9. Rutas protegidas funcionan
10. Sin lógica de Stripe real
11. Sin Agent Builder
12. Sin Claude API
13. Sin WhatsApp real
14. Sin RAG funcional

---

## Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| RLS mal configurado | Crítico | Policies probadas en migración + test |
| Slug duplicado | Medio | UNIQUE constraint + generación con random suffix |
| Race condition en workspace creation | Bajo | Single transaction en RPC |

---

## Restricciones de Fase 1

- NO implementar Agent Builder
- NO llamar Claude API
- NO integrar WhatsApp real
- NO implementar RAG
- NO implementar Stripe checkout real
- NO implementar multi-workspace (un usuario = un workspace en MVP)
