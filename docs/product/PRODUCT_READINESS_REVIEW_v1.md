# WAAI — Product Readiness Review v1

**Reviewer perspective:** New Lead Engineer, day one — reviewing the *product*, not the code.
**Persona applied throughout:** the owner of a Swiss SME (a cleaning company, a dental practice, a small law firm) evaluating whether to pay for WAAI.
**Date:** 2026-07-03 · **Build reviewed:** v0.9.0 (`release/staging-v0.9.0`)
**Scope:** Product/UX only. Architecture, code quality and documentation were explicitly out of scope.

Three questions were asked continuously on every screen:

1. **Would I pay for this?**
2. **Would I trust this?**
3. **Do I understand what this screen does in less than 30 seconds?**

**Legend** — Effort: `S` <½ day · `M` ½–2 days · `L` 2–5 days · `XL` >5 days.
Priority: `P0` launch blocker · `P1` needed before first paying customer · `P2` safe for v1.1.
Trust: rated /5 from the SME owner's eyes.

---

## 0. Executive summary (read this first)

WAAI is **functionally impressive** — a real multi-step agent builder, a working sandbox, WhatsApp via the official Meta Cloud API, RAG, human handoff, leads and analytics. As an engineering artifact it is well ahead of most pre-seed SaaS.

As a **product a Swiss SME would pay for, today, it is not ready.** The gap is not features — it is *presentation, language, trust and legal surface*. The application currently talks like a developer tool: it says "workspace", "RAG Knowledge Base", "sandbox", "handoff", "Stripe: not configured", "Phone Number ID / WABA ID / Permanent Access Token", and it shows the customer raw database error strings. It ships in **three languages at once by accident** (English landing, Spanish app, English navigation labels) and offers **zero German** despite targeting the DACH market. There is **no Impressum, no Terms, no Privacy Policy** — which are not "nice to have" in Switzerland and Germany, they are legally required to transact.

The single most damaging pattern: the product repeatedly reveals that it is *staging software under construction* ("v0.9.0 staging ready — Supabase connected · RLS enabled", "preparación para facturación real", "Modo sandbox · Solo para pruebas"). A paying customer must never see the scaffolding.

**None of the blockers require new backend features.** They are language, copy, trust, legal and polish. That is good news: the 4-week roadmap in §Final can close them.

---

## 1. Cross-cutting findings (apply to every screen)

These are systemic; individual screen sections below reference them by ID rather than repeat them.

| ID | Finding | Impact | Priority |
|----|---------|--------|----------|
| **X-1 Language chaos** | Landing is English, the app is Spanish, the top nav mixes both ("Dashboard / Agentes / Conversaciones / Knowledge / WhatsApp / Leads / Analytics / Settings / Salir"). No German anywhere. | A Swiss SME sees an unfinished, non-localized product. Instant trust loss. | **P0** |
| **X-2 No i18n layer** | `next-intl` (mandated by the house standard, ES/DE/EN) is not wired. Copy is hard-coded, mostly Spanish. | DACH go-to-market is impossible without DE; no locale switch. | **P0** |
| **X-3 Developer terminology leaks to customers** | "workspace", "RAG", "sandbox", "handoff", "system prompt", "chunks", "Mock provider", "Lead Capture", "billing events", "RLS". | The owner doesn't understand half the screens in 30s. | **P0** |
| **X-4 "Staging / under construction" signals** | "v0.9.0 staging" badge on landing, "preparación para facturación real", "Solo para pruebas". | Reads as beta software → nobody pays. | **P0** |
| **X-5 Raw system errors shown to users** | Login/register surface Supabase `error.message` verbatim (English, technical); many forms show `json.error` straight from the API. | Unprofessional, sometimes leaks internals, always confusing. | **P1** |
| **X-6 No legal surface** | No Terms of Service, Privacy Policy, Impressum, cookie/consent, or DPA. No consent checkbox at signup. | Cannot legally sell to CH/DE SMEs (Impressum + nDSG/GDPR are mandatory). | **P0** |
| **X-7 Thin design system** | Only `Button` is a real primitive (base-ui + cva). Inputs, cards, badges, selects, the whole app are ad-hoc Tailwind. No toasts, no modals/dialogs, no skeletons. | Inconsistent spacing/color, no feedback affordances, harder to keep polished. | **P1** |
| **X-8 No account/profile/team management** | No screen to change name/email/password, manage team members, set notifications, or delete the account (GDPR right to erasure). "Settings" only links to Billing. | Table-stakes SaaS gap; a legal gap for erasure. | **P1** |
| **X-9 Color-only status + inconsistent accent** | Status shown as colored dots without text in places; green appears as `green-500/600/700` and `emerald` on landing. | Accessibility (color-blind) + visual inconsistency. | **P2** |
| **X-10 No transactional-email polish reviewed as product** | Register auto-redirects after 1.5s assuming no email confirmation; if confirmation is on, the user is stuck with no guidance. | Broken first-run for a real signup. | **P1** |

---

## 2. Screen-by-screen review

> Each screen reports: purpose · strengths · weaknesses/UX · business · enterprise · security · accessibility · performance · visual consistency · trust · friction · terminology swaps · effort · priority. Where a dimension has nothing notable, it is marked "— none notable" (honest reporting, not omission).

### 2.1 Landing / Marketing (`/`)

- **Purpose:** Convert a visitor into a signup; explain what WAAI does.
- **Strengths:** Clean dark hero, good gradient headline, feature grid is visually tidy, fast (static, no data).
- **Weaknesses / UX:** Feature cards are written for engineers — "RAG Knowledge Base", "RLS Security", "Multi-Agent Routing", "WhatsApp Mock", "Claude Sonnet 4.6". The badges literally include "WhatsApp Mock" and "Billing Ready" (internal states, not benefits). Headline value prop is fine ("AI agents for WhatsApp businesses") but the body sells *mechanisms*, not *outcomes* (more bookings, faster replies, fewer missed leads).
- **Business:** **No pricing, no plans, no "book a demo", no social proof, no testimonials, no logos, no ROI framing.** An SME cannot judge fit or cost. "Get started free" with no visible price is a leap of faith.
- **Enterprise:** No security/compliance page, no data-residency/nDSG statement, no SLA/uptime, no company/contact. (X-6)
- **Security:** "Claude Sonnet 4.6" and "Whapi" are named publicly — outdated (now Fable 5 / Meta Cloud API) and reveal stack internals. — otherwise none notable.
- **Accessibility:** Icon + text pairs are fine; contrast of `text-white/40` body on `#060606` is borderline (WCAG AA risk on small text).
- **Performance:** Excellent (static).
- **Visual consistency:** Uses `emerald` here vs `green-*` in the app (X-9).
- **Trust:** **2/5** — "v0.9.0 staging ready — Supabase connected · RLS enabled · RAG enabled" status bar screams beta (X-4). Footer "Built by Vidal Reñao · Powered by Claude API · Swiss quality" reads as a personal side-project, not a company.
- **Friction:** Owner leaves without knowing price or trustworthiness.
- **Terminology swaps:** `RAG Knowledge Base → "Answers from your own documents"` · `RLS Security → "Your data stays private & isolated"` · `Multi-Agent Routing → "A dedicated assistant per business line"` · `WhatsApp Mock → (remove)` · `Claude Sonnet 4.6 → "Powered by leading AI"` · `Billing Ready → (remove)`.
- **Effort:** L · **Priority:** P0 (pricing + copy + remove staging), P1 (social proof).

### 2.2 Auth — Login (`/login`, `LoginForm`)

- **Purpose:** Return a customer to their dashboard.
- **Strengths:** Correct `autoComplete`, labels present, "forgot password" link, disabled state during submit, clean layout.
- **Weaknesses / UX:** Shows raw Supabase `error.message` (e.g. "Invalid login credentials") in English inside a Spanish UI (X-5). No "no account yet? Register" link on the form itself. No SSO / Microsoft / Google (the house target is M365 SMEs — Entra ID would be a strong trust signal and is in the stack vision).
- **Business:** — none notable.
- **Enterprise:** No enterprise SSO (Entra ID) despite the DACH/M365 positioning.
- **Security:** No rate-limit / lockout messaging surfaced; no visible captcha. Good: passwords use `current-password`.
- **Accessibility:** Good — labels linked via `htmlFor`/`id`, focus ring present. Error not announced (`aria-live` missing).
- **Performance:** — none notable.
- **Visual consistency:** `zinc` + `green-500` focus; consistent with app, differs from landing emerald.
- **Trust:** **3/5** — clean, but the language mix undercuts it.
- **Friction:** Low, except confusing English error strings.
- **Terminology swaps:** none (already customer-safe).
- **Effort:** S (error mapping) / M (SSO) · **Priority:** P1.

### 2.3 Auth — Register (`/register`, `RegisterForm`)

- **Purpose:** Create an account.
- **Strengths:** Minimal (name, email, password), good autocomplete, success state.
- **Weaknesses / UX:** **No Terms/Privacy consent checkbox** (X-6 — legally required). **No password strength meter / policy hint.** After signup it auto-redirects to `/onboarding` after 1.5s — **but if email confirmation is enabled in Supabase, the user is not logged in and this silently breaks** (X-10). No "check your inbox" path.
- **Business:** "Crear cuenta gratis" promises free with no plan context.
- **Enterprise:** No company field, no VAT, no invitation-based team signup.
- **Security:** Password policy not enforced/communicated at the UI; no consent audit trail for nDSG.
- **Accessibility:** Good labels; success message not announced.
- **Performance:** — none notable.
- **Visual consistency:** Matches login. Good.
- **Trust:** **2.5/5** — missing legal consent is a red flag to any European business owner.
- **Friction:** The email-confirmation dead-end is a potential hard stop on first run.
- **Terminology swaps:** none.
- **Effort:** M · **Priority:** **P0** (consent + confirmation flow), P1 (strength meter).

### 2.4 Auth — Forgot / Reset password (`/forgot-password`, `/reset-password`)

- **Purpose:** Password recovery.
- **Strengths:** Flow exists end-to-end (recently added), uses Supabase reset.
- **Weaknesses / UX:** Not deeply reviewable without runtime, but same family patterns apply: raw error strings (X-5), Spanish-only (X-1). Needs a clear "email sent, check your inbox (and spam)" confirmation and a friendly expired-link state.
- **Business / Enterprise / Security:** Ensure reset tokens expire and the "email sent" response is identical whether or not the account exists (no account enumeration).
- **Accessibility / Performance / Visual:** Assume parity with login; verify focus + announcements.
- **Trust:** **3/5**.
- **Friction:** Low if the confirmation/empty states are clear.
- **Terminology swaps:** none.
- **Effort:** S · **Priority:** P1.

### 2.5 Onboarding — Create workspace (`/onboarding`, `CreateWorkspaceForm`)

- **Purpose:** First-run setup — create the tenant.
- **Strengths:** Short (name, sector, country), sensible business-type list, good empty-first experience, redirects correctly if already onboarded.
- **Weaknesses / UX:** The word **"workspace"** is developer jargon (X-3) — an SME owner thinks "account" or "my company". Countries are `ES, CH, MX, AR, CO, CL` — **no DE/AT** for the DACH target (X-1). Business types and all copy are Spanish-only. It is a single dead-end form, not a welcoming multi-step wizard that sets expectations ("3 steps: your business → your first assistant → connect WhatsApp").
- **Business:** Missed opportunity to capture company size, use-case, and to set the "aha" path.
- **Enterprise:** No VAT/UID, no billing entity, no data-region choice.
- **Security:** Server-side auth verified before insert (good).
- **Accessibility:** Labels linked; selects usable.
- **Performance:** — none notable.
- **Visual consistency:** Matches auth.
- **Trust:** **3/5** — functional but says "workspace".
- **Friction:** Low, but DACH owner can't pick their country.
- **Terminology swaps:** `workspace → "your company account" / "your business"` · add `Deutschland`, `Österreich`, `Liechtenstein`.
- **Effort:** M · **Priority:** **P0** (DACH countries + de-jargon), P1 (wizard framing).

### 2.6 Dashboard home (`/dashboard`)

- **Purpose:** Orient the owner; show usage; drive next action.
- **Strengths:** Genuinely good — role-labeled welcome, usage cards (messages/agents/documents), a **4-step "next steps" checklist** (Create agent → Configure → Test → Connect WhatsApp), operational alerts, quick links. This is the best-oriented screen in the app.
- **Weaknesses / UX:** Mixes Spanish labels with "workspace", "Human handoff", "Analytics", "Handoffs activos". Steps 3 & 4 link to `#` (dead links) and never show as "done" (hard-coded `done:false`) — the checklist can't actually be completed, which erodes the sense of progress. "Estado workspace: active/trial" exposes internal status enums.
- **Business:** No revenue/leads headline metric ("You captured 4 leads this week") — usage is framed as *consumption limits*, not *value delivered*.
- **Enterprise:** — none notable.
- **Security:** Server-fetched with auth; good.
- **Accessibility:** Color-dot status without text label (X-9).
- **Performance:** Three parallel use-cases; fine.
- **Visual consistency:** Good card system, but this ad-hoc card is re-implemented on every screen (X-7).
- **Trust:** **3.5/5** — the strongest screen.
- **Friction:** Dead `#` steps break the guided path.
- **Terminology swaps:** `workspace → company` · `Human handoff → "Live agent takeover"` · `Handoffs activos → "Conversations waiting for you"`.
- **Effort:** M · **Priority:** P1.

### 2.7 Agent Builder — Wizard (`/dashboard/agents/new`, `AgentWizard`)

- **Purpose:** Create and configure an AI assistant in 5 steps.
- **Strengths:** **The crown jewel.** A real 5-step wizard (Identity → Communication → Services → Lead capture → Preview) with progress bar, back/next, per-step validation, sensible industry/tone/goal presets, and a **live system-prompt preview generated locally**. This is genuinely good product design.
- **Weaknesses / UX:** Step names and fields leak jargon: **"Lead Capture", "escalado", "system prompt", "sandbox"** (X-3). The prompt preview is powerful for a builder but meaningless/scary to an SME owner ("¿por qué me enseñan un texto de instrucciones?"). "País (ej. ES, CH)" as a free-text 2-letter field is error-prone vs a dropdown. No autosave — navigating away loses everything. No "duplicate an example agent / start from a template for my industry" which would massively reduce blank-page friction.
- **Business:** Industry templates ("Cleaning company starter", "Dental practice starter") would be a huge conversion and time-to-value win.
- **Enterprise:** — none notable.
- **Security:** Client builds prompt; server re-validates (good).
- **Accessibility:** The `Field` wrapper renders a `<label>` **not linked to its input** (no `htmlFor`/`id`) — screen-reader and click-to-focus break across the whole wizard.
- **Performance:** All client-side; snappy.
- **Visual consistency:** Consistent within the wizard.
- **Trust:** **3.5/5** — impressive, but the prompt preview + jargon confuse the target buyer.
- **Friction:** Blank-page problem; no templates; lost progress on refresh.
- **Terminology swaps:** `Lead Capture → "What to collect from customers"` · `system prompt / prompt preview → "Preview how your assistant will behave"` · `escalado/handoff → "When to hand over to a human"` · `sandbox → "test chat"`.
- **Effort:** L · **Priority:** P1 (de-jargon + label a11y P0-adjacent), P1 (templates).

### 2.8 Agents list (`/dashboard/agents`, `AgentList`) + Agent detail/edit/prompt

- **Purpose:** Manage assistants.
- **Strengths:** Clean grid, a proper **empty state** ("Aún no tienes agentes activos → Crear tu primer agente"), archived section, limit warnings, disabled create when over plan limit.
- **Weaknesses / UX:** "Agentes de WhatsApp" is fine; sub-pages expose `/prompt` (raw system prompt editing) directly to the owner — powerful but intimidating; should be behind an "Advanced" affordance. Status via badge is okay.
- **Business:** No "activate / connect / test" primary CTA on the card to push the owner down the funnel.
- **Enterprise / Security:** — none notable.
- **Accessibility:** Disabled create is a `<button disabled>` (good), but the two create buttons (Link vs button) differ structurally.
- **Performance:** — none notable.
- **Visual consistency:** Good; reuses ad-hoc cards (X-7).
- **Trust:** **3.5/5**.
- **Friction:** Low.
- **Terminology swaps:** expose `/prompt` as "Advanced instructions".
- **Effort:** M · **Priority:** P2.

### 2.9 Agent Sandbox / Test chat (`/dashboard/agents/[id]/sandbox`, `ChatWindow`)

- **Purpose:** Let the owner test the assistant before going live.
- **Strengths:** Optimistic UI, error recovery, real chat feel, shows the assistant avatar. Great that this exists pre-launch.
- **Weaknesses / UX:** Header literally says **"Modo sandbox · Solo para pruebas"** (X-3/X-4). Below every message it renders **token counts, latency, model name, RAG chunk counts** (`AgentRunMetadata` + `RagContextPreview`) — this is a *developer debug panel* shown to a business owner. It should be hidden behind a "developer/advanced" toggle or removed from the customer view.
- **Business:** The debug metadata actively reduces trust ("why are they showing me tokens?").
- **Enterprise / Security:** — none notable.
- **Accessibility:** No `aria-live` on the streaming/incoming message region; input needs a label.
- **Performance:** Fine.
- **Visual consistency:** Good chat UI.
- **Trust:** **2.5/5** — the debug panel + "sandbox" wording break the illusion of a finished product.
- **Friction:** Confusion, not blockage.
- **Terminology swaps:** `Modo sandbox · Solo para pruebas → "Test chat — try your assistant safely"` · hide tokens/latency/model/chunks by default.
- **Effort:** S–M · **Priority:** P1.

### 2.10 Knowledge Base (`/dashboard/knowledge`, `/new`, `[documentId]`)

- **Purpose:** Upload the business's documents so the assistant answers from them.
- **Strengths:** Empty-friendly, clear "+ Nuevo documento", count, processing status panel exists.
- **Weaknesses / UX:** The name **"Knowledge Base"** and the concept "documents linked to agents / chunks / processing" are engineer framing (X-3). An SME thinks "my price list, my FAQ, my services". No drag-and-drop/file-type guidance visible at this level; "processing" status needs plain-language ("We're reading your document…").
- **Business:** This is a strong value driver ("the assistant knows *your* prices") but it's under-sold by the naming.
- **Enterprise:** Where is the data stored/retained? No statement — matters for nDSG.
- **Security / Accessibility / Performance:** — verify file-type/size limits are communicated; otherwise none notable.
- **Visual consistency:** Good.
- **Trust:** **3/5**.
- **Friction:** Naming confusion.
- **Terminology swaps:** `Knowledge Base → "Your business information" / "What your assistant knows"` · `documents linked to agents → "information your assistants can use"` · `processing/chunks → "reading your document"`.
- **Effort:** M · **Priority:** P1.

### 2.11 Conversations + detail (`/dashboard/conversations`, `[conversationId]`)

- **Purpose:** Read live customer chats, take over, add internal notes, resolve handoffs.
- **Strengths:** Sidebar + chat window + internal notes + assignment + handoff controls — a real shared-inbox. Strong operationally.
- **Weaknesses / UX:** "Human handoff", "internal notes", "assignment" are okay-ish but "handoff" should be "take over". Needs unread indicators, filters (open/waiting/closed), and search to be a usable inbox at volume.
- **Business:** This is where daily value lives — should be reachable in one click and framed as "Inbox".
- **Enterprise:** No audit view of who replied when (exists in data as audit logs, not surfaced).
- **Security / Accessibility / Performance:** Verify real-time updates and `aria-live`; otherwise none notable.
- **Visual consistency:** Good.
- **Trust:** **3.5/5**.
- **Friction:** Low; scales poorly without filters/search.
- **Terminology swaps:** `handoff → "take over" / "hand to a human"` · consider `Conversations → "Inbox"`.
- **Effort:** M–L · **Priority:** P1.

### 2.12 WhatsApp connection (`/dashboard/whatsapp`, `/new`, `[id]`, `/test`)

- **Purpose:** Connect a real WhatsApp number so the assistant goes live.
- **Strengths:** Official **Meta Cloud API** (the right, compliant choice), a mock provider for testing, a dedicated test panel, agent assignment, clear required-field markers, token stored encrypted at rest.
- **Weaknesses / UX:** **This is the single highest-friction screen for an SME.** It asks the owner to paste a **Phone Number ID, WABA ID, and Permanent Access Token**, obtained by navigating "Meta Business → WhatsApp → Configuración API" and "Usuarios del Sistema → Token permanente". A cleaning-company owner *cannot* do this unaided. Options are "Meta Cloud API (Oficial)" and **"Mock (desarrollo local)"** — exposing a dev-only mock to customers (X-4).
- **Business:** Without Embedded Signup (Meta's OAuth onboarding) or a done-for-you setup service, activation — the moment the product starts earning — will have a very low completion rate. This is arguably the #1 revenue-blocking UX problem after trust/legal.
- **Enterprise:** Token handling is encrypted (good); surface that to build trust ("your token is encrypted").
- **Security:** Access token field is `type=password` (good); connection reveals internal `id` in the redirect URL (minor).
- **Accessibility:** Labels present; helper text good.
- **Performance:** — none notable.
- **Visual consistency:** Good.
- **Trust:** **2.5/5** — technically correct but overwhelming; the "Mock" option looks unfinished.
- **Friction:** **Very high** — likely the biggest drop-off in the funnel.
- **Terminology swaps:** hide **Mock** from customers (feature-flag to dev) · wrap the Meta fields in a guided, illustrated "Connect your WhatsApp" flow, ideally Embedded Signup.
- **Effort:** L (guided flow) / XL (Embedded Signup) · **Priority:** **P0** (hide Mock, add guidance), P1/P2 (Embedded Signup).

### 2.13 Leads (`/dashboard/leads`, `[leadId]`)

- **Purpose:** Track captured leads through a pipeline.
- **Strengths:** Cards, status/priority badges, detail panel, assignment, create-from-conversation — a real mini-CRM.
- **Weaknesses / UX:** "Lead" is acceptable business language, but the pipeline needs plain status names and an obvious "what do I do next" per lead. Should surface on the dashboard as the headline value ("You captured N leads").
- **Business:** Strongest ROI story in the app — under-promoted.
- **Enterprise / Security / Accessibility / Performance:** — none notable beyond X-9 (color-only badges).
- **Visual consistency:** Good.
- **Trust:** **3.5/5**.
- **Friction:** Low.
- **Terminology swaps:** ensure status labels are plain ("New / Contacted / Won / Lost").
- **Effort:** S–M · **Priority:** P2.

### 2.14 Analytics (`/dashboard/analytics`, `/agents`, `/leads`, `/usage`)

- **Purpose:** Show performance.
- **Strengths:** Rich — agent performance, channel usage, lead funnel, handoff metrics, AI usage, RAG usage, error events, operational alerts, date filter.
- **Weaknesses / UX:** Much of it is **operator/engineer telemetry** — "RAG usage", "error events", "AI usage (tokens/cost)", "handoff metrics". An SME owner wants three numbers: *conversations handled, leads captured, time saved*. Everything else is secondary and currently given equal weight.
- **Business:** Lead the analytics with business outcomes; move token/RAG/error panels to an "Advanced / System" tab.
- **Enterprise:** Good depth for a future "operations" persona; keep, but gate.
- **Security / Accessibility / Performance:** Multiple cards; verify it stays fast with data. Color-only charts risk (X-9).
- **Visual consistency:** Good card family.
- **Trust:** **3/5** — impressive but overwhelming.
- **Friction:** Cognitive overload.
- **Terminology swaps:** `RAG usage / AI usage / error events → move to "System" tab` · lead with `Conversations · Leads · Response time`.
- **Effort:** M · **Priority:** P2 (re-prioritize headline metrics: P1).

### 2.15 Billing (`/dashboard/settings/billing`)

- **Purpose:** Show plan and (eventually) let the owner pay/upgrade.
- **Strengths:** Usage snapshot, plan readiness card, billing-event history, role-gated to owner/admin.
- **Weaknesses / UX:** It reads as an **internal readiness dashboard, not a customer billing page**: heading sub-copy "Estado del plan y **preparación para facturación real**" (X-4), a section literally titled **"Eventos de billing"**, and a panel showing **"Stripe: not configured"** to the customer. There is **no plan comparison, no price, no upgrade button, no invoices** — the owner cannot see what they'd pay or pay it.
- **Business:** For a "first paying customer" sprint, this screen currently *cannot take money and advertises that it can't*. Even before Stripe is wired, it should present plans/prices and a clear "contact us to upgrade" path — never "Stripe not configured".
- **Enterprise:** No VAT invoice, no billing address, no company details.
- **Security:** Role-gated (good).
- **Accessibility / Performance:** — none notable.
- **Visual consistency:** Good.
- **Trust:** **1.5/5** — the lowest-trust screen; it exposes that billing is unfinished.
- **Friction:** Total — there is no path to purchase.
- **Terminology swaps:** `Eventos de billing → "Billing history"` · `preparación para facturación real → (remove)` · never surface `Stripe: not configured` — show plans/prices instead.
- **Effort:** M (present plans/prices, hide internal state) · **Priority:** **P0** (remove internal readiness wording + show pricing), P1 (real checkout — deferred per CTO).

### 2.16 Settings — Usage & System Health (`/settings/usage`, `/settings/system-health`)

- **Purpose:** Usage detail; system/production readiness checklist.
- **Strengths:** Usage detail is useful; health/readiness checklist is a great *operator* tool.
- **Weaknesses / UX:** **`system-health` / `production-readiness-checklist` should not be in the customer's Settings at all** — it's an internal ops/SRE view ("production readiness", health checks) and it broadcasts that the product is being stood up (X-4). Move behind an admin/staff-only gate.
- **Business:** Zero customer value; potential trust damage.
- **Enterprise:** Useful internally; keep, gate it.
- **Security:** Ensure health details (DB/AI/WhatsApp status) aren't exposed to normal customers.
- **Accessibility / Performance / Visual:** — none notable.
- **Trust:** **2/5** (as a customer-visible screen).
- **Friction:** Confusion.
- **Terminology swaps:** move `System Health` + `Production readiness` out of customer Settings.
- **Effort:** S (gate/hide) · **Priority:** P1.

### 2.17 Admin

- **Purpose:** Platform-owner administration.
- **Finding:** **No dedicated admin area exists** as a customer-facing product surface (there is a `PLATFORM_OWNER_EMAIL` for alerts and health screens). For a paying-customer launch this is acceptable (P2), but a minimal internal admin (see workspaces, suspend, impersonate for support) will be needed operationally soon after.
- **Effort:** L · **Priority:** P2.

### 2.18 Global states — Empty / Loading / Error

- **Empty states:** **Good** — agents, knowledge, leads have friendly empty states with a primary CTA. Keep this standard everywhere.
- **Loading states:** **Weak** — loading is mostly a button label swap ("Creando…", "Iniciando sesión…"). No skeletons on data-heavy pages (dashboard, analytics, conversations). Pages are `force-dynamic` server components, so first paint waits on data with no skeleton. (X-7)
- **Error states:** **Weak** — inline red boxes showing raw messages (X-5); no global toast system; no friendly 404/500 pages (`not-found.tsx` / `error.tsx` absent). Network errors say "Error de conexión" (okay) but backend errors leak through.
- **Priority:** P1 (skeletons + toast + friendly error/404 pages + error-message mapping).

---

## 3. Top 50 improvements (ranked)

Ranking weighs **Business impact × Customer impact ÷ Effort**, with **Risk** breaking ties (legal/trust risk ranked up). P0 = blocks a paying customer; P1 = needed for a confident first sale; P2 = v1.1.

| # | Improvement | Impact | Effort | Prio |
|---|-------------|--------|--------|------|
| 1 | Add **Impressum, Terms, Privacy Policy** + signup consent checkbox (nDSG/GDPR) | Legal blocker | M | P0 |
| 2 | Remove all **"staging / v0.9.0 / preparación para facturación real / Solo para pruebas"** wording | Trust | S | P0 |
| 3 | Introduce **i18n (next-intl)** with **German + English** (ES optional) and a language switcher | Market blocker | L | P0 |
| 4 | Pick **one language per surface**; German-first for DACH; fix nav label mix | Trust | M | P0 |
| 5 | Billing page: **remove "Stripe not configured" & "billing events"**, show **plans + prices** | Revenue/trust | M | P0 |
| 6 | Landing: add a **pricing section** (3 plans, clear CHF prices) | Conversion | M | P0 |
| 7 | **Hide the "Mock" WhatsApp provider** from customers (dev-only flag) | Trust | S | P0 |
| 8 | Add **DACH countries** (DE, AT, CH, LI) to onboarding + agent country dropdown | Market | S | P0 |
| 9 | De-jargon customer copy: workspace→company, sandbox→test chat, handoff→take over, Knowledge Base→"your business info", Lead Capture→"what to collect" | Trust/clarity | M | P0 |
| 10 | Fix **register email-confirmation dead-end** (+ "check your inbox" state) | First-run blocker | M | P0 |
| 11 | Wizard `Field`: **link `<label>` to input** (`htmlFor`/`id`) — a11y across whole builder | A11y/legal | S | P0 |
| 12 | Landing: rewrite feature cards as **outcomes**, not mechanisms | Conversion | M | P0 |
| 13 | Map **backend/Supabase errors to friendly localized messages** | Trust | M | P1 |
| 14 | Sandbox: **hide token/latency/model/RAG debug panel** behind advanced toggle | Trust | S | P1 |
| 15 | WhatsApp: **guided, illustrated "Connect your number" flow** (step-by-step) | Activation | L | P1 |
| 16 | Add **global toast system** for success/error feedback | UX | M | P1 |
| 17 | Add **friendly 404 & 500 pages** (`not-found.tsx`, `error.tsx`) | Trust | S | P1 |
| 18 | Add **skeleton loaders** to dashboard, analytics, conversations | Perceived perf | M | P1 |
| 19 | **Account/profile settings** (name, email, password change) | Table stakes | M | P1 |
| 20 | **Delete-account / data-export** (GDPR erasure & portability) | Legal | M | P1 |
| 21 | Dashboard: fix dead `#` steps 3–4 and make the **checklist actually complete** | Onboarding | S | P1 |
| 22 | Dashboard: lead with a **value metric** ("N leads captured this week") | Retention | S | P1 |
| 23 | Agent wizard: **industry starter templates** (cleaning, dental, etc.) | Time-to-value | L | P1 |
| 24 | **Move System Health / Production Readiness out of customer Settings** (staff-gate) | Trust | S | P1 |
| 25 | Analytics: **lead with business outcomes**, move token/RAG/error to "System" tab | Clarity | M | P1 |
| 26 | Password strength meter + policy hint on register | Security UX | S | P1 |
| 27 | Add **SSO (Microsoft/Entra ID)** login for M365 SMEs | Enterprise trust | L | P1 |
| 28 | Conversations: **filters (open/waiting/closed) + search + unread** | Usability | L | P1 |
| 29 | Landing: add **security/compliance page** (nDSG, data residency, encryption) | Enterprise trust | M | P1 |
| 30 | Landing footer: present as a **company**, add contact/support | Trust | S | P1 |
| 31 | Standardize the **green accent** (one token) across landing + app | Consistency | S | P1 |
| 32 | Add reusable **Input, Card, Select, Badge, Dialog** primitives (design system) | Velocity/consistency | L | P1 |
| 33 | Onboarding: reframe as a **3-step welcome wizard** | Activation | M | P1 |
| 34 | WhatsApp: surface **"your token is encrypted at rest"** trust note | Trust | S | P1 |
| 35 | `aria-live` on chat/inbox message regions + form errors | A11y | S | P1 |
| 36 | Email templates (verify, reset, welcome) **branded + localized** | Trust | M | P1 |
| 37 | Country/phone inputs: **dropdown + validation** (not free-text 2-letter) | UX | S | P1 |
| 38 | Wizard: **autosave / persist progress** across reloads | UX | M | P2 |
| 39 | Knowledge: **file-type/size guidance + plain-language processing** state | Clarity | S | P2 |
| 40 | Leads: plain pipeline statuses + "next action" per lead | CRM UX | S | P2 |
| 41 | WhatsApp **Embedded Signup (Meta OAuth)** to eliminate token pasting | Activation | XL | P2 |
| 42 | Add **in-app help / tooltips** for AI concepts | Support deflection | M | P2 |
| 43 | Contrast pass on `text-white/40` copy (WCAG AA) | A11y | S | P2 |
| 44 | Minimal **internal admin** (list/suspend workspaces, support impersonation) | Ops | L | P2 |
| 45 | **Cookie/consent banner** (if any analytics/marketing scripts added) | Legal | S | P2 |
| 46 | **Notifications settings** (email on new lead/handoff) | Retention | M | P2 |
| 47 | **Team members** management UI (invite/roles) | Collaboration | L | P2 |
| 48 | Agent card: primary **"Test / Connect"** CTA to drive funnel | Activation | S | P2 |
| 49 | Consistent **status = color + text** everywhere (X-9) | A11y/consistency | S | P2 |
| 50 | Add **light mode** (or confirm dark-only is intentional brand) | Preference | M | P2 |

---

## 4. Recommended 4-week implementation roadmap

Goal: reach a state where a real Swiss SME can sign up, understand, trust, set up, and be invoiced — without ever seeing scaffolding. (Stripe checkout implementation is intentionally deferred per CTO direction; billing must still *present* correctly.)

### Week 1 — Trust & Legal (make it sellable / legal to sell)
- #1 Legal pages + consent · #2 remove staging wording · #5 billing de-scaffold + show plans · #6 landing pricing · #7 hide Mock · #24 staff-gate health · #2/#30 company framing.
- **Exit criteria:** No screen reveals "staging/mock/not configured"; legal surface exists; pricing is visible.

### Week 2 — Language & Market (make it DACH-ready)
- #3 next-intl + DE/EN · #4 one-language-per-surface · #8 DACH countries · #9 de-jargon pass · #12 outcome-based landing copy · #37 country/phone inputs.
- **Exit criteria:** Fully German UI available end-to-end; no developer terminology on customer screens.

### Week 3 — First-run & Activation (make it usable)
- #10 register/confirmation flow · #11 wizard label a11y · #14 hide sandbox debug · #15 guided WhatsApp connect · #21/#22 dashboard checklist + value metric · #23 industry templates (start) · #33 welcome wizard.
- **Exit criteria:** A non-technical owner can go signup → assistant → test → connect WhatsApp without help.

### Week 4 — Polish & Confidence (make it feel finished)
- #13 error mapping · #16 toasts · #17 404/500 · #18 skeletons · #19/#20 account + GDPR delete/export · #25 analytics re-prioritization · #31/#32 design-system + accent · #26 password meter · #35 aria-live.
- **Exit criteria:** Consistent feedback, no raw errors, professional empty/loading/error states, GDPR account controls present.

*(P2 items — Embedded Signup, SSO, internal admin, team management, notifications, light mode — scheduled for v1.1.)*

---

## 5. Final deliverable

### Is WAAI ready for the first paying customer?

## **NO.**

The engine is ready. The **product** is not — it currently presents as unfinished, developer-facing, single-market (Spanish) staging software, and it lacks the legal surface required to transact in Switzerland/DACH.

### Blockers (must clear before the first paying customer)

1. **No legal surface** — no Impressum, Terms, Privacy Policy, or signup consent. *Cannot legally sell to a CH/DE SME.* (#1)
2. **"Staging / under construction" signals** across landing, billing and sandbox. *Nobody pays for beta.* (#2)
3. **No German + language chaos** (English landing / Spanish app / mixed nav), no i18n. *DACH market cannot use it.* (#3, #4)
4. **Billing exposes internal state** ("Stripe: not configured", "billing events", "preparación para facturación real") and shows **no prices or plans**. *No visible, credible path to pay.* (#5, #6)
5. **Developer jargon on customer screens** (workspace, sandbox, RAG, handoff, Knowledge Base, Lead Capture) — *fails the 30-second-understanding test.* (#9)
6. **Broken first-run risk** — register email-confirmation dead-end. *A real signup can hard-stop.* (#10)
7. **WhatsApp activation is developer-grade** (paste Phone Number ID / WABA ID / Permanent Access Token) and exposes a **dev "Mock" option**. *The revenue-critical step has an unacceptably low completion rate for SMEs.* (#7, #15)
8. **DACH countries missing** from onboarding (no DE/AT/LI). (#8)
9. **Wizard accessibility defect** — labels not linked to inputs across the entire agent builder. (#11)

Clearing Weeks 1–3 of the roadmap resolves every blocker above.

### If it were YES — improvements that could safely wait for v1.1
Embedded Signup for WhatsApp (#41), Microsoft/Entra SSO (#27), internal admin (#44), team-member management (#47), notification settings (#46), light mode (#50), autosave in the wizard (#38), advanced conversation search/filters at scale (#28), and the full reusable design-system build-out (#32).

---

*Prepared as an objective day-one product review. The goal is not to defend prior decisions — it is to ship an enterprise SaaS that Swiss SMEs love and pay for.*
