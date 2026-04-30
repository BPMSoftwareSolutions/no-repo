---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.agent_session"
projection_id: "project:ai-engine:agent-session"
source_truth: "sql"
primary_question: "What is the agent doing?"
---

# Agent Session
## Memory and DB Turns

::focus
question: "What is the agent doing?"
answer: "Agent is executing refactor workflow under claim scope and persisting DB turns."
status: "active"
::

## Current Turn

::panel
objective: "Advance generic wrapper runtime implementation"
status: "active"
claim_id: "claim-refactor-runtime-example"
workflow_run_id: "workflow-run-example"
agent_session_id: "agent-session-example"
::

## Memory

::memory
- tier: "required"
  reminder: "Wrapper is the only mutation authority"

- tier: "required"
  reminder: "No local scripts as authority"

- tier: "required"
  reminder: "SQL is durable truth; markdown is projection"
::

## DB Turn History

::turn_list
- turn: 1
  action: "startWork"
  status: "persisted"
  evidence: "claim acquired"

- turn: 2
  action: "analyze candidate"
  status: "persisted"
  evidence: "responsibility map produced"

- turn: 3
  action: "propose contract"
  status: "pending"
  evidence: "awaiting wrapper evidence"
::

::nav
- label: "Workflow Runs"
  target: "/viewer/ai-engine/projects/ai-engine/workflow-runs"
  projection_type: "operator.workflow_runs"

- label: "Promotions"
  target: "/viewer/ai-engine/projects/ai-engine/promotions"
  projection_type: "operator.promotions"

- label: "Evidence Packet"
  target: "/viewer/ai-engine/projects/ai-engine/evidence/generic-wrapper-runtime"
  projection_type: "operator.evidence_packet"
::
