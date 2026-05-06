---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.evidence_packet"
projection_id: "evidence:generic-wrapper-runtime"
source_truth: "sql"
primary_question: "Why should I trust this?"
workspace_mode: "evidence"
surface_label: "Evidence Packet"
---

# Evidence Packet
## Generic Wrapper Runtime

::focus
question: "Why should I trust this?"
answer: "The proposed execution model requires wrapper-origin evidence, planned-vs-actual ownership, and gate validation."
status: "review"
::

## Evidence Summary

::panel
- wrapper execution record: required
- operation records: required
- file manifest: required
- planned vs actual ownership: required
- gate decision: required
::

## Execution Record

::evidence_drawer
{
  "wrapper_name": "governed_refactor_wrapper",
  "execution_type": "governed_god_file_refactor_execution",
  "status": "pending",
  "contract_required": true
}
::

## Verification Requirements

::checklist
- status: "required"
  text: "Every planned moved responsibility appears in a destination file"

- status: "required"
  text: "Retained source responsibility is the only responsibility left in source"

- status: "required"
  text: "Source file collapses to approved coordinator role"

- status: "required"
  text: "No manual patch evidence is accepted"
::

## Decision

::panel
decision: "not ready"
reason: "Wrapper execution evidence has not been produced yet."
::
