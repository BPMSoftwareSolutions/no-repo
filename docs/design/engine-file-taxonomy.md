# AI Engine — Code File Taxonomy

**Repository:** `d-a-ai-engine-ai-engine`
**Root path:** `D:/a/ai-engine/ai-engine`
**Repo ID:** `f3f44a2c-7bd2-4a72-9718-26924bd3b407`
**Source:** SQL-backed code inventory via `client.repo.listCodeFiles`
**Date:** 2026-05-11
**Total files in inventory:** 1,113

---

## Language Breakdown

| Language | Files | % |
|---|---|---|
| Python | 815 | 73.2% |
| SQL (`.sql`) | 270 | 24.3% |
| JavaScript / MJS | 24 | 2.2% |
| HTML | 4 | 0.4% |

> Note: SQL files are returned as `unknown` language by the inventory. Extension confirms `.sql` (270 files).

---

## Top-Level Directory Structure

| Directory | Files | % of Total |
|---|---|---|
| `src/` | 786 | 70.6% |
| `scripts/` | 318 | 28.6% |
| `tests/` | 9 | 0.8% |

---

## `src/` — Architecture Layer Breakdown (786 files)

| Layer | Files | % of src | Role |
|---|---|---|---|
| `persistence/` | 371 | 47.2% | SQL-first persistence — stores and migrations |
| `orchestration/` | 221 | 28.1% | Workflow coordination and routing |
| `capabilities/` | 42 | 5.3% | Capability handlers (all in `handlers/`) |
| `web/` | 39 | 5.0% | HTTP surface |
| `intake/` | 32 | 4.1% | Ingest and intake processing |
| `reasoning/` | 17 | 2.2% | Reasoning layer |
| `execution/` | 10 | 1.3% | Execution runtime |
| `decision/` | 9 | 1.1% | Decision surfaces |
| `inspection/` | 8 | 1.0% | Code inspection |
| `review/` | 8 | 1.0% | Review and gate surfaces |
| `design_intelligence/` | 7 | 0.9% | Design intelligence domain |
| `reporting/` | 5 | 0.6% | Report generation |
| `cli/` | 3 | 0.4% | CLI entry points |
| `demo/` | 3 | 0.4% | Demo scripts |
| `validation/` | 2 | 0.3% | Validation surfaces |

### `src/persistence/sql/` — Store Registry (368 files)

The persistence layer is almost entirely SQL (`368/371`). It breaks down into:

| Sub-directory / File group | Files | Notes |
|---|---|---|
| `migrations/` | 264 | Schema evolution history — SQLite migration chain |
| `codebase_shape/` | 10 | Shape scan persistence |
| `session_governance/` | 8 | Session governance state |
| `generated/` | 5 | Generated SQL artifacts |
| `code_file_inventory/` | 2 | File inventory sync |
| Individual store files (`*_store.py`) | ~80 | One store per domain |

**Named store files — complete domain inventory:**

```
agent_handoff_store.py
alignment_store.py
architecture_integrity_store.py
artifact_governance_store.py
audio_policy_control_plane_store.py
audio_rendering_store.py
auth_boundary_store.py
cicd_posture_store.py
client_lifecycle_store.py
code_file_inventory_sync.py
code_symbol_inventory_sync.py
codebase_shape_adapter.py
codebase_shape_store.py
commit_governance_store.py
communication_messages.py
communication_row_mappers.py
communication_threads.py
communication_transfers.py
contact_sync_store.py
context_session_orientation_store.py
data_access_contract_store.py
document_adjudication_store.py
execution_telemetry_store.py
execution_telemetry_taxonomy_store.py
file_organizer_store.py
financial_transaction_store.py
generated_script_store.py
governance_claim_store.py
governed_execution_contract_store.py
governed_execution_contract_exceptions.py
mailbox_observation_store.py
metadata_sync_lock.py
missing_surface_signoff_store.py
operator_cleanup_store.py
platform_evolution_readout_store.py
process_layer_store.py
project_store.py
readme_store.py
replayable_refactor_plan_store.py
retrieval_control_plane_store.py
retrieval_embedding_store.py
retrieval_wrapper_store.py
script_discovery_store.py
security_governance_store.py
seed_profile_store.py
self_learning_store.py
self_optimization_promotion_binding_store.py
self_optimization_ranking_store.py
self_optimization_store.py
session_governance_store.py
skill_contract_store.py
skill_governance_change_store.py
substrate_bypass_event_store.py
ux_gate_remediation_store.py
ux_registry_store.py
workflow_store.py
workflow_store_agent.py
workflow_store_catalog.py
workflow_store_common.py
workflow_store_communication.py
workflow_store_context_assembly.py
workflow_store_data_access_generation.py
workflow_store_database_schema.py
workflow_store_governance.py
workflow_store_implementation.py
workflow_store_implementation_activity_store.py
workflow_store_implementation_binding_store.py
workflow_store_implementation_governance_store.py
workflow_store_implementation_packet_store.py
workflow_store_performance.py
workflow_store_runtime.py
workflow_store_status.py
workflow_store_tool_registry.py
workflow_store_training_records.py
workflow_store_workflow.py
workflow_tool_binding_approval_surface_store.py
```

> `workflow_store.py` is split into 14 sub-stores — a governed decomposition of what was likely a prior god file.

### `src/orchestration/` — Coordination Layer (221 files)

| Sub-directory | Files | Notes |
|---|---|---|
| `_root` (flat handlers) | 196 | Main orchestration handlers — one per domain operation |
| `data_access_runtime/` | 9 | Runtime data access coordination |
| `data_access_generation/` | 8 | Generation-time data access |
| `code_shaping/` | 5 | Code shape coordination |
| `prompt_assembly/` | 3 | Prompt construction |

196 flat orchestration files is the largest single concentration in the engine. These are the governed handlers that route every API call.

---

## `scripts/` — Governed Operations Library (318 files)

The `scripts/` directory is the engine's own operational playbook — every lifecycle operation expressed as a named, runnable Python script. Organized by verb:

| Verb | Count | Purpose |
|---|---|---|
| `advance` | 46 | Workflow phase advancement (charter → review → approve → next phase) |
| `export` | 42 | Report and snapshot exports |
| `reconcile` | 38 | Migration reconciliation (SQL Server → SQLite eradication) |
| `create` | 25 | Charter, project, and task creation |
| `verify` | 17 | Gate verification and compliance checks |
| `seed` | 13 | Database seeding and catalog bootstrapping |
| `check` | 10 | Eligibility and gate preflight checks |
| `run` | 10 | Execution runners |
| `record` | 8 | Observation and evidence recording |
| `update` | 8 | State updates |
| `import` | 6 | Packet and contract import |
| `sync` | 6 | Code and data sync |
| `resolve` | 5 | Charter compliance resolution |
| `communication` | 4 | Agent communication runners |
| `perf` | 4 | Performance snapshot and trend |
| `validate` | 4 | Contract and migration validation |
| `bootstrap` | 3 | Environment and roadmap bootstrapping |
| `build` | 3 | Inventory and plan building |
| `revise` | 3 | Charter revision |
| *(39 more single-instance verbs)* | 39 | — |

**Sample script names (advance group — 46 scripts):**
```
advance_agent_session_compliance_to_execution_contract_review
advance_ai_engine_security_architecture_charter_start
advance_ai_engine_security_architecture_scope1_to_review
advance_governed_audio_rendering_scope1_start
advance_governed_audio_rendering_scope1_to_review
advance_governed_retrieval_charter_start
advance_governed_self_optimization_scope1_start
advance_openai_realtime_api_support_charter_start
advance_self_learning_scope1_start
...
```

**Sample script names (reconcile group — 38 scripts):**
```
reconcile_migration_scope14_completion
reconcile_postgresql_to_sqlite_completion
reconcile_build_data_access_adapter_layer_completion
reconcile_contract_driven_cutover_completion_audit_progress
reconcile_define_json_data_access_contract_schema_completion
...
```

---

## `tests/` — Test Suite (9 files)

```
tests/
  support/                       (1 file)
  test_ai_engine_client.js
  test_check_client_eligibility_raw.mjs
  test_check_implementation_task_binding_probe.mjs
  test_git_ship.js
  test_monitoring_example.mjs
  test_runtime_verified_output.mjs
  test_sdk_independent_eligibility_preflight.mjs
  test_ux_gate.mjs
```

9 test files for 1,113 source files. Coverage ratio: 0.8%. This is a known gap surfaced by the architecture integrity gate.

---

## Observations

### 1. SQL-First Architecture Is Structurally Proven

47% of `src/` is persistence. 264 SQL migration files exist — each one a governed, traceable schema change. The store registry has 80+ named files, one per domain. This is not a claim about architecture — it is the architecture, enumerable from the inventory.

### 2. The Engine Is Its Own Best Demo Target

The `reconcile` script group (38 scripts) is the SQL Server eradication effort. That migration is live. The architecture integrity gate is currently blocking with 571 open findings. This means:

> The Modernization Audit Report Pack (Product #1) can demo against the engine's own codebase — and the report will be real.

No synthetic data. No staged environment. The engine auditing itself.

### 3. The `scripts/` Directory Is the Prototype for Product #2

318 scripts, all named by governed verb + domain + phase. This is the exact structure the Workflow Starter Kit (Product #2) would package for operator-side use. The engine already ships its own version internally.

### 4. `src/orchestration/` Has a Flatness Problem

196 files at root level in `orchestration/` with no further subdirectory organization. By the engine's own `architecture_god_file` anti-pattern definition, this layer is a refactor candidate. The `data_access_runtime/`, `data_access_generation/`, `code_shaping/` sub-directories exist — the pattern for decomposition is already established.

### 5. `workflow_store.py` Was Already Decomposed

14 sub-store files for `workflow_store` is evidence that a god-file refactor already happened here. This is what the product analysis called the "modernization in action" — and it's recorded in the SQL migration history.

### 6. Test Coverage Is a Known Signal

9 tests for 1,113 files. The test files that exist are all SDK integration or gate checks — not unit tests for the 196 orchestration handlers or 80 store files. The architecture gate's 571 open findings likely include this gap.

### 7. The Migrations Directory Is the Evidence Chain

264 SQL migration files = 264 governed, traceable decisions about the schema. This is the design lineage that `getDesignDecisionLineage` and `listDesignDecisions` expose. The migration chain from SQL Server → SQLite is visible here as the `reconcile_*` scripts in the operations library.

---

## Next: Refactor Candidate Analysis

The engine's shape findings and refactor candidates are currently not indexed for the deployed repo path (`D:/a/ai-engine/ai-engine`). To run a full modernization analysis against this repo:

```javascript
// Trigger codebase shape scan for the deployed repo
await client.repo.listCodebaseShapeFindings({
  repositoryId: 'f3f44a2c-7bd2-4a72-9718-26924bd3b407',
  limit: 200,
});

// Analyze specific refactor candidates once findings are loaded
await client.repo.analyzeRefactorCandidate({
  filePath: './src/orchestration/<handler>.py',
  refactorIntent: 'decompose orchestration handler into governed domain services',
});
```

The `src/orchestration/` flat layer (196 files) is the highest-value refactor target — the exact scenario Product #1 is built to surface, analyze, and package as a governed report.
