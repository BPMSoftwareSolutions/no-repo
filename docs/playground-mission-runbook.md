# Playground Mission Runbook

## Mission

Use the repo-less playground to validate two things:

1. Human-facing projections can be inspected safely and clearly
2. Repo/code inspection can identify refactor candidates without mutation

This runbook is the execution companion to:

* `docs/Experiment Test Plan.md`
* `docs/Client UX Inspection Test Suite.md`
* `docs/playground-ux-test-plan-clean.md`
* `docs/approval-review-fixture.md`

## Current Working Rule

```text
SQL truth -> governed retrieval -> local experiment -> submitted evidence -> wrapper mutation -> gate decision
```

Local work may inspect, summarize, and shape evidence.
Local work may not become mutation authority.

## What To Run

### 1. Connectivity

```powershell
npm run ping
```

Pass when the client can reach AI Engine and return a healthy response.

### 2. Experiment Harness

```powershell
npm run experiment
```

Pass when the harness returns:

* contract stub
* wrapper execution record shape
* per-operation log
* gate-ready evidence payload
* missing capability findings

### 3. LOGA Projection Harness

```powershell
npm run loga:experiment
```

Use this to validate:

* `operator.home`
* projection metadata
* canonical question coverage
* missing-surface findings for unsupported projection types

### 4. Evidence Shape

```powershell
npm run loga:evidence:shape
```

Use this when you need a gate-ready payload without submitting anything upstream.

### 5. UX Gate Fixture

```powershell
node ./scripts/test-ux-gate.mjs
```

Use this to verify the approval review fixture against the review-mode UX gate rules.

## What To Check

### Projection lane

* `operator.home` includes `::focus`, `::evidence_drawer`, and `::next_actions`
* All five canonical questions appear somewhere in the projection
* Raw payloads stay secondary to the human summary
* Missing or unsupported surfaces fail explicitly

### Inspection lane

* Symbol-oriented retrieval works when symbol names are known
* Missing intent-search capability is treated as a finding, not a failure
* Code inspection remains read-only
* Refactor candidate output stays contract-shaped and non-mutating

## Expected Findings To Preserve

* `getSymbolDefinition()` is available
* `getRelatedCode()` is available
* intent-based code search is still missing
* repo-less discovery is constrained without symbol foreknowledge
* approval review remains the next high-value fixture

## Decision Points

### If projection UX passes

Move to the next missing surface or fixture, starting with approval review.

### If projection UX fails

Treat it as a projection-shape issue first, not a transport issue.

### If inspection UX fails

Check whether the failure is:

* missing symbol discovery
* missing related-code traversal
* missing repository metadata
* a bad assumption about repo access

## Next Best Step

If you want the mission to keep moving, the most useful next artifact is an approval review fixture that exercises:

* ready-to-approve
* missing-evidence
* revise-needed
* reject/block
* explicit approve / revise / reject actions

That would extend the current projection work into a safer decision surface.
