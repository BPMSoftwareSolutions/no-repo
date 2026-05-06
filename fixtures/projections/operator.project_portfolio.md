---
loga_contract: "ai-engine-ui/v1"
interaction_contract: "loga-choreography/v1"
navigation_contract: "loga-navigation/v1"
ux_contract: "loga-ux/v1"
projection_type: "operator.project_portfolio"
projection_id: "operator-project-portfolio"
source_system: "ai-engine"
source_truth: "sql"
primary_question: "What is the delivery state across all projects?"
workspace_mode: "focus"
surface_label: "Project Portfolio"
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

::portfolio_gauge
completion_pct: 30.81
completed_items: 57
total_items: 185
in_progress: 3
blocked: 0
awaiting_review: 6
::

## Project Buckets

::bucket_chart
Active Projects: 58
Exceptions: 40
Chartered / Not Started: 1
Completed Projects: 0
Blocked Projects: 0
::

## Active Projects

::each source="portfolio_projects" block="portfolio_grid"
- name: "{{name}}"
  status: "{{status}}"
  completion_pct: {{completion_pct}}
  done_items: {{done_items}}
  total_items: {{total_items}}
  last_run: "{{last_run}}"
  active_item: "{{active_item}}"
  blockers: {{blockers}}
  project_id: "{{project_id}}"
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
