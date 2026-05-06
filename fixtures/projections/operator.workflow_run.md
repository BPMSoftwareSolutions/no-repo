---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.workflow_run"
projection_id: "workflow-run:refactor-runtime"
source_truth: "sql"
primary_question: "What happened in this run?"
---

# Workflow Run
## Generic Wrapper Runtime Refactor

::breadcrumb
- label: "Workflow Runs"
  target: "/viewer/ai-engine/projects/ai-engine/workflow-runs"
  projection_type: "operator.workflow_runs"
::

::focus
question: "What happened in this run?"
answer: "Refactor execution is active. Wrapper contract is being applied to the target module."
status: "running"
::

## Run Status

::panel
title: "Generic Wrapper Runtime Refactor"
status: "running"
stage: "implementation"
started: "in progress"
owner: "operator"
::

## Steps

::checklist
- status: "done"
  text: "Claim acquired"

- status: "done"
  text: "Responsibility map produced"

- status: "in progress"
  text: "Wrapper contract applied"

- status: "not started"
  text: "Evidence packet captured"

- status: "not started"
  text: "Gate decision recorded"
::

## Evidence

::evidence_drawer
title: "Run evidence"
- workflow_run_id: refactor-runtime
- claim_id: claim-refactor-runtime
- status: running
- stage: implementation
::

::next_actions
- Review wrapper contract
- Inspect evidence packet
- Open agent session
::
