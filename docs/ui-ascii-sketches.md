Here are **ASCII sketches for multi-page UI inspection services** grounded in the four inspection modes and LOGA/navigation contract direction.  

## 0. Inspection Home

```text
+------------------------------------------------------+
| AI Engine Inspection                                 |
| What do you want to inspect?                         |
+------------------------------------------------------+

[1] Projections
    See what the system is showing operators

[2] Repositories
    Browse repos, projects, files, symbols

[3] Patterns / Anti-patterns
    Detect architecture signals and violations

[4] Remediation Proposals
    Create governed proposals, not patches

--------------------------------------------------------
Recent Attention
- God-file candidates found: 7
- Open anti-pattern findings: 12
- Proposals awaiting review: 3
```

## 1. Projection Inspection Service

```text
Home > Projections

+----------------------+-------------------------------+
| Projection Catalog   | Preview                       |
+----------------------+-------------------------------+
| operator.home        | # Operator Home               |
| project.roadmap      | ::focus                       |
| roadmap.item         | question: What needs focus?   |
| workflow.run         |                               |
| evidence.packet      | [View Raw] [Open in LOGA]     |
+----------------------+-------------------------------+

Primary question:
What is this projection trying to help the human understand?

Actions:
[Validate Contract] [Open Navigation Graph] [View Evidence]
```

### Projection detail

```text
Home > Projections > project.roadmap

+------------------------------------------------------+
| Project Roadmap Projection                           |
| Question: What should I care about right now?        |
+------------------------------------------------------+

Status: Valid
Source Truth: SQL
Contract: ai-engine-ui/v1
Navigation: OK

+------------------+-----------------------------------+
| Rendered Surface | Structure                         |
+------------------+-----------------------------------+
| # Roadmap        | ::breadcrumb                      |
| Current Focus    | ::focus                           |
| Next Actions     | ::panel                           |
| Evidence         | ::next_actions                    |
+------------------+-----------------------------------+

[Open Evidence Drawer]
[Compare Raw Payload]
[Validate Human Question]
```

## 2. Repository Explorer Service

```text
Home > Repositories

+----------------------+-------------------------------+
| Repositories         | Repository Summary             |
+----------------------+-------------------------------+
| ai-engine            | Projects: 14                   |
| loga                 | Files: 312                     |
| domain-platform      | Symbols: 2,841                 |
+----------------------+-------------------------------+

Primary question:
Where is the code shape I need to inspect?

Actions:
[List Projects] [Search Files] [Search Symbols]
```

### Repo drilldown

```text
Home > Repositories > ai-engine

+------------------------------------------------------+
| ai-engine                                            |
| What code area should we inspect?                    |
+------------------------------------------------------+

Projects
- orchestration
- persistence/sql
- web
- capabilities
- reporting

+----------------------+-------------------------------+
| Large Files          | Signals                       |
+----------------------+-------------------------------+
| workflow_store.py    | 1655 LOC / 30 symbols          |
| codebase_shape.py    | 1619 LOC / 29 symbols          |
| workflow_run.py      | 1347 LOC / 59 symbols          |
+----------------------+-------------------------------+

[Open File] [View Symbols] [Run Change Analysis]
```

### File inspection

```text
Home > Repositories > ai-engine > workflow_run_service.py

+------------------------------------------------------+
| workflow_run_service.py                              |
| What responsibility does this file currently carry?  |
+------------------------------------------------------+

LOC: 1347
Symbols: 59
Candidate Type: Mixed responsibility / God-file risk

Tabs:
[Overview] [Symbols] [Relationships] [Content Window] [Change Analysis]

+----------------------+-------------------------------+
| Symbol               | Responsibility Guess           |
+----------------------+-------------------------------+
| start_workflow_run   | run lifecycle                  |
| derive_evidence      | evidence assembly              |
| advance_gate         | governance transition          |
+----------------------+-------------------------------+

[Analyze Refactor Candidate]
```

## 3. Code Intelligence Service

```text
Home > Code Intelligence

+------------------------------------------------------+
| Code Intelligence                                    |
| What code relationship are we trying to understand?  |
+------------------------------------------------------+

Search:
[ workflow evidence derivation                  ][Go]

Results
+----------------------+-------------------------------+
| Candidate            | Why Matched                   |
+----------------------+-------------------------------+
| derive_checkpoint... | evidence + checkpoint terms   |
| WorkflowRunService   | lifecycle + evidence symbols  |
| workflow_store...    | persistence dependency        |
+----------------------+-------------------------------+

[Open Symbol] [View Relationships] [Get Related Code]
```

### Symbol relationship page

```text
Home > Code Intelligence > derive_checkpoint_evidence

+------------------------------------------------------+
| Symbol: derive_checkpoint_evidence                   |
| Why does this symbol matter?                         |
+------------------------------------------------------+

Defined in:
src/orchestration/workflow_run_service.py

Calls:
- load_checkpoint()
- build_evidence_packet()
- persist_gate_evidence()

Called by:
- complete_workflow_step()
- advance_workflow_gate()

Risk:
This symbol mixes lifecycle, evidence, and persistence concerns.

[Show Code] [Show Call Graph] [Map to Pattern]
```

## 4. Pattern / Anti-pattern Registry Service

```text
Home > Patterns

+---------------------------+----------------------------+
| Patterns                  | Anti-pattern Rules          |
+---------------------------+----------------------------+
| generic-wrapper-runtime   | bespoke-wrapper-script      |
| sql-first-truth           | markdown-as-authority       |
| governed-retrieval        | ad-hoc-repo-scan            |
| wrapper-only-mutation     | direct-manual-patch         |
+---------------------------+----------------------------+

Primary question:
Is this code following the architecture we want?

Actions:
[View Pattern] [View Anti-pattern] [Map Finding]
```

### Finding detail

```text
Home > Patterns > bespoke-wrapper-script

+------------------------------------------------------+
| Anti-pattern: bespoke-wrapper-script                 |
| What is wrong and what should replace it?            |
+------------------------------------------------------+

Severity: High
Trigger:
- hard-coded source path
- hard-coded destination path
- exact string rewrite
- local evidence

Detected Files:
+----------------------+-------------------------------+
| File                 | Evidence                      |
+----------------------+-------------------------------+
| scripts/execute...   | hard-coded responsibility     |
| scripts/refactor...  | embedded template body        |
+----------------------+-------------------------------+

Recommended Pattern:
generic-wrapper-runtime

[Create Finding] [Propose Remediation]
```

## 5. Refactor Candidate Workbench

```text
Home > Refactor Workbench

+------------------------------------------------------+
| Refactor Candidate Workbench                         |
| Which file is the best governed refactor candidate?  |
+------------------------------------------------------+

Ranked Candidates
+-----+-------------------------------+------+----------+
| #   | File                          | LOC  | Risk     |
+-----+-------------------------------+------+----------+
| 1   | workflow_store_implementation | 1655 | High     |
| 2   | codebase_shape_store          | 1619 | High     |
| 3   | workflow_run_service          | 1347 | High     |
+-----+-------------------------------+------+----------+

[Analyze Candidate] [Compare Candidates] [Open Evidence]
```

### Candidate analysis

```text
Home > Refactor Workbench > workflow_run_service.py

+------------------------------------------------------+
| Candidate Analysis                                   |
| Can this file be safely split by responsibility?     |
+------------------------------------------------------+

Current Responsibilities
+----------------------+-------------------------------+
| Responsibility       | Proposed Destination           |
+----------------------+-------------------------------+
| run lifecycle        | workflow_run_lifecycle.py      |
| checkpoint evidence  | workflow_checkpoint_evidence.py|
| gate transition      | workflow_gate_transition.py    |
| persistence adapter  | workflow_run_persistence.py    |
+----------------------+-------------------------------+

Retained Source Role:
thin coordinator / facade

Gate Readiness:
[✓] responsibilities mapped
[✓] destination modules proposed
[!] blast radius needs review

[Evaluate Scope] [Draft Proposal]
```

## 6. Governed Remediation Proposal Service

```text
Home > Remediation Proposals

+------------------------------------------------------+
| Remediation Proposal                                 |
| What governed change should be submitted?            |
+------------------------------------------------------+

Proposal Type:
God-file decomposition

Source File:
src/orchestration/workflow_run_service.py

Replacement Pattern:
generic-wrapper-runtime + thin coordinator

Execution Rule:
Proposal only. Wrapper executes. Gate validates.

+----------------------+-------------------------------+
| Required Evidence    | Status                        |
+----------------------+-------------------------------+
| Responsibility map   | Ready                         |
| Destination map      | Ready                         |
| Blast radius         | Needs review                  |
| Validation plan      | Ready                         |
| Rollback strategy    | Ready                         |
+----------------------+-------------------------------+

[Submit Proposal] [Save Draft] [Open Evidence Drawer]
```

## 7. Service Navigation Model

```text
Inspection Home
|
+-- Projections
|   +-- Projection Catalog
|   +-- Projection Detail
|   +-- Navigation Graph
|
+-- Repositories
|   +-- Repository Detail
|   +-- Project Files
|   +-- File Detail
|   +-- Content Window
|
+-- Code Intelligence
|   +-- Symbol Search
|   +-- Symbol Detail
|   +-- Relationship Graph
|   +-- Change Analysis
|
+-- Patterns
|   +-- Pattern Registry
|   +-- Anti-pattern Rule
|   +-- Finding Detail
|
+-- Refactor Workbench
|   +-- Candidate Ranking
|   +-- Candidate Analysis
|   +-- Scope Evaluation
|
+-- Remediation
    +-- Proposal Draft
    +-- Proposal Evidence
    +-- Submission Result
```

My favorite review direction: **make each page answer exactly one question**, and force raw IDs, JSON, and lineage into evidence drawers unless they are the thing being inspected.
