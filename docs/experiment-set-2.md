# Experiment Set 2: Human-Friendly Markdown UI Projections

## Goal

Validate whether AI Engine can emit governed LOGA markdown UI contract projections that are useful as human-facing operator surfaces.

Grounding rule:

```text
Every governed workflow should emit a markdown experience contract.
LOGA becomes the fast UX lab for inspecting it.
```

Expected reusable governed UX primitives:

- `::focus`
- `::panel`
- `::metric_row`
- `::evidence_drawer`
- `::nav`
- `::next_actions`

## Current Harness

Run the LOGA projection experiment harness:

```bash
npm run loga:experiment
```

By default, this runs Experiment 1 only:

```text
AI_ENGINE_LOGA_EXPERIMENTS=1
```

Run all experiment probes:

```powershell
$env:AI_ENGINE_LOGA_EXPERIMENTS = "all"
npm run loga:experiment
```

Shape evidence without calling AI Engine:

```bash
npm run loga:evidence:shape
```

The harness emits:

- contract stub
- wrapper execution record shape
- LOGA projection operation log
- markdown contract quality observations
- missing projection surface findings
- gate-ready evidence payload

Authority is still local-only:

```json
{
  "authority": "local_experiment_only",
  "submission_status": "not_submitted"
}
```

## Required Environment

```powershell
$env:AI_ENGINE_API_KEY = "your-api-key"
$env:AI_ENGINE_BASE_URL = "https://your-ai-engine-host"
```

Optional identifier inputs for experiments that need scoped projections:

```powershell
$env:AI_ENGINE_LOGA_PROJECT_ID = "project-id"
$env:AI_ENGINE_LOGA_ROADMAP_ITEM_KEY = "roadmap-item-key"
$env:AI_ENGINE_LOGA_WORKFLOW_RUN_ID = "workflow-run-id"
$env:AI_ENGINE_LOGA_EVIDENCE_PACKET_KEY = "evidence-packet-key"
```

## Experiment Matrix

| # | Experiment | Current SDK Surface | Harness Status |
| -: | --- | --- | --- |
| 1 | Operator Home Dashboard | `getLogaOperatorHomeProjection()` | Runnable |
| 2 | Animated Workflow Playback | `getWorkflowPlayback(workflowRunId)` | Blocked until workflow run id is provided |
| 3 | Project Roadmap Command Center | `getLogaProjectRoadmapProjection(projectId)` | Blocked until project id is provided |
| 4 | Evidence Trust Drawer | `getLogaEvidencePacketProjection(packetKey)` | Blocked until evidence packet key is provided |
| 5 | Approval Review Surface | none found | Unsupported |
| 6 | Diagnostic Failure Surface | none found | Unsupported |
| 7 | Execution Live Monitor | none found | Unsupported |
| 8 | Comparison / Before-After UI | none found | Unsupported |
| 9 | Human Mental Model Workspace | none found | Unsupported |
| 10 | Polished Demo Projection | none found | Unsupported |

## Standard Experiment Loop

For each experiment:

```text
1. AI Engine serves or emits a markdown UI contract.
2. LOGA renders the projection.
3. The operator inspects clarity, flow, animation usefulness, dashboard usefulness, human-friendliness, and evidence posture.
4. The operator gives feedback.
5. Feedback becomes a precise AI instruction.
6. AI Engine emits the next iteration.
7. Repeat until ready for readout.
```

## Acceptance Bar

Each projection should answer the canonical question model:

- What is happening?
- What should I care about?
- What do I decide?
- Why trust this?
- What next?

## First Experiment Prompt

```text
Create a LOGA markdown UI contract for an Operator Home Dashboard.

Goal:
Show the operator what needs attention right now across projects, workflows, blockers, and evidence.

Use:
- ::focus
- ::panel
- ::metric_row
- ::nav
- ::evidence_drawer
- ::next_actions

Design target:
Human-friendly, clean, dashboard-like, animated-ready, not a raw system dump.

Primary question:
What should I care about right now?

Avoid:
- leading with IDs
- raw JSON as the main view
- too many equal-priority metrics
- generic dashboard clutter
```

## Expected Finding

The current client exposes LOGA projection reads, but not an arbitrary prompt-to-contract generation endpoint. The harness records that explicitly:

```json
{
  "finding_type": "missing_surface",
  "surface": "prompt_to_loga_markdown_contract_generation",
  "impact": "cannot_ask_ai_engine_to_emit_a_new_arbitrary_markdown_ui_contract_from_the_experiment_prompt"
}
```

## Current Readout Label

```text
LOGA projection inspection is viable for existing governed projection endpoints, but not yet viable for arbitrary prompt-driven markdown UI contract generation.
```

## Experiment 1 Correction

Latest readout:

```text
Experiment 1 status:
Transport/governance: PASS
Correction payload propagation: PASS
UX contract shape: FAIL
Next step: remediate projection template, not API transport.
```

Correction payload:

[Experiment 1 Correction Payload](experiment-1-correction-payload.md)

Remediation instruction:

[Experiment 1 Remediation Instruction](experiment-1-remediation-instruction.md)

Implementation instruction:

[Experiment 1 Implementation Instruction](experiment-1-implementation-instruction.md)

Upstream implementation request:

[Experiment 1 Upstream Implementation Request](experiment-1-upstream-implementation-request.md)

Governed evidence submission:

```text
evidence_ref: no-repo:loga-experiment-1:operator-home-contract-gap
evidence_link_id: e6ce933d-172a-45e6-a234-2e95e23290fb
implementation_item_id: 6e9756eb-f0cb-4793-91e3-5b1da03d1d19
```

Consolidated upstream fixes:

[AI Engine Upstream Fixes](ai-engine-upstream-fixes.md)
