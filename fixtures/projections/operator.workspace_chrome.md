---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.workspace_chrome"
source_truth: "sql"
primary_question: "What workspace controls does this surface require?"
---

::toolbar variant="stacked"
  ::toolbar_zone name="brand" align="left"
  eyebrow: "Inspection Workspace"
  context: "Projection Graph"
  ::

  ::toolbar_zone name="search" align="left"
  ::search
  bind: "workspace-search"
  placeholder: "Search projects, tasks, evidence..."
  ::
  ::suggestions bind="search-suggestions"::
  ::

  ::toolbar_zone name="scope" align="left"
  ::select
  label: "Scope"
  bind: "workspace-scope"
  value: "ai-engine"
  options:
  - ai-engine
  - all-projects
  - system-surfaces
  ::
  ::

  ::toolbar_zone name="mode" align="left"
  ::select
  label: "Mode"
  bind: "workspace-mode"
  value: "focus"
  options:
  - focus
  - execution
  - diagnostic
  - evidence
  - evolution
  ::
  ::mode_hint bind="mode-hint"::
  ::

  ::toolbar_zone name="agent" align="right"
  ::agent_pill
  label: "Agent active · Turn 3"
  href: "projection-detail.html?type=operator.agent_session&projectId=ai-engine"
  ::
  ::
::

::surface_chips
- label: "Roadmap"    value: "roadmap"    active: "true"
- label: "Promotions" value: "promotions" active: "true"
- label: "Workflows"  value: "workflows"  active: "true"
- label: "CI/CD"      value: "cicd"
- label: "Memory"     value: "memory"     active: "true"
- label: "Evidence"   value: "evidence"
::

::attention_controls
- label: "Needs Attention" value: "needs-attention" active: "true"
- label: "Blocked Only"    value: "blocked-only"
- label: "High Priority"   value: "high-priority"
::

::tree_controls
- label: "Expand Focus"   action: "expand-focus"
- label: "Collapse All"   action: "collapse-all"
- label: "Refresh Branch" action: "refresh-branch"
::
