# AI Engine Upstream Fixes

This document lists the fixes needed in the upstream AI Engine repo, based on the repo-less client experiments.

The client workspace must not patch AI Engine source directly. It can diagnose through the API, package evidence, and submit governed upstream requests.

## Mental Model

The upstream fixes should be treated as refactoring-strategy work, not just endpoint cleanup.

Core principle:

```text
Governance is not a wrapper around work.
Governance is the work protocol.
```

The SDK/API should become the governed operational language the AI is allowed to speak:

```text
intent
-> SDK discovery
-> SDK contract
-> SDK execution
-> SDK evidence
-> SDK promotion
```

The old loop to eliminate:

```text
intent
-> write script
-> dump data
-> edit locally
-> push JSON
-> hope it works
```

Rule for evaluating every upstream gap:

```text
If an agent writes a local script to compensate for a missing governed SDK operation,
that is not productivity. It is a missing SDK surface.
```

The SDK should make the governed path faster, clearer, and more complete than the local workaround path.

## Current Boundary

```text
API discovery: PASS
Failure attribution: PASS
Governed evidence submission: PASS
Direct repo mutation avoided: PASS
Local tests: PASS
Upstream emitter fix: PENDING
```

## Refactoring Strategy

Use these fixes to move AI Engine toward a governed language catalog: a map of verbs the AI already needs and the SDK/API affordances that should formalize those verbs.

Priority verbs:

```text
discover
inspect
retrieve
start
declare
lock
plan
validate
approve
execute
verify
submitEvidence
queuePromotion
promote
project
report
```

For each verb, upstream should identify:

```text
existing API route
existing SDK method
SQL source of truth
wrapper/evidence surface
missing SDK affordance
risk if the AI improvises locally
```

This gives AI Engine a concrete product rule:

```text
No workflow is production-ready until the SDK covers every step
the AI would otherwise improvise.
```

### Escape-Hatch Risks To Design Against

| Instinct | Risk | Upstream countermeasure |
| --- | --- | --- |
| Fetch-and-freeze | Local file becomes fake authority | Return inspectable bounded packets with provenance |
| Script-the-gap | Bespoke workflow grows around platform gaps | Add opinionated SDK flows for missing steps |
| File-as-contract | Contract lineage becomes ambiguous | Use typed contract builders and SQL persistence |
| Manual promotion | Bypasses wrapper evidence | Queue promotion packets through governed API |
| Narrative evidence | Governance theater | Emit wrapper-produced structured evidence |
| Local planning loop | Markdown/checklists become live state | Persist plan, contract, evidence, and queue in SQL |
| API choreography script | Safe sequence is not encoded | Add end-to-end SDK workflow methods |
| Repo checkout reflex | Breaks repo-less posture | Provide intent search and bounded context packets |

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

Mental-model requirement:

```text
This is not an API transport fix.
It is a projection-language fix.
The emitter must speak the governed LOGA UX language directly.
```

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

Refactoring strategy:

```text
Replace prompt -> local draft markdown -> manual feedback
with prompt -> governed LOGA contract draft -> SQL-backed evidence -> iteration gate.
```

Suggested SDK shape:

```ts
await client.loga.createProjectionContractDraft({
  intent,
  projectionType,
  requiredPrimitives,
  canonicalQuestions,
  sourceTruth: "sql",
});

await client.loga.validateProjectionContractDraft(draftId);
await client.loga.submitProjectionFeedback(draftId, feedback);
```

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

Refactoring strategy:

```text
Do not make LOGA projection support a set of bespoke one-off routes.
Model it as a projection contract workflow:
projection intent -> source read model -> markdown contract -> render evidence -> feedback -> next iteration.
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

Refactoring strategy:

```text
Replace repo checkout reflex with governed discovery verbs.
```

Suggested SDK shape:

```ts
await client.code.searchByIntent({
  intent,
  mode: "repo_less",
});

await client.code.getContextForIntent({
  intent,
  maxCandidates,
});
```

This should produce inspectable packets, not local file dumps.

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

Refactoring strategy:

```text
Replace raw evidence JSON posting with a typed evidence builder.
```

Suggested SDK shape:

```ts
const evidence = await client.evidence.buildImplementationItemEvidence({
  itemId,
  evidenceType,
  evidenceRef,
  summary,
  details,
});

await client.evidence.validate(evidence);
await client.evidence.submit(evidence);
```

The builder should include the required claim fields:

```text
claimed_item_id
agent_session_id
claim_workflow_run_id
execution_type
execution_purpose
```

## Fix 6: Governed Refactor Workflow SDK

### Status

```text
Priority: high for large-file decomposition
State: missing opinionated workflow
```

### Problem

AI agents default to file-system-first refactoring:

```text
read file
write scripts
split code locally
patch imports
submit narrative evidence
```

That is the wrong operational language for repo-less and governed work.

### Required Capability

Add an opinionated governed refactor workflow:

```ts
await client.refactors.createPlanFromIntent({
  intentText,
  sourceFilePath,
  mode: "repo_less",
});

await client.refactors.getPlan(planId);
await client.refactors.renderPlanForReview(planId);
await client.refactors.approvePlan(planId);
await client.refactors.executeWrapper(planId);
await client.refactors.getEvidence(planId);
await client.refactors.queuePromotion(planId);
await client.refactors.getPromotionQueue();
```

The workflow should persist:

```text
source_file_id/path
responsibility map
destination module map
allowed blast radius
validation requirements
files created
files modified
operation records
ownership diff
validation output
queued promotion record
gate decision
```

### Acceptance

```text
The repo-less agent can request, inspect, approve, execute, evidence, and queue a refactor without writing local files or direct patches.
```

## Fix 7: Governed Language Catalog

### Status

```text
Priority: medium
State: needed for SDK roadmap prioritization
```

### Required Capability

Build a catalog across:

| Source | Extract |
| --- | --- |
| SDK/client | method names and domains |
| API routes | route verbs such as create, submit, approve, review, execute |
| SQL | tables/procedures/views for truth, gates, packets, evidence |
| Code symbols | service/store function names that already express governance behavior |

Output:

```text
Top 10 missing SDK verbs causing escape hatches
Top 10 duplicated/bespoke language patterns
Top 10 governance verbs mature enough to standardize
Top 10 SQL-truth surfaces missing SDK language
```

Example catalog entry:

```json
{
  "verb": "approve",
  "domain": "governance",
  "existing_surfaces": [
    "governance review API",
    "roadmap approval workflow",
    "gate decision records"
  ],
  "sdk_gap": "client.governance.approveDecision(...)",
  "risk_if_missing": "AI may post raw JSON or write local approval notes",
  "priority": "top_10"
}
```

## Readout

```text
The repo-less client loop is working.
AI Engine now needs upstream projection and discovery surfaces to close the remaining gaps.
LOGA is acting as the UX gate, not just a renderer.
The SDK should become a domain-specific operational language that constrains AI behavior into governed, replayable, evidence-producing workflows.
```
