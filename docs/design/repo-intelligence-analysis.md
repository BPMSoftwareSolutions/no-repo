# Repo Intelligence Analysis

**Source:** `client.repo.*`, `client.operatorStatus.*`, `client.scriptDiscovery.*`, `client.executionTelemetry.*`  
**SDK version:** `@bpmsoftwaresolutions/ai-engine-client` v1.1.102  
**Date:** 2026-05-11  
**Raw data:** `outputs/repo-intelligence.json`

---

## Repository Inventory (7 repos)

| Repo | Root Path | Files | Last Scanned | Notes |
|---|---|---|---|---|
| `d-a-ai-engine-ai-engine` | D:/a/ai-engine/ai-engine | 1,113 | 2026-05-11 (today) | Deployed engine on Replit — live |
| `c-source-repos-bpm-internal-ai-engine` | C:/source/repos/bpm/internal/ai-engine | **0** | 2026-05-01 | **Sync gap** — 8 projects registered, no files loaded |
| `users-sidney-source-repos-bpm-internal-markdown-viewer` | /Users/sidney/.../markdown-viewer | 268 analyzed | 2026-04-27 | **Richest intelligence** (see below) |
| `c-source-repos-bpm-internal-loga` | C:/source/repos/bpm/internal/loga | 696 | 2026-04-28 | Indexed, not deeply analyzed |
| `c-source-repos-bpm-internal-markdown-viewer` | C:/source/repos/bpm/internal/markdown-viewer | 530 | 2026-04-28 | Indexed |
| `c-source-repos-bpm-clients-domain-expert-platform` | C:/source/repos/bpm/clients/domain-expert-platform | 127 | 2026-04-15 | Minimal |
| `demo` | C:/demo | 1 | 2026-05-07 | Python demo target |

### Richest Repo: markdown-viewer (Mac path)
The `/Users/sidney/.../markdown-viewer` repo has the most complete intelligence load:

```text
Files analyzed:       268
Symbols:            1,121
Relationships:      1,841
Action observations:  770
Object flow obs:      544
Findings:              47
```

Object kind breakdown: workflow (105), event (96), report (71), document (50), domain_object (89), customer_record (31), sql_row (29), file (28), artifact (4), api_payload (4).

---

## Refactor Candidates (20 returned)

All findings are `oversized_file` severity `warning`. Top candidates by line count:

| File | Repo | Lines | Language | Symbols |
|---|---|---|---|---|
| `docs/prototypes/articipant-pulsing-animation-with-pulse-working.html` | markdown-viewer | 2,509 | html | 3 |
| `docs/prototypes/participant-pulsing-animation-not-working.html` | markdown-viewer | 2,301 | html | 3 |
| `MarkdownViewerWeb/docs/operator-console-demo.html` | markdown-viewer | 2,276 | html | 72 |
| `docs/prototypes/image_carousel-not-correct.html` | markdown-viewer | 2,114 | html | 1 |
| `MainWindow.xaml.cs` | markdown-viewer | 1,393 | csharp | 41 |
| `scripts/agent_start.py` | ai-engine (local) | 943 | python | 9 |
| `src/persistence/sql/retrieval_wrapper_store.py` | ai-engine (local) | 905 | python | 42 |
| `Tests/MermaidDiagramValidatorTests.cs` | markdown-viewer | 833 | csharp | 25 |
| `MarkdownViewerWeb/Components/Pages/Home.razor.State.cs` | markdown-viewer | 744 | csharp | 33 |
| `MarkdownViewerWeb/Program.cs` | markdown-viewer | 743 | csharp | 0 |
| `MarkdownViewerWeb/Services/Markdown/Core/AIEngineUiContractPreprocessor.cs` | markdown-viewer | 800 | csharp | 35 |
| `MarkdownViewerWeb/Services/Markdown/Parsing/ChoreographyDocumentParser.cs` | markdown-viewer | 658 | csharp | 10 |
| `MarkdownViewerWeb/Components/Pages/Home.razor.DrillDown.cs` | markdown-viewer | 640 | csharp | 9 |
| `MarkdownViewerWeb/Services/Markdown/FencedBlocks/Mermaid/Fixing/MermaidAutoCorrector.cs` | markdown-viewer | 619 | csharp | 16 |
| `src/orchestration/governed_action_envelope.py` | ai-engine (local) | 595 | python | 10 |
| `Templates/document.html` | markdown-viewer | 590 | html | 0 |
| `MarkdownViewerWeb/Services/Markdown/Diagnostics/Rules/MermaidSyntaxRules.cs` | markdown-viewer | 583 | csharp | 9 |
| `SequenceEditorWindow.xaml.cs` | markdown-viewer | 528 | csharp | 18 |
| `docs/prototypes/mermaid-svg-actor-replacement-example.html` | markdown-viewer | 515 | html | 9 |
| `Services/MermaidDiagramValidator.cs` | markdown-viewer | 1,068 | csharp | 16 |

**Observation:** `MainWindow.xaml.cs` (1,393 lines, 41 symbols) is the strongest `architecture_god_class` / `architecture_god_file` demo target — a single C# file owning the entire main window with 41 symbols. This is the kind of asset that makes Video #1 immediately tangible.

---

## Architecture Integrity Status

**Gate decision: `BLOCK`** — gate is actively running.

```text
Total findings:          628
Open block findings:     571
Open revise findings:     28
Remediated:               29
Waived:                    0
```

Active implementation plan: `impl-sql-server-residue-eradication-2026-04-27-v1`  
Plan title: **Implementation Plan - SQL Server Residue Eradication**

The engine is mid-refactor on itself. The SQL Server → portable SQL migration is the current blocking gate. This is a live modernization effort — and a real-world example of the warehouse pipeline thesis in action.

---

## Codebase Shape Status (ai-engine local)

| Field | Value |
|---|---|
| Stage | `inventory_only` |
| File count | **0** (sync gap) |
| Action observations | 0 |
| Object flow observations | 0 |
| Active warning findings | 4 |
| Active info findings | 8 |

**Operator handoff from engine:**
> "Run or repair action observation persistence for the latest codebase-shape scan."

The local ai-engine repo is registered (8 projects) but the file sync is broken — no files loaded. Shape analysis cannot run until the file sync is repaired.

---

## Anti-Pattern Rules Taxonomy (13 rules)

| Rule Key | Severity | Trigger Summary |
|---|---|---|
| `advanced_options_exposed_too_early` | warning | Advanced controls visible before primary objective established |
| `architecture_artifact_payload_as_operational_truth` | **block** | Raw artifacts treated as system of record instead of SQL |
| `architecture_domain_context_bleed` | **block** | Code crosses bounded domains or mixes unrelated contexts |
| `architecture_external_repo_dependency` | **block** | sys.path manipulation to load sibling repos at runtime |
| `architecture_frontend_owned_workflow_truth` | **block** | Frontend/local state owns workflow status or approval truth |
| `architecture_god_class` | **block** | Single class owns too many behaviors, dependencies, or policy |
| `architecture_god_file` | **block** | Single file concentrates too many responsibilities |
| `architecture_markdown_first_pattern_discovery` | **block** | Pattern inventory built from markdown instead of SQL evidence |
| `architecture_markdown_hand_stitching_instead_of_sql_sot` | **block** | Markdown assembled as source of truth when SQL is authoritative |
| `architecture_one_off_mutation_path_outside_wrapper` | **block** | Direct file mutation outside governed wrapper/workflow surface |
| `architecture_policy_outside_governance` | **block** | Approval/policy logic outside governance layer |
| `architecture_prompt_context_as_durable_state` | **block** | Transient prompt context treated as durable system memory |
| `architecture_sql_truth_duplicated_in_json` | **block** | Workflow truth duplicated into unmanaged JSON blobs |

12 of 13 rules are severity `block`. The taxonomy is strongly opinionated toward SQL-backed governance truth.

---

## Script Discovery

| Surface | Count |
|---|---|
| Discovered script assets | **0** |
| Discovered capabilities | **0** |
| Workflow candidates (older scans) | 25 |

**The script discovery engine has not been seeded from the current workspace.** The 25 workflow candidates are from earlier scan runs (SVG topology, financial RAG, stock scouts, ai-engine reporting). None are from the current product launch pipeline.

**Action required:** Run `client.scriptDiscovery.scanScripts()` to register the current workspace scripts with the engine. This is the prerequisite for the Workflow Starter Kit (Product #2) to be discoverable by the engine.

---

## Execution Telemetry (Current)

```text
Active processes:   105
Recent processes:   563
Failed processes:   129
Status:             active
Last observed:      2026-05-11 18:03:47
```

Engine is live and running. Failure count (129) is notable — likely related to the SQL Server migration that is the current block-gate plan.

---

## Gaps and Readiness Assessment

### For Product #1 — Modernization Audit Report Pack

| Check | Status |
|---|---|
| `listRefactorCandidates` works | ✅ Returns 20 candidates |
| Candidates are in repos engine can read | ⚠️ All from markdown-viewer, not from ai-engine local (sync broken) |
| `analyzeRefactorCandidate` available | ✅ Confirmed in SDK |
| Warehouse pipeline methods | ✅ All 7 confirmed |
| LOGA projection | ✅ Available |
| Audio render | ✅ Available |
| **Best demo target today** | `MainWindow.xaml.cs` — 1393 lines, 41 symbols, god file |

### For Product #2 — Workflow Starter Kit

| Check | Status |
|---|---|
| Scripts exist in workspace | ✅ 12 `.mjs` scripts |
| Engine knows about them | ❌ `scriptDiscovery.listDiscoveredScriptAssets()` returns empty |
| **Fix:** `scanScripts()` to register | One call required |

### For all video demos

| Check | Status |
|---|---|
| Execution telemetry live | ✅ 105 active |
| LOGA projections available | ✅ |
| Audio render pipeline | ✅ |
| Playwright capture layer | ❌ Not built (known gap from product analysis) |
| Architecture gate is blocking engine itself | ⚠️ 571 open findings — visible in any gate demo |

### Critical Pre-Launch Actions

1. **Fix ai-engine local file sync** — or explicitly target `d-a-ai-engine-ai-engine` (deployed) for all refactor candidate pulls.
2. **Run `scanScripts()`** — register the current workspace with the engine's script discovery surface.
3. **Decide demo repo** — `markdown-viewer` (richest intelligence today) or ai-engine (more on-brand). Both require no new SDK work.

---

## Compounding Observation

The engine is running its own modernization (SQL Server → SQLite) right now. That means:

> The first product demo can use the engine's own codebase as the audit target.

The architecture_god_file findings, the 571 block-gate violations, the ongoing remediation — this is not a synthetic demo. It is the engine proving the thesis on itself.

That is the strongest possible Video #1.
