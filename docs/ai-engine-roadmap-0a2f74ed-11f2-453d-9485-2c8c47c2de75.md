---
loga_contract: "ai-engine-ui/v1"
interaction_contract: "loga-choreography/v1"
navigation_contract: "loga-navigation/v1"
projection_type: "operator.project_roadmap"
projection_id: "project-roadmap:0a2f74ed-11f2-453d-9485-2c8c47c2de75"
projection_version: "1"
source_system: "ai-engine"
source_truth: "sql"
source_version: "workflow_run:a68b5730-2584-4459-b012-6864ba49c92d"
correlation_id: "3d497e052e0281905ac7a35beab8ccef"
transformation_workflow:
  slug: "loga-document-projection"
  posture: "governed"
generated_at: "2026-05-06T12:23:57.748363+00:00"
refresh_policy: "manual"
allowed_actions:
  - refresh_projection
  - open_evidence
  - view_active_item_tasks
---

# Project Roadmap
## LOGA Fully Data-Driven Operator Surfaces

::surface type="operator_project" priority="high" summary="Workflow run is blocked and the active roadmap item is confirm-project-intent."
::

## Status Summary

::panel type="status_summary" status="blocked" completion="0" headline="Confirm project intent is the current execution slice."
::

::metric_row
Total Items: 8
Completed: 0
Open: 8
Workflow Run: blocked
::

## Current State

::kv
Project ID: 0a2f74ed-11f2-453d-9485-2c8c47c2de75
Workflow Run Status: blocked
Current Stage: Approve project charter
Current Owner: shared-api-key-client
Implementation Packet: impl-project-loga-fully-data-driven-operator-surfaces-0a2f74ed-v1
::

## Active Item

::panel type="active_item" status="awaiting_review" title="Confirm project intent"
::

::kv
Item Key: confirm-project-intent
Status: awaiting_review
Depends On: n/a
Open Acceptance Checks: 2
Open Tasks: 0
::

::nav
- label: "Open Item Detail"
  target: "/viewer/ai-engine/projects/0a2f74ed-11f2-453d-9485-2c8c47c2de75/roadmap/items/confirm-project-intent"
  relation: "child"
  projection_type: "operator.roadmap_item"
  projection_id: "roadmap-item:0a2f74ed-11f2-453d-9485-2c8c47c2de75:confirm-project-intent"

::

## Phase Summary

### Charter foundation

::panel type="phase_summary" status="pending"
::

::metric_row
Total Items: 0
Done: 0
In Progress: 0
Awaiting Review: 0
::

### Charter foundation

::panel type="phase_summary" status="pending"
::

::metric_row
Total Items: 0
Done: 0
In Progress: 0
Awaiting Review: 0
::

### Execution foundation

::panel type="phase_summary" status="pending"
::

::metric_row
Total Items: 0
Done: 0
In Progress: 0
Awaiting Review: 0
::

### Governed delivery

::panel type="phase_summary" status="pending"
::

::metric_row
Total Items: 0
Done: 0
In Progress: 0
Awaiting Review: 0
::

### Governed delivery

::panel type="phase_summary" status="pending"
::

::metric_row
Total Items: 0
Done: 0
In Progress: 0
Awaiting Review: 0
::

### Governed delivery

::panel type="phase_summary" status="pending"
::

::metric_row
Total Items: 0
Done: 0
In Progress: 0
Awaiting Review: 0
::

### Governed delivery

::panel type="phase_summary" status="pending"
::

::metric_row
Total Items: 0
Done: 0
In Progress: 0
Awaiting Review: 0
::

### Governed delivery

::panel type="phase_summary" status="pending"
::

::metric_row
Total Items: 0
Done: 0
In Progress: 0
Awaiting Review: 0
::

## Roadmap Items

::table id="roadmap_items"
| Item Key | Title | Status | Phase | Evidence |
|---|---|---|---|---|
| confirm-project-intent | Confirm project intent | awaiting_review | Charter foundation | 0 |
| bind-scope-boundaries | Bind scope boundaries | not_started | Charter foundation | 0 |
| establish-governed-execution-structure | Establish governed execution structure | not_started | Execution foundation | 0 |
| execute-scope-1 | Define SDK method taxonomy and projection coverage gaps | not_started | Governed delivery | 0 |
| execute-scope-2 | Add missing LOGA projection endpoints and workflow-run-by-project listing | not_started | Governed delivery | 0 |
| execute-scope-3 | Publish response schemas for projection and data-source domain objects | not_started | Governed delivery | 0 |
| execute-scope-4 | Wire registry routes/dataSources to documented SDK methods | not_started | Governed delivery | 0 |
| execute-scope-5 | Replace transform-only/local fixtures for session and promotions with governed projections | not_started | Governed delivery | 0 |
::

## Open Tasks

::empty_state
message="No open implementation tasks are currently recorded."
::

## Evidence

::evidence_drawer title="Roadmap evidence" source="ai-engine.sql" collapsed="true"
```json
{
  "active_item": {
    "charter_status": "chartered",
    "current_owner": "shared-api-key-client",
    "current_stage": "Approve project charter",
    "depends_on": "",
    "evidence_count": 0,
    "implementation_item_id": "ec043582-0ff7-429a-bf16-08ac9f4e94d9",
    "implementation_packet_id": "3c09a01a-28a6-4c76-81df-0b50227e267d",
    "implementation_packet_key": "impl-project-loga-fully-data-driven-operator-surfaces-0a2f74ed-v1",
    "implementation_packet_status": "approved",
    "item_key": "confirm-project-intent",
    "item_status": "awaiting_review",
    "item_title": "Confirm project intent",
    "latest_activity_at": "2026-05-06 12:19:47.806223",
    "latest_activity_summary": "Implementation item status changed to awaiting_review.",
    "latest_linked_step_run_at": "2026-05-06 12:19:39.885889",
    "linked_step_run_count": 1,
    "matches_current_stage": false,
    "open_acceptance_check_count": 2,
    "open_task_count": 0,
    "phase_key": "phase_1_charter_foundation",
    "phase_title": "Charter foundation",
    "priority": "high",
    "process_status": "active",
    "project_id": "0a2f74ed-11f2-453d-9485-2c8c47c2de75",
    "project_name": "LOGA Fully Data-Driven Operator Surfaces",
    "project_slug": "loga-fully-data-driven-operator-surfaces",
    "stable_item_key": "<intent-anchor>",
    "status_reason": "Approval step Approve project charter is waiting for review.",
    "total_task_count": 0,
    "updated_at": "2026-05-06 12:19:40.335147",
    "workflow_id": "cbd50be2-1626-4b8c-af12-ca86770fbfa4",
    "workflow_run_id": "a68b5730-2584-4459-b012-6864ba49c92d",
    "workflow_run_status": "blocked",
    "workflow_slug": "project-loga-fully-data-driven-operator-surfaces"
  },
  "active_item_tasks": [],
  "project_summary": {
    "blocking_cause": "No active blocking condition is currently recorded.",
    "blocking_mode": "active",
    "business_context": "Eliminates drift between UI shell, markdown contracts, and SDK capabilities while enabling governed runtime changes without touching page HTML.",
    "charter_status": "chartered",
    "closed_at": null,
    "current_owner": "shared-api-key-client",
    "current_stage": "Approve project charter",
    "decision_record_count": 2,
    "implementation_packet_id": "3c09a01a-28a6-4c76-81df-0b50227e267d",
    "implementation_packet_key": "impl-project-loga-fully-data-driven-operator-surfaces-0a2f74ed-v1",
    "implementation_packet_status": "approved",
    "implementation_packet_title": "LOGA Fully Data-Driven Operator Surfaces Project Charter Roadmap",
    "is_waiting_on_human": false,
    "last_updated_at": "2026-05-06 12:19:59.841453",
    "latest_policy_code": "charter-activation-gated",
    "latest_policy_evaluated_at": "2026-05-06 12:19:59.638454",
    "latest_policy_reason": "Project activation is blocked on charter governance review.",
    "latest_policy_result": "pass",
    "latest_policy_severity": "review",
    "linked_workflow_count": 0,
    "next_expected_action": "Continue execution from the persisted current stage.",
    "objective": "Make operator pages fully data-driven through AI Engine SQL-backed markdown projections and registry contracts with no fixture dependence in production paths.",
    "opened_at": "2026-05-06 12:19:07.981321",
    "policy_evaluation_count": 6,
    "policy_fail_count": 0,
    "policy_pass_count": 6,
    "policy_review_count": 0,
    "policy_summary": {
      "evaluation_count": 6,
      "fail_count": 0,
      "latest_evaluated_at": "2026-05-06T12:19:59.638454",
      "pass_count": 6,
      "review_count": 0
    },
    "priority": "high",
    "process_status": "active",
    "process_type": "project-charter",
    "project_id": "0a2f74ed-11f2-453d-9485-2c8c47c2de75",
    "project_name": "LOGA Fully Data-Driven Operator Surfaces",
    "project_slug": "loga-fully-data-driven-operator-surfaces",
    "snapshot": {
      "decision_record_ids": [
        "7e307803-2acf-4485-a710-3997a761863b",
        "4e995a07-c2ff-4475-a712-1562276e1093"
      ],
      "implementation_packet_id": "3c09a01a-28a6-4c76-81df-0b50227e267d",
      "implementation_packet_key": "impl-project-loga-fully-data-driven-operator-surfaces-0a2f74ed-v1",
      "initial_context": {},
      "intent": {
        "business_context": "Eliminates drift between UI shell, markdown contracts, and SDK capabilities while enabling governed runtime changes without touching page HTML.",
        "objective": "Make operator pages fully data-driven through AI Engine SQL-backed markdown projections and registry contracts with no fixture dependence in production paths.",
        "priority": "high",
        "project_name": "LOGA Fully Data-Driven Operator Surfaces",
        "success_criteria": "All operator surfaces render from governed AI Engine projection endpoints; fallback-to-fixture is disabled for production routes; data source mappings are backed by documented SDK schemas."
      },
      "linked_workflow_bindings": [],
      "linked_workflows": [],
      "policy_evaluations": [
        {
          "action_type": "governance",
          "description": "Project charter intent must include an explicit project name and objective.",
          "evaluated_at": "2026-05-06T12:19:56.811234",
          "evaluation_context_json": {
            "intent": {
              "business_context": "Eliminates drift between UI shell, markdown contracts, and SDK capabilities while enabling governed runtime changes without touching page HTML.",
              "objective": "Make operator pages fully data-driven through AI Engine SQL-backed markdown projections and registry contracts with no fixture dependence in production paths.",
              "priority": "high",
              "project_name": "LOGA Fully Data-Driven Operator Surfaces",
              "success_criteria": "All operator surfaces render from governed AI Engine projection endpoints; fallback-to-fixture is disabled for production routes; data source mappings are backed by documented SDK schemas."
            },
            "recorded_by": "shared-api-key-client"
          },
          "evaluation_id": "38a21a96-4fbf-4eb5-b04b-5998762d091e",
          "evaluation_reason": "Project name and objective are present.",
          "evaluation_result": "pass",
          "evaluation_scope": "process",
          "evaluator_type": "project_chartering_service",
          "policy_code": "charter-intent-complete",
          "policy_version": "project-charter-v1",
          "process_instance_id": "0a2f74ed-11f2-453d-9485-2c8c47c2de75",
          "proposal_id": null,
          "severity": "block",
          "workflow_id": "cbd50be2-1626-4b8c-af12-ca86770fbfa4",
          "workflow_run_id": "a68b5730-2584-4459-b012-6864ba49c92d"
        },
        {
          "action_type": "governance",
          "description": "Project charter scope should capture boundaries, constraints, or explicit assumptions.",
          "evaluated_at": "2026-05-06T12:19:57.392281",
          "evaluation_context_json": {
            "recorded_by": "shared-api-key-client",
            "scope": {
              "assumptions": [
                "Upstream AI Engine team can add projection endpoints in current release window",
                "SDK docs can publish canonical response schemas for portfolio/roadmap/promotions/workflow domains"
              ],
              "constraints": [
                "SQL is durable source of truth",
                "LOGA markdown contract headers must remain ai-engine-ui/v1 + loga-choreography/v1",
                "No silent fixture fallback for production routes"
              ],
              "in_scope": [
                "Define SDK method taxonomy and projection coverage gaps",
                "Add missing LOGA projection endpoints and workflow-run-by-project listing",
                "Publish response schemas for projection and data-source domain objects",
                "Wire registry routes/dataSources to documented SDK methods",
                "Replace transform-only/local fixtures for session and promotions with governed projections"
              ],
              "out_of_scope": [
                "New visual redesign of operator UI",
                "Non-operator external client route changes unrelated to projection/data contracts"
              ]
            }
          },
          "evaluation_id": "bcaf0247-d916-4c9c-a3d7-d559eae1aeca",
          "evaluation_reason": "Scope boundaries or constraints are recorded.",
          "evaluation_result": "pass",
          "evaluation_scope": "process",
          "evaluator_type": "project_chartering_service",
          "policy_code": "charter-scope-bounded",
          "policy_version": "project-charter-v1",
          "process_instance_id": "0a2f74ed-11f2-453d-9485-2c8c47c2de75",
          "proposal_id": null,
          "severity": "review",
          "workflow_id": "cbd50be2-1626-4b8c-af12-ca86770fbfa4",
          "workflow_run_id": "a68b5730-2584-4459-b012-6864ba49c92d"
        },
        {
          "action_type": "governance",
          "description": "Every project charter must declare the local testing strategy and evidence boundary that governs validation before release review.",
          "evaluated_at": "2026-05-06T12:19:57.959549",
          "evaluation_context_json": {
            "recorded_by": "shared-api-key-client",
            "testing_strategy": {
              "business_context_alignment": "Eliminates drift between UI shell, markdown contracts, and SDK capabilities while enabling governed runtime changes without touching page HTML.",
              "evidence_sources": [
                "Project charter packet and implementation roadmap evidence.",
                "Workflow run artifacts, review notes, and any targeted local test outputs captured during validation."
              ],
              "objective_alignment": "Make operator pages fully data-driven through AI Engine SQL-backed markdown projections and registry contracts with no fixture dependence in production paths.",
              "release_boundary": "Do not treat charter execution as release-ready until the local testing strategy has been executed on the intended validation surface and the evidence is recorded.",
              "required_checks": [
                "Confirm the reviewed local source revision and the validation boundary being exercised.",
                "Run targeted local verification that proves the first chartered delivery slice or equivalent core behavior.",
                "Capture reviewable evidence for pass/fail outcome and any remediation notes.",
                "Confirm the tested source state is the same candidate state intended for release review or promotion."
              ],
              "root_paths": [],
              "summary": "Validate LOGA Fully Data-Driven Operator Surfaces on its intended local execution surface before any release, promotion, or client-ready determination.",
              "validation_surfaces": [
                "Approved source roots and local repository state for the chartered change set.",
                "The lowest-cost local runtime or execution boundary that proves the charter objective behaves as intended."
              ]
            }
          },
          "evaluation_id": "a9c0d0c7-db28-499f-9f43-a0207eb7507d",
          "evaluation_reason": "Testing strategy summary, validation surfaces, and required checks are recorded.",
          "evaluation_result": "pass",
          "evaluation_scope": "process",
          "evaluator_type": "project_chartering_service",
          "policy_code": "charter-testing-strategy-defined",
          "policy_version": "project-charter-v1",
          "process_instance_id": "0a2f74ed-11f2-453d-9485-2c8c47c2de75",
          "proposal_id": null,
          "severity": "block",
          "workflow_id": "cbd50be2-1626-4b8c-af12-ca86770fbfa4",
          "workflow_run_id": "a68b5730-2584-4459-b012-6864ba49c92d"
        },
        {
          "action_type": "governance",
          "description": "The chartered workflow must reach a ready governance state before execution is activated.",
          "evaluated_at": "2026-05-06T12:19:58.521097",
          "evaluation_context_json": {
            "governance_status": "ready",
            "recorded_by": "shared-api-key-client",
            "workflow_id": "cbd50be2-1626-4b8c-af12-ca86770fbfa4",
            "workflow_slug": "project-loga-fully-data-driven-operator-surfaces"
          },
          "evaluation_id": "a146939f-cbc1-4e2f-97aa-f4f81178a4d1",
          "evaluation_reason": "Workflow governance status is ready.",
          "evaluation_result": "pass",
          "evaluation_scope": "process",
          "evaluator_type": "project_chartering_service",
          "policy_code": "charter-governance-ready",
          "policy_version": "project-charter-v1",
          "process_instance_id": "0a2f74ed-11f2-453d-9485-2c8c47c2de75",
          "proposal_id": null,
          "severity": "block",
          "workflow_id": "cbd50be2-1626-4b8c-af12-ca86770fbfa4",
          "workflow_run_id": "a68b5730-2584-4459-b012-6864ba49c92d"
        },
        {
          "action_type": "governance",
          "description": "The chartered project must have an active durable implementation roadmap binding.",
          "evaluated_at": "2026-05-06T12:19:59.074200",
          "evaluation_context_json": {
            "binding": {
              "binding_role": "active",
              "created_at": "2026-05-06 12:19:25.204927",
              "created_by": "shared-api-key-client",
              "implementation_packet_id": "3c09a01a-28a6-4c76-81df-0b50227e267d",
              "is_active": true,
              "notes": "Project charter durable roadmap binding.",
              "packet_id": "impl-project-loga-fully-data-driven-operator-surfaces-0a2f74ed-v1",
              "packet_title": "LOGA Fully Data-Driven Operator Surfaces Project Charter Roadmap",
              "packet_version": "1.0",
              "workflow_id": "cbd50be2-1626-4b8c-af12-ca86770fbfa4",
              "workflow_implementation_binding_id": "fc9cfcf4-262c-4ba8-a276-214d03db015a"
            },
            "recorded_by": "shared-api-key-client"
          },
          "evaluation_id": "4321878f-8283-47bd-a4f2-fce31311ed70",
          "evaluation_reason": "An active implementation roadmap binding exists.",
          "evaluation_result": "pass",
          "evaluation_scope": "process",
          "evaluator_type": "project_chartering_service",
          "policy_code": "charter-roadmap-bound",
          "policy_version": "project-charter-v1",
          "process_instance_id": "0a2f74ed-11f2-453d-9485-2c8c47c2de75",
          "proposal_id": null,
          "severity": "block",
          "workflow_id": "cbd50be2-1626-4b8c-af12-ca86770fbfa4",
          "workflow_run_id": "a68b5730-2584-4459-b012-6864ba49c92d"
        },
        {
          "action_type": "governance",
          "description": "The first project run must remain gated on charter review before governed execution proceeds.",
          "evaluated_at": "2026-05-06T12:19:59.638454",
          "evaluation_context_json": {
            "recorded_by": "shared-api-key-client",
            "run_status": "blocked",
            "step_runs": [
              {
                "status": "waiting_approval",
                "step_name": "Approve project charter",
                "step_run_id": "a8abaf07-25af-4509-9a36-5a105cb583ac"
              }
            ],
            "workflow_run_id": "a68b5730-2584-4459-b012-6864ba49c92d"
          },
          "evaluation_id": "bce308de-f474-4acd-a5ee-ca7a53b0a9b1",
          "evaluation_reason": "Project activation is blocked on charter governance review.",
          "evaluation_result": "pass",
          "evaluation_scope": "process",
          "evaluator_type": "project_chartering_service",
          "policy_code": "charter-activation-gated",
          "policy_version": "project-charter-v1",
          "process_instance_id": "0a2f74ed-11f2-453d-9485-2c8c47c2de75",
          "proposal_id": null,
          "severity": "review",
          "workflow_id": "cbd50be2-1626-4b8c-af12-ca86770fbfa4",
          "workflow_run_id": "a68b5730-2584-4459-b012-6864ba49c92d"
        }
      ],
      "project_slug": "loga-fully-data-driven-operator-surfaces",
      "scope": {
        "assumptions": [
          "Upstream AI Engine team can add projection endpoints in current release window",
          "SDK docs can publish canonical response schemas for portfolio/roadmap/promotions/workflow domains"
        ],
        "constraints": [
          "SQL is durable source of truth",
          "LOGA markdown contract headers must remain ai-engine-ui/v1 + loga-choreography/v1",
          "No silent fixture fallback for production routes"
        ],
        "in_scope": [
          "Define SDK method taxonomy and projection coverage gaps",
          "Add missing LOGA projection endpoints and workflow-run-by-project listing",
          "Publish response schemas for projection and data-source domain objects",
          "Wire registry routes/dataSources to documented SDK methods",
          "Replace transform-only/local fixtures for session and promotions with governed projections"
        ],
        "out_of_scope": [
          "New visual redesign of operator UI",
          "Non-operator external client route changes unrelated to projection/data contracts"
        ]
      },
      "status": "chartered",
      "testing_strategy": {
        "business_context_alignment": "Eliminates drift between UI shell, markdown contracts, and SDK capabilities while enabling governed runtime changes without touching page HTML.",
        "evidence_sources": [
          "Project charter packet and implementation roadmap evidence.",
          "Workflow run artifacts, review notes, and any targeted local test outputs captured during validation."
        ],
        "objective_alignment": "Make operator pages fully data-driven through AI Engine SQL-backed markdown projections and registry contracts with no fixture dependence in production paths.",
        "release_boundary": "Do not treat charter execution as release-ready until the local testing strategy has been executed on the intended validation surface and the evidence is recorded.",
        "required_checks": [
          "Confirm the reviewed local source revision and the validation boundary being exercised.",
          "Run targeted local verification that proves the first chartered delivery slice or equivalent core behavior.",
          "Capture reviewable evidence for pass/fail outcome and any remediation notes.",
          "Confirm the tested source state is the same candidate state intended for release review or promotion."
        ],
        "root_paths": [],
        "summary": "Validate LOGA Fully Data-Driven Operator Surfaces on its intended local execution surface before any release, promotion, or client-ready determination.",
        "validation_surfaces": [
          "Approved source roots and local repository state for the chartered change set.",
          "The lowest-cost local runtime or execution boundary that proves the charter objective behaves as intended."
        ]
      },
      "workflow_id": "cbd50be2-1626-4b8c-af12-ca86770fbfa4",
      "workflow_run_id": "a68b5730-2584-4459-b012-6864ba49c92d",
      "workflow_slug": "project-loga-fully-data-driven-operator-surfaces"
    },
    "status_headline": "Project charter is active.",
    "subject_ref": "project:loga-fully-data-driven-operator-surfaces",
    "success_criteria": "All operator surfaces render from governed AI Engine projection endpoints; fallback-to-fixture is disabled for production routes; data source mappings are backed by documented SDK schemas.",
    "workflow_id": "cbd50be2-1626-4b8c-af12-ca86770fbfa4",
    "workflow_name": "Project: LOGA Fully Data-Driven Operator Surfaces",
    "workflow_run_completed_at": null,
    "workflow_run_id": "a68b5730-2584-4459-b012-6864ba49c92d",
    "workflow_run_started_at": "2026-05-06 12:19:25.938215",
    "workflow_run_status": "blocked",
    "workflow_slug": "project-loga-fully-data-driven-operator-surfaces",
    "workflow_status": "active",
    "workflow_version": 1
  },
  "projection_provenance": {
    "correlation_id": "3d497e052e0281905ac7a35beab8ccef",
    "projection_version": "1",
    "source_truth": "sql",
    "source_version": "workflow_run:a68b5730-2584-4459-b012-6864ba49c92d",
    "transformation_workflow_slug": "loga-document-projection"
  },
  "roadmap_summary": {
    "awaiting_review_count": 1,
    "blocked_count": 0,
    "completion_percentage": "0.00",
    "done_count": 0,
    "implementation_packet_id": "3c09a01a-28a6-4c76-81df-0b50227e267d",
    "implementation_packet_key": "impl-project-loga-fully-data-driven-operator-surfaces-0a2f74ed-v1",
    "implementation_packet_status": "approved",
    "in_progress_count": 0,
    "not_started_count": 7,
    "open_items": 8,
    "total_items": 8
  }
}
```
::

## Actions

::next_actions
- id: "refresh_projection"
  label: "Refresh from SQL"
  method: "GET"
  endpoint: "/api/operator/projections/projects/0a2f74ed-11f2-453d-9485-2c8c47c2de75/roadmap.md"

- id: "open_evidence"
  label: "Open roadmap evidence"
  target: "roadmap_evidence"

- id: "view_active_item_tasks"
  label: "View active item tasks"
  target: "active_item_tasks"

::
