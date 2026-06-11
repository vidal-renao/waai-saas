# Release Checklist — Staging v0.9.0

**Proyecto:** WAAI SaaS  
**Versión:** 0.9.0  
**Entorno:** Staging / Pre-producción  
**Fecha inicio:** ___________________________  
**Fecha completado:** ___________________________  
**Release manager:** ___________________________

Marcar cada ítem con `[x]` al completarlo. No avanzar al siguiente bloque si el anterior tiene ítems críticos sin completar.

---

## A — Git / GitHub

```
[ ] git status revisado — confirmar que no hay ficheros sensibles en stage
[ ] .env.local NO aparece en git status (debe estar ignorado)
[ ] git add . ejecutado
[ ] git status verificado post-add — sin .env* en stage
[ ] Commit creado con mensaje de versión 0.9.0
[ ] Branch release/staging-v0.9.0 creada
[ ] git branch -a muestra: * release/staging-v0.9.0 y main
[ ] Repositorio GitHub waai-saas creado (privado)
[ ] Remote origin configurado: git remote -v muestra origin
[ ] git push -u origin main → OK
[ ] git push -u origin release/staging-v0.9.0 → OK
```

**Notas Git/GitHub:**
```




```

---

## B — Supabase Staging

```
[ ] Proyecto waai-saas-staging creado en Dashboard
[ ] Región: Central Europe (Frankfurt)
[ ] Credenciales guardadas en gestor de contraseñas:
    [ ] Project Ref anotado
    [ ] Project URL anotada
    [ ] Anon Key guardada
    [ ] Service Role Key guardada (sensitive)
    [ ] Database Password guardada
[ ] pgvector habilitado: Database → Extensions → vector → Enable
[ ] Verificación pgvector: SELECT extname FROM pg_extension WHERE extname = 'vector' → 1 fila
[ ] Supabase CLI actualizado a 2.105.0+
[ ] supabase link --project-ref <ref> → OK (sin error de auth)
[ ] supabase status → proyecto correcto conectado
[ ] supabase migration list → 9 migraciones en estado pending
[ ] supabase db push --dry-run → 0 errores, 9 migraciones listadas
[ ] supabase db push → 9/9 applied
[ ] supabase migration list → todas en estado applied
```

**Notas Supabase:**
```




```

---

## C — Verificación Post-Migración

```
[ ] SQL: SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'waai_%'
    → 34 tablas

[ ] SQL: Todas las tablas waai_ con rowsecurity = true
    → ninguna fila con rowsecurity = false

[ ] SQL: Todas las funciones waai_ con prosecdef = true
    → ninguna función sin SECURITY DEFINER

[ ] SQL: SELECT extname FROM pg_extension WHERE extname = 'vector'
    → 1 fila

[ ] SQL: Columna embedding en waai_knowledge_chunks tipo vector
    → data_type = USER-DEFINED, udt_name = vector

[ ] Seed planes ejecutado (docs/sql/waai-staging-seed-plans.sql)
[ ] SQL: SELECT COUNT(*) FROM waai_plans → 4 filas
[ ] SQL: Planes: free, starter, pro, agency presentes
[ ] verify-rls-policies.ts → PASS (si .env.local está configurado)
```

**Notas post-migración:**
```




```

---

## D — Entorno Local (.env.local)

```
[ ] .env.staging.example copiado a .env.local
[ ] NEXT_PUBLIC_SUPABASE_URL rellenado con URL del proyecto staging
[ ] NEXT_PUBLIC_SUPABASE_ANON_KEY rellenado
[ ] SUPABASE_SERVICE_ROLE_KEY rellenado
[ ] NEXT_PUBLIC_APP_URL = http://localhost:3000 (para pruebas locales)
[ ] ANTHROPIC_API_KEY rellenado
[ ] OPENAI_API_KEY rellenado
[ ] ENCRYPTION_KEY generado y rellenado (32-byte hex)
[ ] INTERNAL_API_SECRET generado y rellenado (32-byte hex)
[ ] WHATSAPP_PROVIDER = mock confirmado
[ ] npm run build local → limpio (verificación pre-Vercel)
[ ] npx ts-node --skipProject scripts/verify-production-env.ts → PASS
[ ] npx ts-node --skipProject scripts/verify-staging-readiness.ts → PASS
```

**Notas .env.local:**
```




```

---

## E — Vercel Staging

```
[ ] Proyecto Vercel creado importando waai-saas de GitHub
[ ] Framework: Next.js auto-detectado
[ ] Node.js version: 20.x
[ ] Build command: npm run build
[ ] Branch de staging: release/staging-v0.9.0

Variables de entorno configuradas:
[ ] NEXT_PUBLIC_APP_URL (actualizar después del primer deploy)
[ ] NEXT_PUBLIC_APP_NAME = WAAI SaaS Staging
[ ] NEXT_PUBLIC_SUPABASE_URL
[ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
[ ] SUPABASE_SERVICE_ROLE_KEY (sensitive)
[ ] ANTHROPIC_API_KEY (sensitive)
[ ] ANTHROPIC_MODEL = claude-haiku-4-5-20251001
[ ] ANTHROPIC_MODEL_FAST = claude-haiku-4-5-20251001
[ ] ANTHROPIC_MODEL_QUALITY = claude-sonnet-4-6
[ ] OPENAI_API_KEY (sensitive)
[ ] OPENAI_EMBEDDING_MODEL = text-embedding-3-small
[ ] OPENAI_EMBEDDING_DIMENSIONS = 1536
[ ] WHATSAPP_PROVIDER = mock
[ ] ENCRYPTION_KEY (sensitive)
[ ] INTERNAL_API_SECRET (sensitive)
[ ] LOG_LEVEL = info
[ ] ENABLE_DEBUG_LOGS = false

[ ] Deploy ejecutado: git push origin release/staging-v0.9.0
[ ] Build completado sin errores en Vercel Dashboard
[ ] 79 rutas en build output confirmadas
[ ] URL staging obtenida: ___________________________
[ ] NEXT_PUBLIC_APP_URL actualizado con URL real en Vercel
[ ] Redeploy hecho después de actualizar APP_URL
[ ] Runtime logs sin errores 500
```

**Notas Vercel:**
```




```

---

## F — Health Checks

```
[ ] GET /api/health → {"status":"ok"} HTTP 200
[ ] GET /api/health/db con x-internal-secret → {"status":"ok"} HTTP 200
[ ] GET /api/health/ai con x-internal-secret → {"status":"ok"} HTTP 200
[ ] GET /api/health/whatsapp con x-internal-secret → HTTP 200
[ ] GET /api/health/db SIN secret → HTTP 401 (validación de seguridad)
[ ] scripts/verify-health-endpoints.ts → todos los checks PASS

Latencias:
[ ] /api/health responde < 500ms
[ ] /api/health/db responde < 2000ms
[ ] /api/health/ai responde < 5000ms (incluye llamada a Claude)
```

**Notas health:**
```




```

---

## G — Smoke Tests

Ejecutar [`docs/operations/staging-smoke-test-execution.md`](staging-smoke-test-execution.md).

```
[ ] Prerrequisitos de smoke test verificados
[ ] Usuario test-a@waai-staging.dev creado
[ ] Usuario test-b@waai-staging.dev creado (para RLS)

Secciones críticas (0 FAILs):
[ ] § 2 Register/Login: ___ / 4 PASS
[ ] § 3 Onboarding: ___ / 4 PASS
[ ] § 7–8 Sandbox: ___ / 7 PASS
[ ] § 13–14 WhatsApp Mock: ___ / 7 PASS
[ ] § 24 System Health: ___ / 4 PASS
[ ] § 26 RLS Isolation: ___ / 5 PASS

Resultado total: ___ / 96 PASS

[ ] ≥ 90/96 PASS confirmado
[ ] 0 FAILs en secciones críticas confirmado
```

**Bugs encontrados durante smoke test:**

| ID | Sección | Descripción | Severidad | Estado |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

---

## H — Seguridad Final

```
[ ] Browser DevTools → Network tab: sin secrets en responses de API
[ ] View source: sin valores de env vars en HTML
[ ] .env.local NO commitado (git log confirma)
[ ] .env.staging.example SÍ commitado (es plantilla sin valores)
[ ] SUPABASE_SERVICE_ROLE_KEY no expuesta en frontend
[ ] ANTHROPIC_API_KEY no expuesta en frontend
[ ] OPENAI_API_KEY no expuesta en frontend
```

---

## I — Sign-off

```
Resultado smoke tests: ___ / 96 PASS
Riesgos documentados: [ ] Sí / [ ] No
Próxima fase definida: ___________________________

[ ] STAGING APROBADO para validación extendida
[ ] STAGING NO APROBADO — motivo: ___________________________

Firma release manager: ___________________________
Fecha: ___________________________
```

---

## Riesgos Residuales Aceptados para Staging

| Riesgo | Aceptado | Notas |
|---|---|---|
| Stripe no configurado | Sí | Intencional — Fase 10 |
| Meta Cloud API no configurada | Sí | Intencional — WhatsApp real en producción |
| Sentry no configurado | Sí | Intencional — Fase 10 |
| Cron jobs sin programar | Sí | Intencional — Fase 10 |
| Vercel Hobby plan (timeouts >60s posibles) | Sí con condición | maxDuration=60 aplicado; actualizar a Pro antes de producción |
