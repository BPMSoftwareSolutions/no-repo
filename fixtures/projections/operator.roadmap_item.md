---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.roadmap_item"
projection_id: "roadmap-item:generic-wrapper-runtime"
source_truth: "sql"
primary_question: "What is being worked right now?"
---

# Roadmap Item
## Establish Generic Wrapper Runtime

::focus
question: "What is being worked right now?"
answer: "Replacing bespoke scripts with contract-driven wrapper execution."
status: "in progress"
::

## Item Status

::panel
priority: "high"
owner: "operator"
progress: "2 / 4 tasks complete"
blockers: 1
risk: "medium"
::

## Tasks

::task_list
- key: "define-contract-schema"
  title: "Define wrapper contract schema"
  status: "done"
  owner: "operator"

- key: "implement-wrapper-operations"
  title: "Implement reusable wrapper operations"
  status: "in progress"
  owner: "operator"

- key: "replace-hard-coded-scripts"
  title: "Replace hard-coded wrapper scripts"
  status: "blocked"
  owner: "operator"

- key: "validate-execution-evidence"
  title: "Validate wrapper execution evidence"
  status: "not started"
  owner: "operator"
::

## Current Task

::panel
title: "Replace hard-coded wrapper scripts"
status: "blocked"
summary: "The system must replace bespoke source/destination rewrite behavior with generic contract-driven operations."
::

::next_actions
- Open blocker
- Continue implementation
- Submit for review
::
