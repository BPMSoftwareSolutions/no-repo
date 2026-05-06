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

::table id="project_portfolio"
| Project | Status | Charter | Completion % | Blockers | |
|---|---|---|---|---|---|
| Spring Boot Governed Execution Gateway | active | chartered | 0.00 | 0 | |
| Curated Canonical AI Instincts Fine-Tuning | active | ready_for_execution | 45.95 | 0 | |
| Governed Pattern Intelligence Loop | active | chartering | 0.00 | 0 | |
| Governed Intent Code Search and Repo-less Agent Readiness | active | active_execution | 0.00 | 0 | |
| Autonomous Implementation Runner | active | chartered | 0.00 | 0 | |
| Governed UX System | active | chartered | 100.00 | 0 | |
| Polyglot Code Shaping and Repository Intelligence | active | chartered | 0.00 | 0 | |
| Lego Project | active | chartered | 0.00 | 0 | |
| LOGA Structured Markdown BFF Integration | active | chartered | 13.33 | 0 | |
| Loga Cognitive Interface Cockpit Delivery | active | chartered | 0.00 | 0 | |
| Loga Cognitive Interface, Workflow Playback, and Human-Facing Cockpit | active | chartering | 0.00 | 0 | |
| Loga Cognitive Interface, Workflow Playback, and Human-Facing Cockpit | active | chartering | 0.00 | 0 | |
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
