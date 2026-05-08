# Execution Telemetry Modular Contract Architecture

## Purpose

Define the modular packaging model for execution telemetry UX so every scenario/page
has its own markdown contract and its own UI contract JSON.

This replaces monolithic contract packaging and enables scenario-by-scenario
validation in Contract Lab.

## Current state

This document describes the target architecture. The current runtime still loads
`src/renderer/markdown-ui-elements.json` for the existing markdown contract system
and must be migrated incrementally. The first modular scenario scaffolds now exist
for ET-001 and ET-002, but they are not yet wired into the live runtime.

## Design goals

- Per-scenario markdown files
- Per-scenario UI contract JSON files
- Generic runtime execution only
- No bespoke page logic in JavaScript
- No monolithic all-in-one markdown/UI contract file

## Non-negotiable rules

1. Every scenario must have exactly one scenario markdown contract file.
2. Every scenario must have exactly one scenario UI contract JSON file.
3. A scenario is not testable in modular Contract Lab unless both files exist.
4. Promotion is blocked if a scenario depends on monolith-only contract entries.
5. Runtime cannot hardcode scenario names or telemetry-specific render branches.

## File layout (new design)

```text
fixtures/templates/telemetry/
  et-001.execution-substrate-cockpit.md.tmpl
  et-002.execution-event-stream.md.tmpl
  et-003.execution-process-run-detail.md.tmpl
  et-004.session-metrics-inspection.md.tmpl
  et-005.workflow-substrate-inspection.md.tmpl
  et-006.promotion-effectiveness-lane.md.tmpl
  et-007.execution-schema-drift-surface.md.tmpl

src/renderer/contracts/telemetry/
  et-001.execution-substrate-cockpit.ui.contract.json
  et-002.execution-event-stream.ui.contract.json
  et-003.execution-process-run-detail.ui.contract.json
  et-004.session-metrics-inspection.ui.contract.json
  et-005.workflow-substrate-inspection.ui.contract.json
  et-006.promotion-effectiveness-lane.ui.contract.json
  et-007.execution-schema-drift-surface.ui.contract.json
```

## Runtime loading model

Given a scenario key, the target runtime will:

1. resolve markdown path from scenario audit
2. resolve UI contract JSON path from scenario audit
3. validate both artifacts exist
4. render using generic runtime
5. fail fast on missing/invalid contract artifacts

No runtime fallback to monolithic contract file is allowed.

Implementation note: this is the desired loading model for the modular runtime,
not the current browser implementation.

## Contract Lab workflow

Lab URL: http://localhost:5000/lab.html

For each scenario:

1. load markdown scenario content in lab
2. select/load matching scenario UI contract JSON
3. verify declarative blocks, bindings, iterators, actions, and navigation
4. record Pass/Fail in scenario audit
5. promote only after approval

## Migration from monolith

Current anti-pattern:
- `src/renderer/markdown-ui-elements.json` contains broad mixed concerns for all pages

Migration approach:

1. freeze monolith growth (no new scenario definitions added there)
2. create scenario JSON contracts for ET-001 and ET-002 first
3. move scenario-specific entries from monolith into per-scenario contract files
4. remove migrated scenario dependencies from monolith
5. repeat until ET-001..ET-007 all have standalone contracts
6. block promotion for any scenario still requiring monolith-only entries

Current audit implication:
- ET-001 and ET-002 have scaffold artifacts checked in but are not modular-ready.
  Their promotion_status is Blocked until runtime wiring is complete and Contract
  Lab verification passes with non-empty scenario-level UI contract elements.

**Projection type transition.**
- `operator.execution_substrate_cockpit` (ET-001) replaces `operator.execution_telemetry_dashboard`.
- The legacy type `operator.execution_telemetry_dashboard` is deprecated. Do not use it for new scenarios.
- `operator.execution_telemetry_event_stream` (ET-002) retains its type; no change.
- Any routing or projection registry that still references `operator.execution_telemetry_dashboard`
  must be migrated to `operator.execution_substrate_cockpit` as part of the modular rollout.

**Minimum required UI contract schema.**
A scenario UI contract JSON is not promotion-eligible if it contains only empty objects.
The minimum required content for a promotable contract is:

```json
{
  "schema": "ai-engine-ui/v1",
  "scenario_key": "ET-XXX",
  "projection_type": "operator.<scenario_type>",
  "elements": { /* at least one block type declaration for elements used in the markdown */ },
  "styles": { /* at least scenario-scoped CSS tokens */ },
  "media": {}
}
```

Scaffold files with empty `elements` and `styles` pass existence checks but fail promotion.
The distinction is intentional: existence checks validate that files are registered;
promotion checks validate that they carry meaningful rendering policy.

## Validation checklist

- markdown exists for scenario
- UI contract JSON exists for scenario
- runtime resolves both artifacts declaratively
- no scenario-specific JS branch required
- no fallback to monolith path
- Contract Lab pass is recorded

## Failure modes (loud)

- `telemetry_missing_markdown_contract`
- `telemetry_missing_ui_contract_json`
- `telemetry_invalid_ui_contract_schema`
- `telemetry_runtime_monolith_dependency_detected`
- `telemetry_runtime_domain_logic_detected`

## Expected outcome

A maintainable telemetry UX system where each scenario is independently designed,
tested, promoted, and evolved without cross-page contract coupling.
