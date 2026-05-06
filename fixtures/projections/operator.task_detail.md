---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.task_detail"
projection_id: "task:replace-hard-coded-scripts"
source_truth: "sql"
primary_question: "What needs to happen?"
workspace_mode: "execution"
surface_label: "Task Detail"
---

# Task
## Replace Hard-coded Wrapper Scripts

::focus
question: "What needs to happen?"
answer: "Convert bespoke wrapper script behavior into generic wrapper operations driven by approved contracts."
status: "blocked"
::

## Implementation Steps

::checklist
- status: "done"
  text: "Identify hard-coded source and destination paths"

- status: "in progress"
  text: "Extract reusable wrapper operation model"

- status: "blocked"
  text: "Bind operation records to SQL-backed wrapper evidence"

- status: "not started"
  text: "Replace script path with SDK-visible governed execution"
::

## Blocker

::panel
title: "Missing promoted SDK surface"
status: "blocked"
summary: "The refactor wrapper execution path exists conceptually, but the SDK needs a paved method for creating, approving, executing, and observing refactor plans."
::

## Evidence

::evidence_drawer
- script analysis
- anti-pattern mapping
- responsibility map
- proposed wrapper operation set
::

::next_actions
- Promote refactor SDK methods
- Record missing surface
- Resume task after SDK promotion
::
