# Project Charter - LOGA Fully Data-Driven Operator Surfaces

## Metadata
- Generated At: 2026-05-06T12:24:15.400227+00:00
- Project ID: 0a2f74ed-11f2-453d-9485-2c8c47c2de75
- Project Slug: loga-fully-data-driven-operator-surfaces

## Summary
- Project Name: LOGA Fully Data-Driven Operator Surfaces
- Process Status: active
- Charter Status: chartered
- Objective: Make operator pages fully data-driven through AI Engine SQL-backed markdown projections and registry contracts with no fixture dependence in production paths.
- Success Criteria: All operator surfaces render from governed AI Engine projection endpoints; fallback-to-fixture is disabled for production routes; data source mappings are backed by documented SDK schemas.
- Business Context: Eliminates drift between UI shell, markdown contracts, and SDK capabilities while enabling governed runtime changes without touching page HTML.

## Scope
### In Scope
- Define SDK method taxonomy and projection coverage gaps
- Add missing LOGA projection endpoints and workflow-run-by-project listing
- Publish response schemas for projection and data-source domain objects
- Wire registry routes/dataSources to documented SDK methods
- Replace transform-only/local fixtures for session and promotions with governed projections

### Out Of Scope
- New visual redesign of operator UI
- Non-operator external client route changes unrelated to projection/data contracts

### Constraints
- SQL is durable source of truth
- LOGA markdown contract headers must remain ai-engine-ui/v1 + loga-choreography/v1
- No silent fixture fallback for production routes

### Assumptions
- Upstream AI Engine team can add projection endpoints in current release window
- SDK docs can publish canonical response schemas for portfolio/roadmap/promotions/workflow domains

## Testing Strategy
- Summary: Validate LOGA Fully Data-Driven Operator Surfaces on its intended local execution surface before any release, promotion, or client-ready determination.
- Validation Surfaces: Approved source roots and local repository state for the chartered change set., The lowest-cost local runtime or execution boundary that proves the charter objective behaves as intended.
- Required Checks: Confirm the reviewed local source revision and the validation boundary being exercised., Run targeted local verification that proves the first chartered delivery slice or equivalent core behavior., Capture reviewable evidence for pass/fail outcome and any remediation notes., Confirm the tested source state is the same candidate state intended for release review or promotion.

## Linked Workflows
No linked workflows are recorded for this charter.

## Policy Evaluations
### charter-activation-gated
- Result: pass
- Scope: process

### charter-roadmap-bound
- Result: pass
- Scope: process

### charter-governance-ready
- Result: pass
- Scope: process

### charter-testing-strategy-defined
- Result: pass
- Scope: process

### charter-scope-bounded
- Result: pass
- Scope: process

### charter-intent-complete
- Result: pass
- Scope: process

## Decision Records
### Bind project scope for LOGA Fully Data-Driven Operator Surfaces
- Decision Record ID: 4e995a07-c2ff-4475-a712-1562276e1093
- Approval Status: human_approved

### Charter project intent for LOGA Fully Data-Driven Operator Surfaces
- Decision Record ID: 7e307803-2acf-4485-a710-3997a761863b
- Approval Status: human_approved
