---
loga_contract: "ai-engine-ui/v1"
interaction_contract: "loga-choreography/v1"
navigation_contract: "loga-navigation/v1"
projection_type: "operator.project_detail"
projection_id: "project:ai-engine"
source_system: "ai-engine"
source_truth: "sql"
primary_question: "What is happening in this project?"
workspace_mode: "focus"
surface_label: "Project Detail"
allowed_actions:
  - open_related_document
  - refresh_projection
---

# AI Engine

::breadcrumb
- label: "Home"
  target: "/viewer/ai-engine"
  projection_type: "operator.home"

- label: "Projects"
  target: "/viewer/ai-engine/projects"
  projection_type: "operator.project_catalog"

- label: "AI Engine"
  target: "/viewer/ai-engine/projects/ai-engine"
  projection_type: "operator.project_detail"
::

::focus
question: "What is happening in this project?"
answer: "PostgreSQL migration is complete. The system is now focused on governed refactor execution and SDK promotion observability."
status: "active"
::

## Current Focus

::panel
title: "Governed Refactor System Rollout"
status: "in progress"
summary: "Move refactor execution from bespoke scripts into generic wrapper-driven proposals, evidence, and gates."
::

## Open Lanes

::nav
- label: "Roadmap"
  target: "/viewer/ai-engine/projects/ai-engine/roadmap"
  projection_type: "operator.project_roadmap"

- label: "Promotions"
  target: "/viewer/ai-engine/projects/ai-engine/promotions"
  projection_type: "operator.promotions"

- label: "Workflow Runs"
  target: "/viewer/ai-engine/projects/ai-engine/workflow-runs"
  projection_type: "operator.workflow_runs"

- label: "Agent Memory and Turns"
  target: "/viewer/ai-engine/projects/ai-engine/agent-session"
  projection_type: "operator.agent_session"
::

## Recent Attention

::panel
- God-file candidates found: 7
- Open anti-pattern findings: 12
- Proposals awaiting review: 3
::

::next_actions
- Open Roadmap
- Review Promotions
- Inspect Active Workflow Runs
::
