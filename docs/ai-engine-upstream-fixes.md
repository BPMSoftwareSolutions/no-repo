# AI Engine Upstream Fixes

This document lists the fixes needed in the upstream AI Engine repo, based on the repo-less client experiments.

The client workspace must not patch AI Engine source directly. It can diagnose through the API, package evidence, and submit governed upstream requests.

## Current Boundary

```text
API discovery: PASS
Failure attribution: PASS
Governed evidence submission: PASS
Direct repo mutation avoided: PASS
Local tests: PASS
Upstream emitter fix: PENDING
```

## Fix 1: Operator Home LOGA Projection Shape

### Status

```text
Priority: high
State: pending upstream implementation
Evidence submitted: yes
```

### Upstream Surface

Located through AI Engine repo inventory and code-window APIs.

```text
repository: ai-engine
file_path: ./src/orchestration/loga_projection_service.py
class: LogaProjectionService
method: render_operator_home
qualified_symbol: src.orchestration.loga_projection_service.LogaProjectionService.render_operator_home
code_file_id: d71a8f00-e468-42db-a4d1-28064a71e3ee
```

### Evidence

```text
evidence_ref: no-repo:loga-experiment-1:operator-home-contract-gap
evidence_link_id: e6ce933d-172a-45e6-a234-2e95e23290fb
implementation_item_id: 6e9756eb-f0cb-4793-91e3-5b1da03d1d19
```

### Problem

`getLogaOperatorHomeProjection()` returns a governed `operator.home` projection with valid transport metadata, but the emitted markdown body does not satisfy the Experiment 1 LOGA UX contract gate.

Keep:

```text
endpoint: getLogaOperatorHomeProjection()
projection_type: operator.home
loga_contract: ai-engine-ui/v1
source_truth: sql
```

Missing from emitted markdown:

```text
::focus
::evidence_drawer
What is happening?
What should I care about?
What do I decide?
Why trust this?
What next?
```

`::next_actions` is currently present, but it should remain unconditional.

### Required Patch

Patch `LogaProjectionService.render_operator_home`.

Do not add a new endpoint. Do not change the no-repo harness.

Required emitted markdown shape:

```text
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

### Validation

From the client workspace after upstream deployment/sync:

```bash
npm test
npm run loga:experiment
```

Success condition:

```text
zero Experiment 1 UX contract shape gaps
```

## Fix 2: Governed Prompt-To-LOGA Contract Generation Surface

### Status

```text
Priority: medium
State: missing surface
```

### Problem

The client can read existing LOGA projections, but it cannot ask AI Engine to emit a new arbitrary markdown UI contract from an experiment prompt.

Current missing-surface finding:

```json
{
  "finding_type": "missing_surface",
  "surface": "prompt_to_loga_markdown_contract_generation",
  "impact": "cannot_ask_ai_engine_to_emit_a_new_arbitrary_markdown_ui_contract_from_the_experiment_prompt"
}
```

### Required Capability

Add a governed surface that accepts:

```text
projection intent
target projection type
required primitives
canonical question model
source truth requirements
evidence posture requirements
```

It should return a bounded markdown contract draft or an explicit unsupported/gated response.

## Fix 3: Missing LOGA Projection Surfaces For Experiment Set 2

### Status

```text
Priority: medium
State: partially unsupported
```

### Existing Runnable Surfaces

```text
Operator Home Dashboard -> getLogaOperatorHomeProjection()
Animated Workflow Playback -> getWorkflowPlayback(workflowRunId), requires workflow run id
Project Roadmap Command Center -> getLogaProjectRoadmapProjection(projectId), requires project id
Evidence Trust Drawer -> getLogaEvidencePacketProjection(packetKey), requires evidence packet key
```

### Unsupported Direct Surfaces

The harness currently records these as unsupported:

```text
Approval Review Surface
Diagnostic Failure Surface
Execution Live Monitor
Comparison / Before-After UI
Human Mental Model Workspace
Polished Demo Projection
```

### Required Capability

Add governed LOGA projection endpoints, or explicitly document which existing endpoint should be used, for:

```text
approval review
diagnostic failure explanation
execution live monitor
projection version comparison
human mental model workspace
polished demo projection
```

Each should preserve:

```text
source_truth: sql
contract: ai-engine-ui/v1
governed projection metadata
evidence drawer posture
clear next actions
```

## Fix 4: Intent Code Search For Repo-Less Discovery

### Status

```text
Priority: high for full repo-less autonomy
State: missing surface
```

### Problem

Known-symbol lookup works, but autonomous repo-less discovery is not yet viable without prior symbol knowledge.

Finding:

```json
{
  "finding_type": "missing_surface",
  "surface": "intent_code_search",
  "impact": "repo_less_operator_requires_prior_symbol_knowledge"
}
```

### Required Capability

Add governed intent code search before claiming full repo-less agent readiness.

The surface should support:

```text
natural-language code intent
bounded ranked file/symbol/responsibility candidates
provenance
confidence/ranking explanation
ambiguous/not_found/unsupported outcomes
bridge into symbol definition and related-code retrieval
```

## Fix 5: Governed Evidence Submission Ergonomics

### Status

```text
Priority: low-medium
State: working but discoverability could improve
```

### Observed Contract

`addImplementationItemEvidence()` works when the payload includes:

```text
evidence_ref
claimed_item_id
agent_session_id
claim_workflow_run_id
execution_type
execution_purpose
```

Initial submissions failed usefully with:

```text
evidence_ref is required
missing_execution_intent
```

### Required Improvement

Make the evidence submission contract easier for clients to discover by exposing one of:

```text
typed SDK helper
schema endpoint
preflight validation endpoint
clearer README examples for evidence submission
```

## Readout

```text
The repo-less client loop is working.
AI Engine now needs upstream projection and discovery surfaces to close the remaining gaps.
LOGA is acting as the UX gate, not just a renderer.
```
