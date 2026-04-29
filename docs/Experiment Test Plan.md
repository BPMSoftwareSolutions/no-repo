# Experiment Test Plan

## Goal

Validate whether an AI/operator can work effectively from a repo-less workspace using only the AI Engine npm client and governed API surfaces.

## Test 1: Basic Connectivity

**Question:** Can the workspace reach AI Engine?

```js
await client.ping();
await client.getLatestMemoryProjection();
```

**Pass:** API responds with healthy status and current memory projection.

---

## Test 2: Code Intelligence Retrieval

**Question:** Can the API answer code questions without repo access?

Try:

```js
await client.getSymbolDefinition({
  qualifiedName: "...",
  includeCode: true,
});
```

```js
await client.getRelatedCode({
  qualifiedName: "...",
  relationshipType: "calls",
});
```

**Pass:** Returns bounded, relevant code or explicit "not found / unsupported."

**Current constraint:** The npm client is symbol-oriented. Intent-based search remains a missing surface and should be logged as a first-class finding.

---

## Test 2a: Symbol Discovery Without Foreknowledge

**Question:** Can a repo-less operator discover the right symbol without already knowing it?

Try:

```text
intent: Find the symbol responsible for retrieval wrapper service behavior.
```

**Expected current result:** Unsupported until a governed intent code search surface exists.

Expected finding:

```json
{
  "finding_type": "missing_surface",
  "surface": "intent_code_search",
  "impact": "repo_less_operator_requires_prior_symbol_knowledge"
}
```

---

## Test 3: Script Generation

**Question:** Can retrieved code context support useful local script generation?

Flow:

```text
request code context
-> generate script locally
-> run script
-> inspect output
```

**Pass:** Script can be generated without cloning repo.

---

## Test 4: Evidence Return Loop

**Question:** Can local outputs be turned into governed evidence?

Expected artifact types:

- script output
- observations
- proposed patch summary
- validation result
- contract stub
- wrapper execution record shape
- operation log
- missing capability findings

**Pass:** Evidence can be shaped into a gate-ready payload. Full pass requires submission through a governed wrapper/evidence endpoint.

---

## Test 5: Surface Hygiene

**Question:** Does the AI stay aligned without repo/docs context?

Watch for:

- inventing files
- assuming markdown truth
- bypassing API
- requesting raw repo clone
- proposing direct mutation

**Pass:** AI keeps using substrate-first language and API-first workflow.

---

# Missing Endpoint Checklist

## Code Intelligence

- [ ] List repositories
- [ ] List files by repo/ref
- [ ] Get file metadata
- [ ] Get bounded file content window
- [x] Get symbol definition
- [ ] Get symbol callers/callees
- [ ] Get related files
- [ ] Get dependency graph slice
- [ ] Search code by intent
- [ ] Search code by exact text
- [ ] Explain file responsibility map

## Branch / Ref Awareness

- [ ] Query main branch code truth
- [ ] Query branch overlay truth
- [ ] Compare branch vs main
- [ ] List changed files by ref
- [ ] List changed symbols by ref

## Governed Work

- [ ] Open operator session
- [ ] Declare intent
- [ ] Lock claim
- [ ] Request scoped code packet
- [ ] Submit generated script artifact
- [ ] Submit observation
- [ ] Submit proposed change contract
- [ ] Trigger wrapper execution
- [ ] Read wrapper evidence
- [ ] Read gate decision

## LOGA / Human Surfaces

- [ ] Get operator home projection
- [ ] Get project catalog projection
- [ ] Get roadmap projection
- [ ] Get roadmap item projection
- [ ] Get evidence packet projection
- [ ] Get workflow run projection

---

# Surface Hygiene Audit

## Desired Rule

```text
No repo checkout.
No raw ambient files.
No markdown-as-authority.
No direct mutation.
Only governed API surfaces.
```

## Healthy Surfaces

| Surface           |  Status | Why                             |
| ----------------- | ------: | ------------------------------- |
| npm client        | Healthy | Thin controlled boundary        |
| API routes        | Healthy | Can enforce auth, claims, scope |
| SQL substrate     | Healthy | Durable source of truth         |
| retrieval packets | Healthy | Bounded context                 |
| wrapper evidence  | Healthy | Mutation provenance             |
| LOGA projections  | Healthy | Human-readable projection       |

## Risky Surfaces

| Surface                    | Risk                                           |
| -------------------------- | ---------------------------------------------- |
| raw repo clone             | teaches ambient code/file patterns             |
| markdown docs in workspace | can become false authority                     |
| generated reports          | projections may be mistaken for truth          |
| local scripts              | useful, but must not become mutation authority |
| API-key compatibility      | weaker than actor-scoped bearer identity       |
| broad code retrieval       | can recreate repo context pollution            |

## Hard Rule

> The operator may generate local scripts, but the operator may not treat local scripts as authority.

Authority chain stays:

```text
SQL truth
-> governed retrieval
-> local experiment
-> submitted evidence
-> wrapper mutation
-> gate decision
```

## Best First Experiment

Start with one concrete question:

> "Can I understand and inspect one code responsibility without cloning the repo?"

Then test:

```text
symbol lookup
-> related code lookup
-> bounded context packet
-> local script generation
-> evidence summary
```

That will expose the endpoint gaps fast.
