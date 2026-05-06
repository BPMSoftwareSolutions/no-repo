---
loga_contract: "ai-engine-ui/v1"
interaction_contract: "loga-choreography/v1"
navigation_contract: "loga-navigation/v1"
projection_type: "operator.project_roadmap"
projection_id: "project:ai-engine:roadmap"
source_system: "ai-engine"
source_truth: "sql"
primary_question: "What should I care about right now?"
workspace_mode: "focus"
surface_label: "Project Roadmap"
allowed_actions:
  - open_roadmap_item
  - open_evidence_packet
  - refresh_projection
---

# Roadmap
## AI Engine

::breadcrumb
- label: "AI Engine"
  target: "/viewer/ai-engine/projects/ai-engine"
  projection_type: "operator.project_detail"

- label: "Roadmap"
  target: "/viewer/ai-engine/projects/ai-engine/roadmap"
  projection_type: "operator.project_roadmap"
::

::focus
question: "What should I care about right now?"
answer: "Wrapper standardization is incomplete. This blocks safe automated refactoring and SDK promotion confidence."
status: "in progress"
::

## Current Focus

::panel
title: "Establish Generic Wrapper Runtime"
status: "in progress"
owner: "operator"
summary: "Replace bespoke refactor scripts with contract-driven wrapper execution and gate-verifiable evidence."
::

## Implementation Roadmap

::each source="roadmap_items" block="roadmap"
- key: "{{key}}"
  title: "{{title}}"
  status: "{{status}}"
  priority: "{{priority}}"
  progress: "{{progress}}"
  target: "{{target}}"
::

## Why This Matters

- Current wrappers are bespoke.
- Bespoke scripts violate governed execution.
- SDK promotions need observable adoption and downstream status.
- Workflows, CI/CD, memory, and DB turns must be visible from the same project surface.

## Drill Down

::nav
- label: "Open Current Item"
  target: "/viewer/ai-engine/projects/ai-engine/roadmap/generic-wrapper-runtime"
  projection_type: "operator.roadmap_item"

- label: "View Evidence"
  target: "/viewer/ai-engine/projects/ai-engine/evidence/generic-wrapper-runtime"
  projection_type: "operator.evidence_packet"

- label: "View Promotions"
  target: "/viewer/ai-engine/projects/ai-engine/promotions"
  projection_type: "operator.promotions"

- label: "View Workflow Runs"
  target: "/viewer/ai-engine/projects/ai-engine/workflow-runs"
  projection_type: "operator.workflow_runs"
::

::next_actions
- Open current roadmap item
- Review refactor candidate
- Approve decomposition contract
::
