# Client UX Inspection Test Suite

## Test Objective

Validate that a client can inspect AI Engine work through **human-friendly, governed inspection surfaces** without needing raw SQL, raw JSON, repo access, or transcript archaeology.

Core UX rule:

> Every inspection surface must answer: **What is happening? What matters? What do I decide? Why trust it? What next?** 

---

# 1. Global Pass / Fail Rubric

| Score | Meaning                                         |
| ----: | ----------------------------------------------- |
|     5 | User understands, trusts, and acts without help |
|     4 | Minor hesitation, but correct outcome           |
|     3 | Completes task with confusion                   |
|     2 | Needs guidance or opens raw payload too early   |
|     1 | Cannot complete task                            |
|     0 | Makes wrong decision confidently                |

A surface passes only if it scores **4+** on:

1. Orientation
2. Focus
3. Decision clarity
4. Evidence/trust
5. Next action clarity

---

# 2. Primary Inspection Surfaces

## A. Operator Home

**Primary question:**

> What needs attention now?

### Test Cases

| ID    | Scenario              | User Task                                | Pass Condition                                         |
| ----- | --------------------- | ---------------------------------------- | ------------------------------------------------------ |
| OH-01 | Normal active system  | Identify current active project/workflow | User names the right active item in under 30 seconds   |
| OH-02 | Multiple active lanes | Determine highest-priority lane          | User selects correct priority without reading raw JSON |
| OH-03 | No active work        | Understand system is idle / complete     | User does not interpret null active item as failure    |
| OH-04 | Blocked work          | Find blocker and next step               | User finds blocker and action path                     |
| OH-05 | Stale projection      | Detect outdated snapshot                 | UI exposes generated time/source version clearly       |

UX expectation: summary first, diagnosis second, payload third. That rule is already part of the LOGA operator model. 

---

## B. Project / Charter Inspection

**Primary question:**

> Why does this project exist, and what stage is it in?

### Test Cases

| ID    | Scenario                    | User Task                                      | Pass Condition                                      |
| ----- | --------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| PC-01 | Chartered project           | Explain objective, scope, owner, current stage | User can summarize project in plain language        |
| PC-02 | Awaiting approval           | Identify decision needed                       | User knows whether to approve, reject, or revise    |
| PC-03 | Scope expansion             | Notice new scope items                         | User detects changed scope without diffing markdown |
| PC-04 | Charter vs roadmap mismatch | Identify authority                             | User recognizes SQL-backed projection as truth      |
| PC-05 | Identity/security project   | Identify actor/governance implications         | User sees why actor attribution matters             |

This is important because the engine treats SQL as durable operational truth, while markdown reports are projections. 

---

## C. Implementation Roadmap Inspection

**Primary question:**

> What is the delivery state?

### Test Cases

| ID    | Scenario                | User Task                              | Pass Condition                                          |
| ----- | ----------------------- | -------------------------------------- | ------------------------------------------------------- |
| IR-01 | In-progress roadmap     | Identify active item                   | User finds current focus quickly                        |
| IR-02 | Completed roadmap       | Confirm no remaining work              | User does not mistake null active item for broken state |
| IR-03 | Blocked item            | Find blocker, evidence, owner          | User can explain blocker and next action                |
| IR-04 | Done item with evidence | Verify completion proof                | User finds evidence count / acceptance checks           |
| IR-05 | Roadmap drift           | Compare summary vs item state          | UI reveals contradiction clearly                        |
| IR-06 | All-project progress    | Identify which project needs attention | User selects correct project from portfolio view        |

Use the Azure SQL → PostgreSQL roadmap as a reference fixture because it contains a completed roadmap, approved packet, evidence counts, and phase summaries. 

---

## D. Workflow Run Inspection

**Primary question:**

> What happened in this run?

### Test Cases

| ID    | Scenario               | User Task                     | Pass Condition                               |
| ----- | ---------------------- | ----------------------------- | -------------------------------------------- |
| WR-01 | Completed run          | Explain run outcome           | User identifies status, stage, evidence      |
| WR-02 | Blocked run            | Find blocking gate            | User knows why run cannot advance            |
| WR-03 | Failed step            | Locate failed step and cause  | User finds failure without reading full logs |
| WR-04 | Waiting state          | Distinguish waiting vs failed | User does not misclassify pending approval   |
| WR-05 | Missing assistant turn | Understand null turn fields   | User does not infer stale telemetry          |
| WR-06 | Cross-link to roadmap  | Navigate run → roadmap item   | User reaches related roadmap item            |

The README already lists current workflow status, operator API wrappers, current-run snapshot semantics, and roadmap bindings as first-class inspection surfaces. 

---

## E. Agent Run / Session / Turn Inspection

**Primary question:**

> What did the agent do, and was it legitimate?

### Test Cases

| ID    | Scenario            | User Task                                 | Pass Condition                             |
| ----- | ------------------- | ----------------------------------------- | ------------------------------------------ |
| AG-01 | Normal session      | Trace session → turn → objective          | User follows the chain                     |
| AG-02 | Mutation attempt    | Verify claim/scope legitimacy             | User can tell whether mutation was allowed |
| AG-03 | Missing orientation | Detect unready agent state                | UI exposes eligibility failure             |
| AG-04 | Completed turn      | Verify SQL persistence                    | User sees durable turn record              |
| AG-05 | Compliance gap      | Identify unresolved gap                   | User knows next required action            |
| AG-06 | Wrong authority     | Detect transcript/narrative-only evidence | User rejects unsupported claim             |

This aligns with the execution loop around `startWork`, claim-bound turn persistence, `completeTurn`, SQL evidence, and promotion. 

---

## F. Wrapper Execution Inspection

**Primary question:**

> Did the governed wrapper actually perform the work?

### Test Cases

| ID    | Scenario                    | User Task                                  | Pass Condition                                |
| ----- | --------------------------- | ------------------------------------------ | --------------------------------------------- |
| WX-01 | Completed wrapper run       | Confirm wrapper executed approved contract | User finds execution record and contract hash |
| WX-02 | Missing wrapper evidence    | Decide whether gate should pass            | User correctly blocks                         |
| WX-03 | Operation trail             | Inspect per-operation result               | User can explain what changed                 |
| WX-04 | File manifest               | Confirm files created/modified             | User sees touched files and hashes            |
| WX-05 | Planned vs actual mismatch  | Detect ownership drift                     | User rejects or flags variance                |
| WX-06 | Bespoke script anti-pattern | Identify invalid mutation path             | User rejects one-off wrapper script           |

This is a must-have because the wrapper is supposed to be the only mutation authority, and evidence gates only trust wrapper-origin artifacts. 

---

## G. Promotion Backlog Inspection

**Primary question:**

> Is this ready to promote?

### Test Cases

| ID    | Scenario                             | User Task                     | Pass Condition                                |
| ----- | ------------------------------------ | ----------------------------- | --------------------------------------------- |
| PB-01 | Ready packet                         | Approve promotion             | User finds evidence and impact                |
| PB-02 | Missing downstream impact            | Block promotion               | User identifies missing dependency assessment |
| PB-03 | Stale consumer linkage               | Detect stale downstream state | User does not promote                         |
| PB-04 | Generated projection edited directly | Reject file-backed authority  | User recognizes SQL must be truth             |
| PB-05 | Multiple queued changes              | Prioritize safely             | User selects highest readiness / lowest risk  |

This matters because package/source changes now require SQL-backed dependency impact and downstream consumer posture. 

---

## H. Architecture Integrity Inspection

**Primary question:**

> Is this safe / approved?

### Test Cases

| ID    | Scenario           | User Task                   | Pass Condition                        |
| ----- | ------------------ | --------------------------- | ------------------------------------- |
| AI-01 | Clean run          | Confirm approval posture    | User sees decision band               |
| AI-02 | Block finding      | Find blocker and location   | User identifies severity and source   |
| AI-03 | Waived finding     | Explain waiver status       | User sees who approved and expiration |
| AI-04 | Remediated finding | Verify remediation evidence | User finds evidence links             |
| AI-05 | Mixed findings     | Prioritize action           | User handles block before warnings    |

Architecture integrity already has SQL-backed runs, findings, evidence links, and projections. 

---

## I. Codebase / DB Inspection

**Primary question:**

> What does the system know about the code/database state?

### Test Cases

| ID    | Scenario             | User Task                  | Pass Condition                                |
| ----- | -------------------- | -------------------------- | --------------------------------------------- |
| DB-01 | Code inventory       | Find large/high-risk files | User identifies god-file candidates           |
| DB-02 | Symbol inventory     | Locate symbol definition   | User finds bounded symbol context             |
| DB-03 | DB run history       | Inspect persisted runs     | User distinguishes workflow run vs domain run |
| DB-04 | Stuck domain run     | Detect stranded state      | User identifies started-but-not-completed row |
| DB-05 | DB migration posture | Identify authority DB      | User understands current SQL truth source     |

Use document-to-audio as a great fixture: it has successful live render records and older stuck `started` rows. 

---

## J. LOGA Markdown Projection Inspection

**Primary question:**

> Can the user navigate governed state as a document-native workspace?

### Test Cases

| ID    | Scenario                    | User Task                              | Pass Condition                            |
| ----- | --------------------------- | -------------------------------------- | ----------------------------------------- |
| LG-01 | Project roadmap projection  | Navigate from project → roadmap → item | User follows breadcrumbs                  |
| LG-02 | Evidence drawer             | Verify trust without overload          | User opens evidence only when needed      |
| LG-03 | Raw payload fallback        | Inspect raw JSON safely                | Payload is available but not first-screen |
| LG-04 | Related documents           | Move laterally across graph            | User finds charter/workflow/evidence      |
| LG-05 | Invalid projection contract | Detect unsupported projection          | LOGA blocks or warns clearly              |

LOGA’s intended model is SQL truth → typed projection → structured markdown → navigable workflow surface. 

---

# 3. Cross-Surface Journey Tests

These are the highest-value tests.

## Journey 1: “What needs attention?”

```text
Operator Home
→ Project
→ Roadmap
→ Active Item
→ Evidence
→ Next Action
```

**Pass:** User identifies the right work item and next action without raw IDs.

---

## Journey 2: “Is this ready to approve?”

```text
Roadmap Item
→ Acceptance Checks
→ Evidence Packet
→ Gate Decision
→ Approve / Revise
```

**Pass:** User makes the correct approval decision and explains why.

---

## Journey 3: “Why did this fail?”

```text
Operator Home
→ Workflow Run
→ Failed Step
→ Agent Turn
→ Error / Evidence
→ Retry or Escalate
```

**Pass:** User identifies cause and safe next action.

---

## Journey 4: “Can I trust this code change?”

```text
Promotion Queue
→ Wrapper Execution
→ Operation Records
→ File Manifest
→ Planned-vs-Actual Ownership
→ Gate Decision
```

**Pass:** User approves only when wrapper evidence proves the approved contract was executed.

---

## Journey 5: “Where did this output come from?”

```text
Generated Artifact
→ Workflow Run
→ Step Run
→ Agent Turn
→ Wrapper Evidence
→ Source Contract
```

**Pass:** User reconstructs lineage.

---

## Journey 6: “Is the system lying to me?”

Inject a contradiction:

```text
Roadmap says done
Workflow says failed
Evidence missing
```

**Pass:** UI surfaces contradiction and prefers durable SQL-backed evidence over narrative projection.

---

# 4. Edge Case Stress Tests

| ID    | Edge Case                                    | Expected UX Behavior                                |
| ----- | -------------------------------------------- | --------------------------------------------------- |
| EC-01 | Looks done, evidence missing                 | Block trust / approval                              |
| EC-02 | Evidence exists, hidden too deeply           | Fail: user cannot verify                            |
| EC-03 | Too much raw truth                           | Fail: cognitive overload                            |
| EC-04 | SQL and markdown disagree                    | SQL-backed state wins                               |
| EC-05 | Stale assistant turn                         | UI shows null/current-run semantics, not stale data |
| EC-06 | Stuck started run                            | UI labels as stranded/incomplete                    |
| EC-07 | Generated projection edited                  | UI rejects as non-authoritative                     |
| EC-08 | Missing actor identity                       | UI warns attribution incomplete                     |
| EC-09 | Wrapper skipped operation                    | UI requires rationale                               |
| EC-10 | Branch/proposal code state differs from main | UI distinguishes authoritative vs proposed truth    |

---

# 5. User Roles to Test

| Role             | What to Validate                           |
| ---------------- | ------------------------------------------ |
| Client executive | Can understand status and risk quickly     |
| Operator         | Can find blockers and next actions         |
| Reviewer         | Can approve/reject with evidence           |
| Developer        | Can trace workflow → code → evidence       |
| Auditor          | Can verify actor, decision, and provenance |
| New user         | Can orient without internal IDs            |

---

# 6. Required Test Fixtures

Create or reuse these fixtures:

1. **Completed project** — Azure SQL → PostgreSQL roadmap, 100% done. 
2. **Blocked charter** — OIDC/OAuth boundary migration blocked at approval. 
3. **Wrapper refactor run** — planned-vs-actual ownership and file manifest. 
4. **Stuck domain run** — audio render stuck in `started`. 
5. **Architecture finding run** — block/warn/waiver/remediation states. 
6. **Promotion backlog packet** — ready, blocked, stale, missing downstream evidence.
7. **LOGA projection graph** — operator home → project → roadmap → item → evidence. 

---

# 7. The Killer Acceptance Criterion

The inspection UX is strong when a client can say:

> “I know what is happening, what matters, what I need to decide, why I can trust it, and what to do next.”

Without needing:

```text
raw SQL
raw JSON
repo checkout
chat transcript
developer explanation
internal IDs as primary labels
```

That’s the bar.
