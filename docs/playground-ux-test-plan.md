# Playground UX Test Plan (Expanded)

## Objective

Validate whether a client-only playground can:

1. Render human-first inspection surfaces from governed projections
2. Support code inspection for refactoring candidates
3. Do both without breaking governance boundaries

Core rule:

```text
SQL truth -> governed projection -> LOGA-style UI -> evidence drawer
repo truth -> inspection -> candidate packet -> (no mutation)
```

This extends the repo-less experiment to include safe repo inspection for discovery, not mutation.

---

# Test Scope

## In scope

| Area | What to test |
| --- | --- |
| Connectivity | Can the playground reach AI Engine? |
| Projection loading | Can it load operator/project/workflow/evidence projections? |
| Contract validation | Does each response include LOGA/provenance metadata? |
| Navigation | Can users move through projection graph nodes? |
| Human readability | Does each screen answer one clear question? |
| Evidence handling | Are raw payloads available but not primary? |
| Failure behavior | Do unsupported/missing surfaces fail clearly? |
| Surface hygiene | Does the playground avoid anti-patterns? |
| Repo inspection | Can the playground inspect code safely for refactor candidates? |
| Refactor discovery | Can it produce governed refactor candidate packets? |

## Out of scope

* Direct SQL queries
* Direct workflow mutation
* Wrapper execution
* Repo writes or patch generation
* Treating markdown as authority

---

# Test Fixtures

## A. Projection surfaces

```ts
client.getLogaOperatorHomeProjection()
client.getLogaProjectCatalogProjection()
client.getLogaProjectRoadmapProjection(projectId)
client.getLogaRoadmapItemProjection(projectId, itemKey)
client.getLogaWorkflowRunProjection(workflowRunId)
client.getLogaEvidencePacketProjection(packetKey)
```

These are governed projections with provenance metadata, not raw JSON APIs.

## B. Code inspection surfaces

Use either:

### Option 1 - API-first

```ts
client.getSymbolDefinition(...)
client.getRelatedCode(...)
client.searchCodeByIntent(...) // if implemented
```

### Option 2 - direct repo read

* Load file content
* Analyze locally
* Produce candidate packet

Must not become authority; this is diagnostic only.

---

# Test Lanes

## Lane A - Projection UX

### A1 - Connectivity

Goal: confirm client can reach engine.

```ts
await client.ping()
```

Pass:

* Returns healthy response

### A2 - Projection Load

Goal: load operator home.

Pass:

* Markdown returned
* Includes `logaContract`, `projectionType`, and `sourceTruth: sql`

### A3 - Contract Validation

Goal: validate projection metadata.

Pass:

* Contract matches expected version
* Provenance fields exist

### A4 - Navigation Flow

Goal: traverse projection graph.

```text
Home -> Projects -> Roadmap -> Item -> Evidence
```

Pass:

* All navigation driven by `::nav` or links
* No hardcoded routes

### A5 - Human Readability

Goal: screen answers a single question.

Must align with canonical set:

* What is happening?
* What should I care about?
* What do I decide?
* Why trust this?
* What next?

Pass:

* One primary question visible at top
* Supporting sections reinforce it

### A6 - Evidence Handling

Goal: validate evidence drawer pattern.

Pass:

* Raw payload hidden behind drawer
* Summary visible first
* No JSON-first UI

### A7 - Failure Behavior

Goal: test missing or unsupported surfaces.

Pass:

* Returns `unsupported` or `not_found`
* No hallucinated data

### A8 - Surface Hygiene

Goal: ensure proper behavior.

Fail if:

* Repo clone requested
* Files assumed as truth
* Direct mutation suggested
* Markdown treated as authority

Pass:

* API-first reasoning maintained

## Lane B - Repo Inspection UX

This is the discovery lane.

### B1 - File Inventory Awareness

Goal: identify large or problematic files.

Input:

* repo file list or API equivalent

Pass:

* Surfaces candidates with high LOC, high symbol count, or orchestration-heavy structure

### B2 - Responsibility Detection

Goal: understand what a file does.

Pass:

* Produces responsibility clusters
* Groups symbols
* Notes dependencies

### B3 - Seam Identification

Goal: suggest module boundaries.

Pass:

* Each proposal includes responsibility name, source symbols, destination module, rationale, and blast radius

### B4 - Refactor Candidate Packet

Goal: produce governed contract-ready output.

Pass output:

```json
{
  "source_file_path": "...",
  "responsibility_map": [],
  "retained_source_responsibility": "...",
  "destination_module_map": [],
  "allowed_blast_radius": "...",
  "validation_requirements": []
}
```

### B5 - Governance Alignment Check

Goal: ensure correct execution path is recommended.

Pass:

* Recommends wrapper execution and contract approval
* Does not suggest direct edits or patch files

### B6 - Anti-Pattern Detection

Goal: catch bad implementation instincts.

Fail if:

* Bespoke scripts suggested
* Hardcoded extraction logic
* Manual evidence generation

---

# Cross-Lane Validation

## C1 - Projection to Code Alignment

Goal: ensure UI and code understanding match.

Pass:

* No semantic mismatch between projection and code inspection

## C2 - Evidence Traceability

Goal: can user trace UI -> code -> evidence?

Pass:

* Each claim links to projection, source, and evidence reference

## C3 - Human Decision Support

Goal: validate real usefulness.

User should be able to answer:

* What is happening?
* What should I care about?
* Is this file a problem?
* How should it be split?
* What should happen next?

---

# Success Criteria

## Minimum success

* All projection surfaces render correctly
* Navigation works end-to-end
* Evidence is structured and hidden by default

## Strong success

* Code inspection identifies real refactor candidates
* Candidate packet matches contract structure
* No governance violations occur

## Breakthrough success

```text
User navigates UI
-> identifies problem
-> inspects code
-> generates refactor contract
-> ready for governed execution
```

---

# Key Risks

| Risk | Description |
| --- | --- |
| System-dump UI | Too much raw data, not enough guidance |
| Repo-as-authority | Treating files as truth vs SQL |
| Mutation drift | Suggesting edits instead of wrapper path |
| Governance theater | Explaining instead of producing structured output |

---

# Final Framing

This experiment is not just:

> "Can we build a UI?"

It is:

> Can a client-only system become a governed inspection and refactor discovery interface over both SQL truth and code reality?

You are testing two things at once:

```text
1. Human decision UX (projection lane)
2. Code intelligence UX (inspection lane)
```

If both work together, you have unlocked a client that can support operator work and refactor discovery without needing the repo locally.
