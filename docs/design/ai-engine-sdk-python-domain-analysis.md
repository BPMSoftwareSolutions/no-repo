# AI Engine Python SDK Domain Analysis

## Purpose

This analysis is based on the live, SQL-backed repository intelligence surface, not the earlier refactor bundle snapshot.

The goal is to keep splitting the Python SDK god file until the top-level compatibility module is only imports, aliases, and minimal bootstrap wiring.

## Live Evidence

Current durable inventory for `./src/ai_engine_sdk.py`:

| Field | Value |
|---|---:|
| File path | `./src/ai_engine_sdk.py` |
| Line count | `4380` |
| Symbol count | `12` |
| Content hash | `8decd48d5241706df3c4fb274bea7404b76b374eb9e8e24333d348999bd36fd7` |
| Last synced | `2026-05-14 10:54:40.045218` |

File-scoped change analysis for the same file currently reports:

| Field | Value |
|---|---:|
| Findings | `0` |
| Action observations | `0` |
| Object flow observations | `0` |
| Relationships | `0` |

That means the file is still very much the live monolith.

## Coverage Audit

Live `src/ai_engine_sdk*` inventory from SQL-backed repo intelligence:

| Group | File count | LOC | Symbol count |
|---|---:|---:|---:|
| Root monolith | `1` | `4380` | `12` |
| Package root | `1` | `28` | `0` |
| Domain modules | `14` | `1547` | `156` |
| Agent comms submodules | `9` | `1231` | `179` |
| Runtime support | `7` | `390` | `23` |
| Compatibility wrappers | `5` | `25` | `12` |
| **Total** | **37** | **7191** | **382** |

Notes:

- `src/ai_engine_sdk/domains/projections.py` is a small export-marker module, not the implementation home for projection behavior.
- `src/ai_engine_sdk/domains/read_projection.py` is the actual projection helper implementation surface.
- `src/ai_engine_sdk/domains/agent_comms/__init__.py` is a dispatcher/root domain file, not the only agent-comms code home.
- The `symbol_count` field in the inventory is a useful coarse metric, but it under-reports the effective method surface for the root monolith. The live content window scan found many more callable surfaces inside class bodies than the top-level symbol count suggests.

## Important Correction

Earlier artifact analysis made it look like `ai_engine_sdk.py` had already been reduced to a thin index.

That was a snapshot of a refactor bundle, not the live SQL-backed source.

The live repo intelligence shows the real source still has:

- a 4,380 line `src/ai_engine_sdk.py`
- a `src/ai_engine_sdk/` package with domain modules already split out
- many root-level wrappers and helpers still living in the top-level file

So the correct interpretation is:

- the domain split has started and is real
- the root file is not finished yet
- the earlier bundle was a historical refactor target, not the current durable source

## Current File Tree

```text
src/
|-- ai_engine_sdk.py
|-- ai_engine_sdk/
|   |-- __init__.py
|   |-- domains/
|   |   |-- __init__.py
|   |   |-- actions.py
|   |   |-- agent_comms/
|   |   |   |-- __init__.py
|   |   |   |-- _base.py
|   |   |   |-- bundles.py
|   |   |   |-- choreography.py
|   |   |   |-- collaboration.py
|   |   |   |-- inbox.py
|   |   |   |-- message_watches.py
|   |   |   |-- presence.py
|   |   |   `-- transfer_channels.py
|   |   |-- database.py
|   |   |-- governance.py
|   |   |-- learning_loops.py
|   |   |-- projections.py
|   |   |-- projects.py
|   |   |-- read_projection.py
|   |   |-- reports.py
|   |   |-- retrieval.py
|   |   |-- roadmaps.py
|   |   |-- runtime_spine.py
|   |   |-- status.py
|   |   `-- telemetry.py
|   `-- runtime/
|       |-- __init__.py
|       |-- auth.py
|       |-- config.py
|       |-- context.py
|       |-- errors.py
|       |-- normalization.py
|       `-- transport.py
|-- ai_engine_sdk_agent_comms.py
|-- ai_engine_sdk_core.py
|-- ai_engine_sdk_projections.py
|-- ai_engine_sdk_repo_inventory.py
`-- ai_engine_sdk_retrieval.py
```

## What Is Already Split Out

The live SDK already has a domain package under `src/ai_engine_sdk/domains/`.

| File | Lines | Symbols | Responsibility |
|---|---:|---:|---|
| `src/ai_engine_sdk/domains/actions.py` | 40 | 3 | Action submission and action intent normalization |
| `src/ai_engine_sdk/domains/agent_comms/__init__.py` | 916 | 76 | Agent comms root domain and nested delegation |
| `src/ai_engine_sdk/domains/agent_comms/_base.py` | 15 | 2 | Shared agent-comms base helpers |
| `src/ai_engine_sdk/domains/agent_comms/bundles.py` | 35 | 10 | Bundles |
| `src/ai_engine_sdk/domains/agent_comms/choreography.py` | 77 | 24 | Choreography flows |
| `src/ai_engine_sdk/domains/agent_comms/collaboration.py` | 50 | 15 | Collaboration flows |
| `src/ai_engine_sdk/domains/agent_comms/inbox.py` | 32 | 9 | Inbox surfaces |
| `src/ai_engine_sdk/domains/agent_comms/message_watches.py` | 38 | 11 | Message watch surfaces |
| `src/ai_engine_sdk/domains/agent_comms/presence.py` | 53 | 16 | Online presence surfaces |
| `src/ai_engine_sdk/domains/agent_comms/transfer_channels.py` | 53 | 16 | Transfer channel lifecycle |
| `src/ai_engine_sdk/domains/database.py` | 102 | 15 | Database catalog, schema, and table surfaces |
| `src/ai_engine_sdk/domains/governance.py` | 141 | 14 | Gitship governance, mutation scope, claim work item |
| `src/ai_engine_sdk/domains/learning_loops.py` | 36 | 9 | Learning loop lifecycle |
| `src/ai_engine_sdk/domains/projections.py` | 7 | 47 | Projection namespace marker / export surface |
| `src/ai_engine_sdk/domains/projects.py` | 18 | 3 | Project lookup and status bundle access |
| `src/ai_engine_sdk/domains/read_projection.py` | 320 | 47 | Read/projection helpers and transfer/status projections |
| `src/ai_engine_sdk/domains/reports.py` | 60 | 3 | Report execution |
| `src/ai_engine_sdk/domains/retrieval.py` | 62 | 4 | Retrieval wrapper access and symbol lookup |
| `src/ai_engine_sdk/domains/roadmaps.py` | 16 | 4 | Roadmap summary and active-item helpers |
| `src/ai_engine_sdk/domains/runtime_spine.py` | 41 | 5 | Runtime bootstrap indirection and helper plumbing |
| `src/ai_engine_sdk/domains/status.py` | 57 | 6 | Status, ping, command card, and security/workflow state |
| `src/ai_engine_sdk/domains/telemetry.py` | 130 | 16 | Execution telemetry and friction views |

### Taxonomy Rules

Classification rules used in this analysis:

| Rule | Classification |
|---|---|
| Root file at `src/ai_engine_sdk.py` | Monolith / compatibility root |
| `src/ai_engine_sdk/__init__.py` | Package entrypoint |
| `src/ai_engine_sdk/domains/*.py` | Domain modules |
| `src/ai_engine_sdk/domains/agent_comms/*.py` | Agent communications subdomain |
| `src/ai_engine_sdk/runtime/*.py` | Shared runtime support |
| `src/ai_engine_sdk_*.py` | Compatibility wrappers |
| `src/ai_engine_sdk/domains/projections.py` | Marker/export module |
| `src/ai_engine_sdk/domains/read_projection.py` | Projection implementation module |
| `src/ai_engine_sdk/domains/runtime_spine.py` | Cross-domain runtime indirection |

### Audit Confidence

| Area | Confidence | Reason |
|---|---|---|
| Inventory completeness | High | Live SQL-backed file list was pulled directly for the `src/ai_engine_sdk` prefix |
| Taxonomy classification | High | Rules are based on actual directory layout and module behavior |
| Root surface mapping | Medium | Root content was sampled via content windows, not exhaustively symbol-indexed |
| Refactor slice ordering | Medium | Good enough for the next pass, but should be re-validated after each slice |

The live package already has the major bounded domains we expected:

- actions
- agent communications
- database
- governance
- learning loops
- projections and read-projection helpers
- projects
- reports
- retrieval
- roadmaps
- runtime spine
- status
- telemetry

## Quality Gates For The Refactor

These are the gates the refactor should satisfy before a slice is considered complete:

1. The SQL-backed inventory for `src/ai_engine_sdk*` still matches the expected tree after the slice.
2. The root file line count drops or its bridge surface shrinks in the intended direction.
3. The destination module has the moved methods and the root module no longer duplicates them.
4. The public import paths still resolve through the compatibility layer.
5. The taxonomy table in this document still matches the live inventory after the slice.
6. Any new root helpers introduced by the slice are either temporary or immediately relocated.

If any gate fails, the slice should be treated as incomplete and the taxonomy should be revised before the next refactor step.

## What Still Needs To Move

These are the live root-level surfaces that still deserve extraction or bridge removal:

| Root surface | Likely destination | Why it still matters |
|---|---|---|
| `_ReportsNamespace` | `src/ai_engine_sdk/domains/reports.py` | Root still owns a compatibility wrapper |
| `_ProjectionsNamespace` | `src/ai_engine_sdk/domains/read_projection.py` and `domains/projections.py` | Root still duplicates projection accessors |
| `_ActionsNamespace` | `src/ai_engine_sdk/domains/actions.py` | Root still exposes action orchestration |
| `_DatabaseNamespace` | `src/ai_engine_sdk/domains/database.py` | Root still carries SQL catalog passthroughs |
| `_AgentCommsNamespace` | `src/ai_engine_sdk/domains/agent_comms/*` | Root still exposes a large comms bridge |
| `_CollaborationNamespace` | `src/ai_engine_sdk/domains/agent_comms/collaboration.py` | Collaboration logic is still bridged through the root |
| `current_*` status methods | `src/ai_engine_sdk/domains/status.py` | Status access is already split, but root still carries it |
| `get_execution_*` telemetry methods | `src/ai_engine_sdk/domains/telemetry.py` | Telemetry is already split, but root still carries it |
| `create_project_delivery` / project mutation methods | `src/ai_engine_sdk/domains/projects.py`, `roadmaps.py`, `governance.py` | These are orchestration seams still routed through the monolith |
| helper utilities such as `_clean_text`, `_pick_value`, `_required_text` | `src/ai_engine_sdk/runtime/normalization.py` | Shared runtime utilities should not stay root-only |
| runtime bootstrap helpers | `src/ai_engine_sdk/runtime/*` | Already split conceptually, but root still owns bootstrap wiring |

## What Looks Odd Today

This is the part that was probably triggering your intuition that something was incomplete:

- The tree is a hybrid of the live monolith plus already split packages, so it does not read like a finished package boundary yet.
- `domains/projections.py` is tiny and easy to miss, but it matters because it marks projection namespace export behavior.
- `read_projection.py` is large enough to deserve its own emphasis, so the document should distinguish it from the marker module.
- The root file still contains a bridge layer even though the domain package exists, so the finish shape is not yet the current runtime shape.

That means the analysis is correct in spirit, but the document needs to keep the split taxonomy and the runtime reality separate.

## What Still Lives In The Root File

The live root file still contains a very large amount of code.

From the current SQL-backed content windows, I observed roughly `388` top-level `class` / `def` declarations in `src/ai_engine_sdk.py`.

The remaining root-owned surface falls into these groups:

| Group | Representative methods / namespaces | Status |
|---|---|---|
| Compatibility namespaces | `_ReportsNamespace`, `_ProjectionsNamespace`, `_ActionsNamespace`, `_DatabaseNamespace`, `_AgentCommsNamespace`, `_CollaborationNamespace` | Still in root |
| Actions | `submit_action_intent`, `submit` | Already has `domains/actions.py`, but root still exposes the bridge |
| Database | `describe_database_catalog`, `list_database_schemas`, `list_database_tables`, `list_database_columns`, `list_database_indexes`, `describe_database_table` | Already has `domains/database.py`, but root still exposes the bridge |
| Status | `current_workflow_status`, `current_architecture_integrity_status`, `current_security_governance_status`, `ping`, `get_command_card` | Already has `domains/status.py`, but root still exposes the bridge |
| Retrieval | `resolve_operating_procedure`, `get_symbol_definition`, `get_related_code` | Already has `domains/retrieval.py`, but root still exposes the bridge |
| Reports | `run_report_definition`, `run` | Already has `domains/reports.py`, but root still exposes the bridge |
| Projects / roadmaps | `create_project_delivery`, `approve_project_charter_intent`, `approve_implementation_roadmap`, `run_project_charter`, `begin_implementation_roadmap`, `import_implementation_packet_and_materialize_roadmap`, `route_implementation_item` | Already has `domains/projects.py` and `domains/roadmaps.py`, but root still owns orchestration glue |
| Governance | `check_git_ship_readiness`, `get_git_ship_promotion_authority`, `get_gitship_promotion_lane`, `request_gitship_promotion`, `accept_gitship_promotion_review`, `assign_gitship_release_owner`, `post_gitship_promotion_heartbeat`, `request_gitship_closure`, `get_gitship_autonomy_readiness`, `recover_gitship_autonomy`, `check_mutation_scope_watch`, `claim_work_item` | Already has `domains/governance.py`, but root still exposes the bridge |
| Learning loops | `open_learning_loop`, `resume_learning_loop`, `record_learning_loop_event`, `attach_learning_loop_evidence`, `close_learning_loop`, `get_learning_loop_replay_packet`, `seed_default_learning_loops`, `intake_learning_loop` | Already has `domains/learning_loops.py`, but root still exposes the bridge |
| Telemetry | `get_execution_telemetry_current`, `list_execution_process_runs`, `get_execution_process_run`, `get_execution_telemetry_session`, `get_latest_execution_telemetry_session`, `list_execution_telemetry_events`, `watch_execution_telemetry_session`, projection accessors, friction views | Already has `domains/telemetry.py`, but root still exposes the bridge |
| Agent comms | thread, inbox, message, bundle, transfer, handoff, presence, coordination, collaboration, and message-watch methods | Already split into `domains/agent_comms/*`, but root still owns a large compatibility layer |
| Helpers | `_clean_text`, `_coerce_positive_int`, `_coerce_truthy`, `_first_text`, `_normalize_mapping`, `_pick_value`, `_required_text`, `_resolve_project_reference`, `_resolve_workflow_reference`, `_resolve_workflow_id`, `_count_projection_lines`, `from_env`, `build_default_ai_engine_client` | Still in root |

## Three-Slice Plan

The goal is to get the root file down to a thin facade in three bounded slices.

### Slice 1: Remove Root Bridges

Goal:

- move the obvious pass-through namespaces out of `src/ai_engine_sdk.py`
- keep only imports, aliases, and minimal bootstrap entrypoints
- stop the root file from owning any domain logic

Primary targets:

- `_ReportsNamespace`
- `_ProjectionsNamespace`
- `_ActionsNamespace`
- `_DatabaseNamespace`
- `_AgentCommsNamespace`
- `_CollaborationNamespace`

Exit criteria:

- the root file no longer contains large wrapper classes for the obvious domains
- the root file shrinks materially and becomes mostly a router
- domain entrypoints resolve through the package modules, not root-owned duplicates

### Slice 2: Finish Domain Ownership

Goal:

- complete the migration of workflow-heavy logic into the already-existing domain modules
- make `actions`, `governance`, `status`, `reports`, `projects`, `roadmaps`, `retrieval`, and `telemetry` the canonical homes
- eliminate remaining root-owned business logic in those areas

Primary targets:

- `src/ai_engine_sdk/domains/actions.py`
- `src/ai_engine_sdk/domains/governance.py`
- `src/ai_engine_sdk/domains/status.py`
- `src/ai_engine_sdk/domains/reports.py`
- `src/ai_engine_sdk/domains/projects.py`
- `src/ai_engine_sdk/domains/roadmaps.py`
- `src/ai_engine_sdk/domains/retrieval.py`
- `src/ai_engine_sdk/domains/telemetry.py`
- `src/ai_engine_sdk/domains/read_projection.py`

Exit criteria:

- root no longer implements workflow-specific business rules
- each workflow surface has a single obvious domain home
- all compatibility paths resolve cleanly through the domain package

### Slice 3: Collapse to Thin Facade

Goal:

- reduce `src/ai_engine_sdk.py` to a very small compatibility surface
- keep only alias exports, constructor/bootstrap wiring, and unavoidable compatibility shims
- leave the public API stable for callers

Primary targets:

- `src/ai_engine_sdk.py`
- `src/ai_engine_sdk/__init__.py`
- `src/ai_engine_sdk/domains/__init__.py`
- `src/ai_engine_sdk/runtime/*`

Exit criteria:

- `src/ai_engine_sdk.py` is close to an index file
- the public API is preserved through aliases
- no significant business logic remains in the root module
- the remaining file size target is roughly `100 LOC` or less

## ASCII Finish Shape

```text
src/
|-- ai_engine_sdk.py                 # thin compatibility index / facade
|-- ai_engine_sdk/
|   |-- __init__.py                  # package entrypoint
|   |-- domains/
|   |   |-- actions.py
|   |   |-- agent_comms/
|   |   |-- database.py
|   |   |-- governance.py
|   |   |-- learning_loops.py
|   |   |-- projections.py
|   |   |-- projects.py
|   |   |-- read_projection.py
|   |   |-- reports.py
|   |   |-- retrieval.py
|   |   |-- roadmaps.py
|   |   |-- runtime_spine.py
|   |   |-- status.py
|   |   `-- telemetry.py
|   `-- runtime/
|       |-- auth.py
|       |-- config.py
|       |-- context.py
|       |-- errors.py
|       |-- normalization.py
|       `-- transport.py
`-- compatibility wrappers
    |-- ai_engine_sdk_agent_comms.py
    |-- ai_engine_sdk_core.py
    |-- ai_engine_sdk_projections.py
    |-- ai_engine_sdk_repo_inventory.py
    `-- ai_engine_sdk_retrieval.py
```

## Why This Is The Right Interpretation

The durable SQL-backed file inventory gives us the authoritative picture:

- the root file is still 4,380 lines
- the domain package already exists
- the root file is still carrying a large bridge surface

That means the next refactor step should focus on elimination of root-level duplication, not on rediscovering the domain taxonomy.

## Practical Takeaway

The live state says:

- `src/ai_engine_sdk.py` is still the monolith
- `src/ai_engine_sdk/domains/` already contains the split-out homes
- the remaining work is to finish removing the bridge methods and bootstrap helpers from the root file

If you want, the next thing I can do is turn this into a tactical extraction matrix for the live source, with:

1. root method groups
2. target destination module
3. suggested slice order
4. "do not duplicate" notes for already split code
