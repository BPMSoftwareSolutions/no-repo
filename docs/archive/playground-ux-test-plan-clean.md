# Playground UX Test Plan

## Purpose

Use this plan to validate the repo-less playground against two goals:

1. Projection UX must help a human understand and act
2. Code inspection UX must help identify refactor candidates without mutation

## Existing Harnesses

* `npm run ping`
* `npm run experiment`
* `npm run loga:experiment`
* `npm run loga:evidence:shape`
* `scripts/test-ux-gate.mjs`
* `docs/approval-review-fixture.md`

## What We Are Testing

### Projection lane

* Can the client connect to AI Engine?
* Can operator, project, workflow, and evidence projections load?
* Does each projection expose LOGA/provenance metadata?
* Does the UI lead with one clear human question?
* Is evidence hidden behind a drawer instead of front-loading raw JSON?
* Do unsupported or missing surfaces fail clearly?

### Repo inspection lane

* Can the client inspect code safely for refactor candidates?
* Can it identify large, orchestration-heavy, or responsibility-dense files?
* Can it cluster symbols into responsibilities?
* Can it suggest boundaries and blast radius without generating patches?

## Acceptance Criteria

* `operator.home` passes the UX gate shape requirements
* Approval review fixture passes its review-mode assertions
* Missing surfaces are reported as findings, not hallucinated
* Inspection output stays read-only and governance-friendly
* The plan produces evidence and remediation instructions, not edits

## Guardrails

* No direct SQL
* No direct workflow mutation
* No repo writes
* No treating markdown as authority
* No patch generation from the playground

## Suggested Next Step

Run the existing harnesses, confirm the current findings, and use them to drive upstream fixture or projection changes.
