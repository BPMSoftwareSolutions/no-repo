---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.workflow_runs"
projection_id: "project:ai-engine:workflow-runs"
source_truth: "sql"
primary_question: "What is currently running?"
---

# Workflow Runs

::focus
question: "What is currently running?"
answer: "Refactor workflow is active. Architecture review is waiting for evidence."
status: "active"
::

## Active Runs

::run_list
- key: "refactor-runtime"
  title: "Generic Wrapper Runtime Refactor"
  status: "running"
  stage: "implementation"

- key: "architecture-review"
  title: "Architecture Integrity Review"
  status: "waiting"
  stage: "evidence review"
::

## Last Completed Run

::panel
title: "PostgreSQL Authority Transition"
status: "completed"
duration: "1m 32s"
result: "PASS"
::

::nav
- label: "CI/CD Status"
  target: "/viewer/ai-engine/projects/ai-engine/cicd"
  projection_type: "operator.cicd_status"

- label: "Agent Session"
  target: "/viewer/ai-engine/projects/ai-engine/agent-session"
  projection_type: "operator.agent_session"

- label: "Evidence Packet"
  target: "/viewer/ai-engine/projects/ai-engine/evidence/generic-wrapper-runtime"
  projection_type: "operator.evidence_packet"
::
