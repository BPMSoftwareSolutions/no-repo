export const SAMPLE = `---
loga_contract: "ai-engine-ui/v1"
ux_contract: "loga-ux/v1"
surface_type: "operator.projection_graph"
projection_type: "operator.project_roadmap"
source_truth: "sql"
primary_question: "What should I care about right now?"
---

::toolbar id="projection-toolbar" variant="linear"

  ::toolbar_zone name="context" align="left"
  eyebrow: "Inspection Workspace"
  status: "Agent active · Turn 3"
  ::

  ::toolbar_zone name="navigation" align="left"
  ::nav variant="pills"
  - Roadmap
  - Promotions
  - Workflows
  - CI/CD
  - Memory
  - Evidence
  ::
  ::

  ::toolbar_zone name="search" align="center"
  ::search
  placeholder: "Search projects, tasks, evidence..."
  ::
  ::

  ::toolbar_zone name="scope" align="center"
  ::select label="Scope"
  value: "AI Engine"
  options:
    - AI Engine
    - LOGA
    - All Workspaces
  ::

  ::select label="Mode"
  value: "Focus"
  options:
    - Focus
    - Review
    - Diagnostic
    - Evidence
  ::
  ::

  ::toolbar_zone name="filters" align="right"
  ::filter_group variant="chips"
  - Needs Attention
  - Blocked Only
  - High Priority
  ::
  ::

  ::toolbar_zone name="actions" align="right"
  ::action_group
  - Expand Focus
  - Collapse All
  - Refresh
  ::
  ::

::

# Projection Graph

::roadmap
- key: "generic-wrapper-runtime"
  title: "Establish Generic Wrapper Runtime"
  status: "in progress"
  priority: "high"
  progress: "2 / 4 tasks complete"

- key: "sdk-refactor-surfaces"
  title: "Promote Refactor SDK Surfaces"
  status: "not started"
  priority: "high"
  progress: "0 / 5 tasks complete"
::

::next_actions
- Open current roadmap item
- Review refactor candidate
- Approve decomposition contract
::`;
