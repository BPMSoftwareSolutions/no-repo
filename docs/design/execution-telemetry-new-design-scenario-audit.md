# Execution Telemetry New-Design Scenario Audit

## Purpose

This document is the canonical scenario audit for the new execution telemetry UX.
It is not a record of legacy or pre-redesign surfaces.

## Linked design specifications

- Primary design spec: [Execution Substrate Telemetry Design](./execution-substrate-telemetry-design.md)
- Promotion workflow audit: [Execution Telemetry Projection Scenario Audit](./execution-telemetry-projection-scenario-audit.md)

## Scope boundary

Included:
- new markdown-contract-driven execution telemetry UX scenarios
- SDK method exposure per scenario
- operator value and operational effectiveness outcomes

Excluded:
- legacy projection surfaces not part of the new telemetry design
- non-operator internal diagnostics that are not promoted UX scenarios

## Scenario status definitions

- Implemented: scenario has a markdown template in fixtures and is part of new design v1.
- Planned: scenario is part of the new design target model but not yet template-backed.
- Blocked: scenario is planned but cannot proceed due to contract/runtime/SDK constraints.

## New-design scenario inventory

| scenario_key | status | primary_operator_question | primary_sdk_methods | markdown_contract | ui_contract_json | operator_value | lab_verification | promotion_status |
|---|---|---|---|---|---|---|---|---|
| ET-001 execution_substrate_cockpit | Implemented | What is the execution substrate doing right now? | getLatestMemoryProjection, getExecutionTelemetryCurrent, getSessionPerformanceMetrics, listPromotionCandidates, getWorkflowRunSubstrate | fixtures/templates/operator.execution_telemetry_dashboard.md.tmpl | src/renderer/contracts/telemetry/et-001.execution-substrate-cockpit.ui.contract.json (planned path) | Immediate operational posture, friction visibility, next-action clarity | Pending | Draft |
| ET-002 execution_event_stream | Implemented | What happened most recently, in what order, and why? | listExecutionProcessRuns, getWorkflowRunSubstrate | fixtures/templates/operator.execution_telemetry_event_stream.md.tmpl | src/renderer/contracts/telemetry/et-002.execution-event-stream.ui.contract.json (planned path) | Fast incident triage and chronological inspection with newest-first stream | Pending | Draft |
| ET-003 execution_process_run_detail | Planned | What exactly happened in this specific process run? | getExecutionProcessRun | fixtures/templates/telemetry/et-003.execution-process-run-detail.md.tmpl (planned path) | src/renderer/contracts/telemetry/et-003.execution-process-run-detail.ui.contract.json (planned path) | Root-cause depth for command/output/error and retry behavior | Not Started | Draft |
| ET-004 session_metrics_inspection | Planned | Is this session healthy, stale, or degraded over time? | getSessionPerformanceMetrics, getExecutionTelemetryCurrent | fixtures/templates/telemetry/et-004.session-metrics-inspection.md.tmpl (planned path) | src/renderer/contracts/telemetry/et-004.session-metrics-inspection.ui.contract.json (planned path) | Session reliability and heartbeat governance | Not Started | Draft |
| ET-005 workflow_substrate_inspection | Planned | What context fragments and activity signals shaped this workflow run? | getWorkflowRunSubstrate | fixtures/templates/telemetry/et-005.workflow-substrate-inspection.md.tmpl (planned path) | src/renderer/contracts/telemetry/et-005.workflow-substrate-inspection.ui.contract.json (planned path) | Explainability of run evolution and context quality | Not Started | Draft |
| ET-006 promotion_effectiveness_lane | Planned | Which promotion candidates are actionable now? | listPromotionCandidates | fixtures/templates/telemetry/et-006.promotion-effectiveness-lane.md.tmpl (planned path) | src/renderer/contracts/telemetry/et-006.promotion-effectiveness-lane.ui.contract.json (planned path) | Promote high-value learning signals into governed improvements | Not Started | Draft |
| ET-007 execution_schema_drift_surface | Planned | Did runtime detect schema drift or contract violations that block trust? | listExecutionProcessRuns, getWorkflowRunSubstrate (validated through strict contracts) | fixtures/templates/telemetry/et-007.execution-schema-drift-surface.md.tmpl (planned path) | src/renderer/contracts/telemetry/et-007.execution-schema-drift-surface.ui.contract.json (planned path) | Loud-failure visibility for architecture defects and contract drift | Not Started | Draft |

## Modular packaging rule

Each scenario row must declare both:

- `markdown_contract`
- `ui_contract_json`

Scenarios missing either file are not eligible for promotion.

Reference architecture: [Execution Telemetry Modular Contract Architecture](./execution-telemetry-modular-contract-architecture.md)

## SDK exposure coverage (new design)

| sdk_method | scenario_keys | coverage_intent |
|---|---|---|
| getLatestMemoryProjection | ET-001 | Current objective, operator summary, and next action context |
| getExecutionTelemetryCurrent | ET-001, ET-004 | Live status, heartbeat, active/failed/recent process counts |
| listExecutionProcessRuns | ET-002, ET-007 | Paged execution timeline and strict cursor-based chronology |
| getExecutionProcessRun | ET-003 | Deep run detail for failures, retries, and outputs |
| getWorkflowRunSubstrate | ET-001, ET-002, ET-005, ET-007 | Context fragments and recent activity inspection |
| getSessionPerformanceMetrics | ET-001, ET-004 | Session posture and run/session linkage |
| listPromotionCandidates | ET-001, ET-006 | Promotion readiness and operational leverage |

## Operational effectiveness outcomes

| outcome | scenario drivers |
|---|---|
| Faster detection of execution friction | ET-001, ET-004 |
| Faster root-cause analysis | ET-002, ET-003, ET-005 |
| Higher confidence in runtime integrity | ET-007 |
| Better promotion throughput from observed learning | ET-006 |
| Lower operator cognitive load through cohesive narratives | ET-001, ET-002 |

## Promotion rules for this scenario set

A scenario can move to Promoted only when all are true:

1. markdown contract exists and is versioned
2. scenario UI contract JSON exists and is versioned
3. Contract Lab verification passes at http://localhost:5000/lab.html
4. separation boundaries hold (markdown vs JSON contract vs generic JS runtime)
5. fail-fast checks pass (no fallback-only behavior, no silent schema coercion)
6. audit row is updated with verifier and timestamp

## Next implementation targets (ordered)

1. ET-003 execution_process_run_detail
2. ET-004 session_metrics_inspection
3. ET-005 workflow_substrate_inspection
4. ET-006 promotion_effectiveness_lane
5. ET-007 execution_schema_drift_surface
