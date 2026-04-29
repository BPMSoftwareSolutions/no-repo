# Experiment 1 Implementation Instruction

## Instruction

```text
Fix the Experiment 1 failure in the AI Engine projection emitter.

Find the implementation that builds getLogaOperatorHomeProjection() markdown.

Change the operator.home markdown template itself. Do not change the harness.

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

Acceptance:
npm test passes.
npm run loga:experiment reports zero Experiment 1 UX contract shape gaps.
```

## Readout

```text
The evidence loop is now complete; only the actual projection emitter remains unfixed.
```
