---
loga_contract: "ai-engine-ui/v1"
interaction_contract: "loga-choreography/v1"
navigation_contract: "loga-navigation/v1"
ux_contract: "loga-ux/v1"
projection_type: "operator.project_portfolio"
projection_id: "operator-project-portfolio"
source_system: "ai-engine"
source_truth: "sql"
transformation_workflow:
  slug: "loga-document-projection"
  posture: "governed"
generated_at: "2026-05-05T00:56:13.117831+00:00"
refresh_policy: "manual"
allowed_actions:
  - refresh_projection
---

# Project Portfolio

::surface type="project_portfolio" priority="high" summary="Portfolio completion is 30.81% across 185 roadmap items."
::

## Portfolio Completion

::panel type="status_summary" status="active" headline="Portfolio completion is 30.81% across 185 roadmap items."
::

57 completed roadmap items, 0 blocked, 3 in progress, 6 awaiting review.

::metric_row
Completion %: 30.81
Total Roadmap Items: 185
Completed Items: 57
Open Items: 128
Blocked Items: 0
In Progress: 3
Awaiting Review: 6
::

## Project Buckets

::kv
Completed Projects: 0
Active Projects: 58
Chartered / Not Started: 1
Blocked Projects: 0
Exceptions: 40
::

## Active Projects

::portfolio_grid
- name: "Curated Canonical AI Instincts Fine-Tuning"
  status: "active"
  charter: "ready_for_execution"
  completion_pct: 45.95
  done_items: 17
  total_items: 37
  last_run: "2026-05-05T00:30:00Z"
  active_item: "Train embedding model on governed corpus"
  blockers: 0

- name: "LOGA Structured Markdown BFF Integration"
  status: "active"
  charter: "chartered"
  completion_pct: 13.33
  done_items: 2
  total_items: 15
  last_run: "2026-05-04T22:10:00Z"
  active_item: "Bind contract surface to renderer pipeline"
  blockers: 0

- name: "Governed UX System"
  status: "active"
  charter: "chartered"
  completion_pct: 100.00
  done_items: 12
  total_items: 12
  last_run: "2026-05-03T18:45:00Z"
  active_item: "None"
  blockers: 0

- name: "Spring Boot Governed Execution Gateway"
  status: "active"
  charter: "chartered"
  completion_pct: 0.00
  done_items: 0
  total_items: 8
  last_run: "2026-05-01T09:00:00Z"
  active_item: "Define governed execution contract"
  blockers: 0

- name: "Governed Pattern Intelligence Loop"
  status: "active"
  charter: "chartering"
  completion_pct: 0.00
  done_items: 0
  total_items: 6
  last_run: "2026-04-30T14:20:00Z"
  active_item: "Charter pattern intelligence scope"
  blockers: 0

- name: "Autonomous Implementation Runner"
  status: "active"
  charter: "chartered"
  completion_pct: 0.00
  done_items: 0
  total_items: 10
  last_run: "2026-04-29T11:00:00Z"
  active_item: "Bootstrap runner execution context"
  blockers: 0

- name: "Polyglot Code Shaping and Repository Intelligence"
  status: "active"
  charter: "chartered"
  completion_pct: 0.00
  done_items: 0
  total_items: 9
  last_run: "2026-04-28T16:30:00Z"
  active_item: "Define code shape contract"
  blockers: 0

- name: "Governed Intent Code Search and Repo-less Agent Readiness"
  status: "active"
  charter: "active_execution"
  completion_pct: 0.00
  done_items: 0
  total_items: 7
  last_run: "2026-05-02T08:00:00Z"
  active_item: "Validate intent search surface"
  blockers: 0
::

## Why should I trust this?

::evidence_drawer title="Portfolio evidence" source="ai-engine.sql" collapsed="true"
```json
{
  "exception_count": 40,
  "generated_at": "2026-05-05T00:56:13.117831+00:00",
  "portfolio_completion": {
    "awaiting_review_items": 6,
    "blocked_items": 0,
    "completed_roadmap_items": 57,
    "completion_percentage": "30.81",
    "in_progress_items": 3,
    "open_roadmap_items": 128,
    "total_roadmap_items": 185
  },
  "project_count": 64,
  "projection_type": "operator.project_portfolio",
  "source_truth": "sql",
  "summary": {
    "approval_backlog_count": 33,
    "blocked_count": 1,
    "complete_count": 1,
    "in_progress_count": 5,
    "inactive_count": 5,
    "no_active_item_count": 7,
    "total_projects": 64
  }
}
```
::

## Navigation

::nav
- label: "Open project catalog"
  target: "/viewer/ai-engine/projects"
  relation: "sibling"
  projection_type: "operator.project_catalog"
  projection_id: "operator-project-catalog"
::

## What should I do next?

::next_actions
- id: "refresh_project_portfolio"
  label: "Refresh portfolio"
  method: "GET"
  endpoint: "/api/operator/projections/project-portfolio"
  actionability: "executable"
::
