# Phase 9 — Production Smoke Test Checklist

## Instructions

Run against the production (or staging) deployment. Complete all tests before go-live. Mark each as ✅ PASS, ❌ FAIL, or ⚠️ PARTIAL.

Prerequisite: Production URL accessible, env vars configured, migrations applied, plans seeded.

---

## Test Environment

- **URL:** ___________________________
- **Date:** ___________________________
- **Tester:** ___________________________
- **Version:** 0.9.0

---

## 1. App Loads

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1.1 | Navigate to production URL | Login page or dashboard loads without 500 error | |
| 1.2 | Navigate to `/login` | Login form renders | |
| 1.3 | Navigate to `/dashboard` (without auth) | Redirects to `/login` | |
| 1.4 | No JavaScript errors in browser console on load | Console clean | |

---

## 2. Register / Login

| # | Test | Expected | Result |
|---|------|----------|--------|
| 2.1 | Register new user with email/password | Account created, email confirmation (if enabled) | |
| 2.2 | Login with registered credentials | Session established | |
| 2.3 | Login with wrong password | Error message shown | |
| 2.4 | Logout | Session cleared, redirected to `/login` | |

---

## 3. Onboarding — Workspace Creation

| # | Test | Expected | Result |
|---|------|----------|--------|
| 3.1 | New user redirected to `/onboarding` after login | Onboarding page loads | |
| 3.2 | Complete workspace creation form | `waai_workspaces` record created | |
| 3.3 | After onboarding, redirected to `/dashboard` | Dashboard loads | |
| 3.4 | `waai_subscriptions` with `plan_id = free` created | Subscription exists in DB | |

---

## 4. Dashboard Loads

| # | Test | Expected | Result |
|---|------|----------|--------|
| 4.1 | `/dashboard` loads | Page renders without error | |
| 4.2 | `/dashboard/agents` loads | Agent list page renders | |
| 4.3 | `/dashboard/conversations` loads | Conversations page renders | |
| 4.4 | `/dashboard/leads` loads | Leads page renders | |
| 4.5 | `/dashboard/analytics` loads | Analytics overview renders | |
| 4.6 | `/dashboard/settings/billing` loads | Billing page renders | |
| 4.7 | `/dashboard/settings/system-health` loads | System health page renders | |

---

## 5. Create Agent

| # | Test | Expected | Result |
|---|------|----------|--------|
| 5.1 | Click "New Agent" | Agent creation form opens | |
| 5.2 | Complete wizard — business name, tone, goals | Wizard progresses | |
| 5.3 | Agent created | `waai_agents` record with `status = draft` | |
| 5.4 | Agent appears in agent list | Listed on `/dashboard/agents` | |

---

## 6. Generate System Prompt

| # | Test | Expected | Result |
|---|------|----------|--------|
| 6.1 | Open agent → click "Generate Prompt" | Claude API call made | |
| 6.2 | System prompt generated | Prompt text appears in agent editor | |
| 6.3 | Save agent | Agent saved with `system_prompt` in DB | |

---

## 7. Open Sandbox

| # | Test | Expected | Result |
|---|------|----------|--------|
| 7.1 | Click "Test in Sandbox" on agent | Sandbox chat UI opens | |
| 7.2 | Sandbox conversation created in DB | `waai_conversations` record with `channel = sandbox` | |

---

## 8. Send Message in Sandbox

| # | Test | Expected | Result |
|---|------|----------|--------|
| 8.1 | Type message and send | Message sent to Claude API | |
| 8.2 | Agent responds | Response appears in chat | |
| 8.3 | Response is coherent/on-topic | Makes sense given agent config | |
| 8.4 | `waai_messages` has inbound + outbound records | DB records created | |
| 8.5 | `waai_agent_runs` has record with cost | `estimated_cost_cents` > 0 | |

---

## 9. Create Knowledge Document

| # | Test | Expected | Result |
|---|------|----------|--------|
| 9.1 | Go to `/dashboard/knowledge` (or agent knowledge tab) | Knowledge UI loads | |
| 9.2 | Upload a text document | Upload initiated | |
| 9.3 | Document appears with `status = processing` | Processing status shows | |
| 9.4 | Document status changes to `ready` | `waai_knowledge_documents.status = ready` | |

---

## 10. Process Document (RAG Embeddings)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 10.1 | After document is `ready`, check chunks | `waai_knowledge_chunks` has records | |
| 10.2 | Chunks have non-null embeddings | `embedding IS NOT NULL` in DB | |

---

## 11. Link Document to Agent

| # | Test | Expected | Result |
|---|------|----------|--------|
| 11.1 | Link knowledge document to the test agent | Association created in DB | |
| 11.2 | Agent settings shows linked document | Document appears in agent config | |

---

## 12. Sandbox Responds with RAG Context

| # | Test | Expected | Result |
|---|------|----------|--------|
| 12.1 | Ask question about document content in sandbox | Agent responds with document-relevant content | |
| 12.2 | Response references information from the document | RAG retrieval working | |

---

## 13. Create WhatsApp Mock Connection

| # | Test | Expected | Result |
|---|------|----------|--------|
| 13.1 | Go to WhatsApp settings | Connection page loads | |
| 13.2 | Create new connection with provider `mock` | Connection created | |
| 13.3 | Connection status shows `active` (mock auto-activates) | Status correct | |
| 13.4 | Connection linked to agent | Agent can receive mock messages | |

---

## 14. Simulate WhatsApp Message

| # | Test | Expected | Result |
|---|------|----------|--------|
| 14.1 | `POST /api/whatsapp/simulate` with test payload | HTTP 200 | |
| 14.2 | Message processed | No 500 errors | |
| 14.3 | Agent receives and processes the message | Processing occurs | |

**Test payload:**
```bash
curl -X POST https://your-domain.vercel.app/api/whatsapp/simulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d '{"connectionId":"<your-connection-id>","from":"1234567890","message":"Hola, necesito información"}'
```

---

## 15. View WhatsApp Conversation

| # | Test | Expected | Result |
|---|------|----------|--------|
| 15.1 | After simulation, check `/dashboard/conversations` | Conversation appears | |
| 15.2 | Open conversation | Messages visible | |
| 15.3 | Conversation has `channel = whatsapp` | Channel correct | |
| 15.4 | Agent response message visible in conversation | Outbound message present | |

---

## 16. Create Lead from Conversation

| # | Test | Expected | Result |
|---|------|----------|--------|
| 16.1 | Open a conversation → click "Create Lead" | Lead creation form | |
| 16.2 | Complete lead form | Lead created | |
| 16.3 | Lead appears at `/dashboard/leads` | Lead in list | |

---

## 17. Lead Status Changes

| # | Test | Expected | Result |
|---|------|----------|--------|
| 17.1 | Change lead status: new → qualified | Status updated | |
| 17.2 | Change status: qualified → contacted | Status updated | |
| 17.3 | Assign lead to workspace member | Assignment saved | |
| 17.4 | Archive lead | Lead moves to archived | |

---

## 18. Request Human Handoff

| # | Test | Expected | Result |
|---|------|----------|--------|
| 18.1 | From conversation → click "Request Handoff" | Handoff request created | |
| 18.2 | `waai_handoff_requests` record created | Record in DB | |
| 18.3 | Conversation status changes to `handoff_required` | Status updated | |

---

## 19. Automation Paused During Handoff

| # | Test | Expected | Result |
|---|------|----------|--------|
| 19.1 | During handoff, send another test WhatsApp message | Agent does NOT auto-respond | |
| 19.2 | Conversation stays in `handoff_required` status | Status unchanged by automation | |

---

## 20. Add Internal Note

| # | Test | Expected | Result |
|---|------|----------|--------|
| 20.1 | Human agent adds internal note to conversation | Note created | |
| 20.2 | Note appears in conversation for owner/admin | Note visible in UI | |
| 20.3 | Verify note is NOT in outbound WhatsApp messages | `waai_whatsapp_messages` has no note content | |

---

## 21. View Analytics Overview

| # | Test | Expected | Result |
|---|------|----------|--------|
| 21.1 | `/dashboard/analytics` loads | Overview renders | |
| 21.2 | Metrics show numbers (even if 0 in new env) | No error state | |
| 21.3 | Date filter presets work (Today, 7d, 30d) | Data updates | |
| 21.4 | Custom date range picker works | From/to dates selectable | |
| 21.5 | `/dashboard/analytics/agents` loads | Agent table renders | |
| 21.6 | `/dashboard/analytics/leads` loads | Lead funnel renders | |

---

## 22. View Usage

| # | Test | Expected | Result |
|---|------|----------|--------|
| 22.1 | `/dashboard/settings/usage` loads | Usage page renders | |
| 22.2 | Plan usage bars shown | Bars visible (even if 0) | |
| 22.3 | `GET /api/billing/usage` with auth | HTTP 200, usage data | |

---

## 23. View Billing Readiness

| # | Test | Expected | Result |
|---|------|----------|--------|
| 23.1 | `/dashboard/settings/billing` loads | Billing page renders | |
| 23.2 | Current plan displayed | Plan name shown | |
| 23.3 | Stripe section shows "not configured" (pending) | Stripe section correct | |
| 23.4 | `GET /api/billing/readiness` with auth | HTTP 200 | |

---

## 24. View System Health

| # | Test | Expected | Result |
|---|------|----------|--------|
| 24.1 | `/dashboard/settings/system-health` loads | System health page renders | |
| 24.2 | Database status shows "ok" | Green/ok status | |
| 24.3 | LLM status reflects ANTHROPIC_API_KEY presence | ok if key set | |
| 24.4 | Readiness checklist items shown | All items visible | |

---

## 25. Confirm No Secrets in Frontend

| # | Test | Expected | Result |
|---|------|----------|--------|
| 25.1 | Open browser DevTools → Network tab — inspect API responses | No secret values in responses | |
| 25.2 | View page source — no env var values visible | No secrets in HTML | |
| 25.3 | Run grep audit from Section 3 of Production Validation Checklist | 0 results | |

---

## 26. RLS Isolation (Second Workspace)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 26.1 | Register second user in a different browser/incognito | New account created | |
| 26.2 | Create workspace for second user | Second workspace created | |
| 26.3 | User 2 cannot see User 1's agents | `/dashboard/agents` shows empty for User 2 | |
| 26.4 | User 2 cannot see User 1's conversations | No cross-workspace data | |
| 26.5 | User 2 cannot see User 1's leads | No cross-workspace data | |

---

## Results Summary

| Section | Total Tests | Passed | Failed | Notes |
|---------|------------|--------|--------|-------|
| 1. App Loads | 4 | | | |
| 2. Register/Login | 4 | | | |
| 3. Onboarding | 4 | | | |
| 4. Dashboard | 7 | | | |
| 5. Create Agent | 4 | | | |
| 6. Generate Prompt | 3 | | | |
| 7. Sandbox | 2 | | | |
| 8. Send Message | 5 | | | |
| 9. Knowledge | 4 | | | |
| 10. RAG Embeddings | 2 | | | |
| 11. Link Document | 2 | | | |
| 12. RAG Response | 2 | | | |
| 13. WA Connection | 4 | | | |
| 14. Simulate WA | 3 | | | |
| 15. WA Conversation | 4 | | | |
| 16. Create Lead | 3 | | | |
| 17. Lead Status | 4 | | | |
| 18. Handoff | 3 | | | |
| 19. Automation Paused | 2 | | | |
| 20. Internal Note | 3 | | | |
| 21. Analytics | 6 | | | |
| 22. Usage | 3 | | | |
| 23. Billing | 4 | | | |
| 24. System Health | 4 | | | |
| 25. No Secrets | 3 | | | |
| 26. RLS Isolation | 5 | | | |
| **TOTAL** | **96** | | | |

**Go-live threshold:** ≥ 90/96 tests passing. All FAIL items with HIGH severity must be resolved.
