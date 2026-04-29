# Experiment 1 Upstream Implementation Request

## Status

```text
Harness: complete
Evidence propagation: complete
Regression findings: complete
Implementation instruction: complete
AI Engine emitter: pending
```

## Request

Ask the AI Engine repo agent to locate and patch the `operator.home` LOGA projection emitter.

```text
Fix the Experiment 1 failure in the AI Engine projection emitter.

Find the implementation that builds getLogaOperatorHomeProjection() markdown.

Change the operator.home markdown template itself. Do not change the no-repo harness.

Required emitted markdown body:

# Operator Home

::focus
question: "What should I care about right now?"
answer: "[summarize current operator priority from SQL projection]"
status: "[pass | needs-gate-review | blocked | unknown]"
::

## What is happening?

::panel
[summarize transport/governance/project/workflow state]
::

## What should I care about?

::panel
[summarize active blockers, gate-review needs, or current focus]
::

## What do I decide?

::panel
[summarize whether operator approval/review/retry is needed]
::

## Why trust this?

::evidence_drawer
- source_truth: sql
- projection_type: operator.home
- contract: ai-engine-ui/v1
- evidence_result: [value]
- correlation_id: [value if present]
- source_version: [value if present]
::

## What next?

::next_actions
- Review gate evidence
- Open active project
- Open workflow details
- Refresh projection
::
```

## Validation

After the upstream emitter change:

```bash
npm test
npm run loga:experiment
```

Success condition:

```text
zero Experiment 1 UX contract shape gaps
```

## API-Located Upstream Surface

Located through AI Engine repo inventory and symbol/code-window APIs, not by direct repo checkout.

```text
repository: ai-engine
file_path: ./src/orchestration/loga_projection_service.py
class: LogaProjectionService
methods:
- build_operator_home_projection
- render_operator_home
qualified_symbol: src.orchestration.loga_projection_service.LogaProjectionService.render_operator_home
code_file_id: d71a8f00-e468-42db-a4d1-28064a71e3ee
```

Relevant emitted-template evidence:

```text
render_operator_home currently emits:
- # Operator Home
- ::surface
- ## Portfolio Summary
- ::panel
- ::metric_row
- ## Priority Projects
- ::table
- ## Navigation
- ::nav
- ## Next Actions
- ::next_actions
```

It does not emit the required `::focus`, `::evidence_drawer`, or canonical question sections.

## Failing Projection Evidence

Fetched through `getLogaOperatorHomeProjection()`.

```text
failing_projection_type: operator.home
endpoint: getLogaOperatorHomeProjection()
loga_contract: ai-engine-ui/v1
source_truth: sql
content_type: text/markdown; charset=utf-8
text_char_count: 2148
emitted_by_ai_engine: true
```

Contract gaps:

```text
missing_blocks_observed:
- ::focus
- ::evidence_drawer

required_blocks_for_gate:
- ::focus
- ::evidence_drawer
- ::next_actions

present_required_blocks_observed:
- ::next_actions
```

Missing canonical labels:

```text
- What is happening?
- What should I care about?
- What do I decide?
- Why trust this?
- What next?
```

Required fix:

```text
Patch the AI Engine operator.home projection emitter markdown template.
Do not add endpoints.
Do not change the no-repo harness.
Do not perform direct repo mutation from the client workspace.
```

## Governed Evidence Submission

Submitted through the AI Engine client to the active LOGA integration implementation item.

```text
project: LOGA Structured Markdown BFF Integration
project_id: e188d2d6-c12c-4597-a8a5-9f4f79dd41f3
implementation_item_id: 6e9756eb-f0cb-4793-91e3-5b1da03d1d19
implementation_packet_id: 26edf2ac-d45d-4b7e-b808-db12514b5843
evidence_ref: no-repo:loga-experiment-1:operator-home-contract-gap
evidence_type: loga_ux_contract_regression
evidence_link_id: e6ce933d-172a-45e6-a234-2e95e23290fb
recorded_by: shared-api-key-client
created_at: 2026-04-29T11:48:48.338804
```

## Readout

```text
LOGA is acting as the UX gate, not just a renderer.
The evidence loop is complete; only the actual AI Engine projection emitter remains unfixed.
```
