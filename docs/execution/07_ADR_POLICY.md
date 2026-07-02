# WAAI — Architecture Decision Record Policy
**Document Type:** Governance  
**Version:** 1.0  
**Date:** 2026-07-02  
**Status:** Authoritative  
**Next ADR number:** ADR-0008

---

## Purpose

Architecture Decision Records (ADRs) are the audit trail of WAAI's technical reasoning. They exist to prevent the most expensive engineering failure mode: re-litigating settled decisions, or worse, unknowingly reversing them.

An ADR is not bureaucracy. An ADR is insurance against the following scenarios:
- New engineer joins and "improves" an approach that was tried and rejected 18 months ago
- Vendor changes pricing and the team doesn't know why we chose that vendor over the alternative
- A security audit asks "why does your webhook handler trust this header" and nobody knows

Every ADR written takes 30 minutes. Every undocumented decision reversed costs 2–5 days.

---

## Current ADR Inventory

| ADR | Title | Status | Date |
|---|---|---|---|
| ADR-0001 | Tech Stack Selection | Accepted | 2025 |
| ADR-0002 | Supabase Public Schema and waai_ Prefix | Accepted | 2025 |
| ADR-0003 | WhatsApp Provider Abstraction | Accepted | 2025 |
| ADR-0004 | LLM Provider Abstraction | Accepted | 2025 |
| ADR-0005 | Embedding Model and RAG Strategy | Accepted | 2025 |
| ADR-0006 | Plan Limits and Usage Enforcement | Accepted | 2025 |
| ADR-0007 | WhatsApp Business API Onboarding | Accepted | 2025 |
| ADR-0008 | (next available) | — | — |

---

## When an ADR is Mandatory

An ADR is **required** before implementation begins for any decision that falls into one of the following categories:

### Category 1 — Data Architecture
- Introduction of a new database table (beyond simple CRUD extension of existing entity)
- Schema change that affects existing RLS policies
- Change to the `waai_` prefix convention (ADR-0002 — effectively immutable)
- Introduction of a new index type (e.g., IVFFlat → HNSW migration for pgvector)
- Introduction of a new data storage technology (Redis, ClickHouse, S3, etc.)

### Category 2 — Provider and External Integrations
- Introduction of a new provider interface (extending ADR-0003, ADR-0004, ADR-0005 pattern)
- Selection of a new external API or service dependency
- Change of vendor for an existing capability (e.g., replacing Resend with SendGrid)
- Change of AI model default routing logic

### Category 3 — Security and Compliance
- Any change to the authentication flow
- Any change to the authorisation / RBAC model
- Introduction of a new data encryption approach
- Change to secret management strategy
- Any decision with compliance implications (Swiss DSG, GDPR, ISO 27001, SOC 2)

### Category 4 — Architecture Patterns
- Introduction of a new architectural pattern not already in use (e.g., event sourcing, CQRS)
- Change to the Clean Architecture layer separation rules
- Introduction of a new async queue or job system (e.g., Inngest)
- Breaking change to the 14-step `AgentRuntimeService` pipeline
- Introduction of a microservice or service extraction from the monolith

### Category 5 — Public Contracts
- Launch of any public API that external developers will depend on (`/api/v1/`)
- Introduction of the MCP Server interface
- Release of the TypeScript or Python SDK

### When an ADR is NOT Required
- Bug fixes
- UI styling changes
- Adding a new Zod validator
- Adding a new repository method for an existing table
- Adding a new use case that follows the existing pattern
- Updating dependencies to patch versions
- Adding new unit tests

**Rule of thumb:** If two senior engineers would disagree about the right approach, it needs an ADR. If it's the obvious next step in an established pattern, it doesn't.

---

## ADR Format

All ADRs must follow this template exactly. File name: `ADR-{NNNN}-{kebab-case-title}.md` in `docs/adr/`.

```markdown
# ADR-{NNNN} — {Title}
**Date:** YYYY-MM-DD  
**Status:** Proposed | Under Review | Accepted | Deprecated | Superseded by ADR-XXXX  
**Deciders:** {Names of ARB members who participated}  
**Related:** ADR-XXXX (if builds on or supersedes another ADR)

---

## Context

What is the problem or situation this decision addresses?  
What constraints exist (technical, business, compliance, time)?  
What has been tried before (if anything)?

---

## Decision

The decision made, stated as an action: "We will..." or "We will not..."  
Be specific. Describe exactly what is being decided, not just the outcome.

---

## Options Considered

### Option A — {Name}
Description.  
**Pros:** ...  
**Cons:** ...

### Option B — {Name}
Description.  
**Pros:** ...  
**Cons:** ...

### Chosen: Option {X}
Rationale: why this option over the others.  
Specifically address the trade-offs that were most important in the decision.

---

## Consequences

**Positive:**
- What becomes easier or possible

**Negative / Trade-offs:**
- What becomes harder or more expensive

**Risks:**
- What could go wrong

**Neutral:**
- What changes without being clearly positive or negative

---

## Implementation Notes

How this decision is implemented (file paths, patterns, code examples if helpful).  
This section is updated after implementation completes.
```

---

## ADR Approval Workflow

```
1. PROPOSED
   Engineer identifies a decision requiring an ADR.
   Engineer writes the ADR draft (all sections).
   ADR is shared in team channel with @architecture-review tag.
   ADR status set to "Proposed".
   
   ↓ (within 48 hours)
   
2. UNDER REVIEW
   ARB members review. Comments added to ADR file or inline.
   If consensus: proceed to Accepted.
   If objections: synchronous ARB meeting called (Thursday architecture sync or async Slack thread).
   
   ↓ (within 48 hours of review starting)
   
3. ACCEPTED or REJECTED
   ACCEPTED: ADR merged to main. Implementation may begin.
   REJECTED: ADR status set to "Rejected" with rejection reason. Implementation does not begin.
   
   ↓ (after implementation)
   
4. IMPLEMENTATION NOTES UPDATED
   Implementing engineer adds "Implementation Notes" section to the ADR.
   ADR linked in the PR description.
```

### ARB Composition

| Role | Member | Vote Weight |
|---|---|---|
| CTO (Chair) | Max Vidal-Reñao | Tie-breaking vote |
| Principal Architect | (designate in Phase B) | Full vote |
| Head of Backend | (designate in Phase B) | Full vote |
| Head of Frontend | (designate in Phase B) | Advisory |

For Phase A (pre-team): CTO reviews all ADRs unilaterally. Process formalises at Phase B.

**Quorum:** 3 of 4 ARB members must participate. Absent member's silence after 48h counts as approval (not abstention).

---

## ADR Lifecycle

### DEPRECATED
An ADR is deprecated when it describes a decision that is no longer current but the documentation is still relevant history. Add `**Status:** Deprecated — superseded by ADR-XXXX` and a link.

### SUPERSEDED
When a later ADR replaces an earlier one, both ADRs must be updated:
- Old ADR: `**Status:** Superseded by ADR-XXXX`
- New ADR: `**Related:** Supersedes ADR-XXXX`

### IMMUTABLE ADRs
The following ADRs are treated as immutable — they cannot be superseded without explicit board approval:
- **ADR-0002** — `waai_` prefix. All DB tables in production use this prefix. Changing it requires a full migration of all tables.
- **ADR-0006** — Plan limits and billing enforcement. Changing billing logic requires financial and legal review.

---

## ADR Review Checklist (for ARB Reviewers)

- [ ] Problem context is clearly stated
- [ ] All reasonable options are considered (not just the chosen one)
- [ ] Trade-offs are honestly stated (including negatives of the chosen option)
- [ ] Decision is consistent with existing ADRs (no conflicts with ADR-0001 through ADR-0007)
- [ ] Security implications addressed (or explicitly noted as out of scope)
- [ ] Compliance implications addressed (DSG, GDPR) if applicable
- [ ] Implementation approach is feasible given team capacity
- [ ] Decision does not introduce undue technical debt without a payoff timeline
