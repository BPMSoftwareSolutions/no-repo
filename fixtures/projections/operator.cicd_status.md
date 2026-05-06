---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.cicd_status"
projection_id: "project:ai-engine:cicd"
source_truth: "sql"
primary_question: "Is delivery infrastructure healthy?"
workspace_mode: "diagnostic"
surface_label: "CI/CD Status"
---

# CI/CD Status

::focus
question: "Is delivery infrastructure healthy?"
answer: "Core workflows are PostgreSQL-backed. Deployment still uses Azure hosting infrastructure."
status: "healthy"
::

## Workflow Status

::cicd_list
- name: "codebase-shape-sync.yml"
  database_truth: "PostgreSQL"
  status: "passing"
  last_result: "metadata sync complete"

- name: "python-tests.yml"
  database_truth: "PostgreSQL"
  status: "passing"
  last_result: "tests complete"

- name: "validate-migrations.yml"
  database_truth: "PostgreSQL"
  status: "passing"
  last_result: "migrations valid"

- name: "deploy-staging.yml"
  database_truth: "PostgreSQL"
  status: "passing"
  last_result: "container deployed"
::

## Attention

::panel
title: "Azure remains hosting infrastructure"
status: "not a blocker"
summary: "Azure SQL is no longer the operational database path, but Azure still hosts deployment infrastructure."
::

::next_actions
- Verify SDK package publish
- Check downstream consumers
- Confirm no Azure SQL fallback
::
