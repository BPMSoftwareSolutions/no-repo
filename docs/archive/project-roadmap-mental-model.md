You’re zeroing in on the **most important surface in the entire system**:
👉 *Project → Roadmap → Active Work → Evidence → Decision → Action*

If this is wrong, everything feels like a data dump again.
If it’s right, the system becomes **intuitive, fast, and trustworthy**.

---

# 🧠 The Correct Mental Model (Flow)

```text
Project
  → Roadmap (What’s happening)
    → Current Focus (What matters now)
      → Item (What is being worked)
        → Tasks (What needs to be done)
        → Evidence (Why we trust it)
        → Actions (What we do next)
```

Everything must collapse into:

> **“What should I care about right now?”**

---

# 🧭 Step-by-Step UX Flow (Concrete Example)

## 1. Project Detail Page

```markdown
# AI Engine

::focus
question: "What’s happening in this project?"
answer: "PostgreSQL migration is complete. Refactor work is now the top priority."
status: "active"
::

## Current Focus

→ Governed refactor system rollout

## Navigation

- View Roadmap
- View Workflow Runs
- View Promotions
```

👉 This page is **orientation only**
👉 No overload, no deep data yet

---

## 2. Roadmap Page (THIS IS YOUR CORE SURFACE)

```markdown
# Roadmap
## AI Engine

::focus
question: "What should I care about right now?"
answer: "The system is ready for refactor execution, but wrapper standardization is incomplete."
status: "in progress"
::

---

## Current Focus

::panel
title: "Establish generic wrapper runtime"
status: "in progress"
owner: "operator"
::

---

## Why This Matters

- Current wrappers are bespoke
- Violates architecture pattern
- Blocks safe automation

---

## Next Actions

::next_actions
- Review refactor candidate
- Approve decomposition contract
- Execute wrapper
::

---

## Drill Down

::nav
- Open Current Item
- View Evidence
- View Workflow Runs
::
```

👉 This is the **decision surface**
👉 It answers: *What do I care about?*

---

# 🔍 3. Roadmap Item Page (Execution Surface)

```markdown
# Roadmap Item

## Generic Wrapper Runtime

::focus
question: "What is being worked right now?"
answer: "Replacing bespoke scripts with contract-driven wrapper execution."
status: "in progress"
::

---

## Tasks

- Define contract schema
- Implement wrapper operations
- Replace hard-coded scripts
- Validate execution evidence

---

## Current Task

→ Replace `execute_workflow_run_checkpoint_evidence_wrapper.py`

---

## Status

- Tasks complete: 2 / 4
- Blockers: 1
- Risk: Medium

---

## Actions

::next_actions
- Continue implementation
- Open blocker
- Submit for review
::
```

👉 This is **execution clarity**
👉 No noise, just what’s happening

---

# 🧾 4. Task Detail Page (Granular Work)

```markdown
# Task

## Replace bespoke wrapper script

::focus
question: "What needs to happen?"
answer: "Convert script into generic wrapper operation."
status: "in progress"
::

---

## Implementation

- Identify hard-coded paths
- Extract reusable operations
- Map to contract schema

---

## Evidence

::evidence_drawer
- script analysis
- symbol mapping
- contract diff
::

---

## Result

- 60% complete
- awaiting validation

---

## Next Actions

- run wrapper test
- submit evidence
```

---

# 🔐 5. Evidence Packet (Trust Surface)

```markdown
# Evidence Packet

::focus
question: "Why should I trust this?"
answer: "Wrapper execution produced verifiable operation logs and file changes."
::

---

## Execution Record

- wrapper: governed_refactor_wrapper
- contract_id: abc123
- status: completed

---

## Operation Log

- extract_symbol_group → success
- rewrite_imports → success
- remove_source_symbols → success

---

## Verification

- planned vs actual ownership: match
- source file LOC: reduced
- no residual responsibilities

---

## Decision

PASS
```

👉 This is **trust, not execution**

---

# 🚀 6. Promotions (SDK / Platform Evolution)

```markdown
# Promotions

::focus
question: "What capabilities were promoted?"
answer: "New refactor APIs were added to SDK."
::

---

## Recent Promotions

- startWork → unified entrypoint
- completeTurn → governed exit
- runCharter → workflow execution

---

## Impact

- removed manual orchestration
- enforced governance
- simplified agent behavior

---

## Next Actions

- adopt in workflows
- update SDK usage
```

---

# ⚙️ 7. Workflow Runs (Runtime Surface)

```markdown
# Workflow Runs

::focus
question: "What is currently running?"
answer: "Refactor workflow is active."
::

---

## Active Runs

- refactor_workflow_run_123 → running
- architecture_review_456 → waiting

---

## Last Run

- status: completed
- duration: 1m 32s
- result: PASS

---

## Actions

- open run
- view logs
```

---

# 🔁 8. Turn + Memory (Agent Observability)

```markdown
# Agent Session

::focus
question: "What is the agent doing?"
answer: "Agent is executing refactor workflow under claim scope."
::

---

## Current Turn

- objective: refactor workflow_run_service
- status: active
- claim_id: xyz789

---

## Memory

- active reminders: wrapper-only execution
- blocked instincts: no local scripts

---

## Turn History

- Turn 1 → startWork
- Turn 2 → analyze candidate
- Turn 3 → propose contract

---

## DB State

- workflow_run_id: ...
- agent_session_id: ...
```

👉 This gives you:

* **memory**
* **DB truth**
* **execution trace**

---

# 🔥 What This Whole System Achieves

### Instead of:

```text
system dump UI
→ overwhelming
→ unreadable
→ ignored
```

### You get:

```text
guided workspace
→ orient
→ focus
→ act
→ trust
```

---

# 🧩 Key Design Rules (Do NOT break these)

### 1. One primary question per page

Everything else supports it

---

### 2. Focus → then detail

Never reverse this

---

### 3. Evidence is always behind a drawer

Trust is optional, not forced

---

### 4. Navigation is forward, not hierarchical

Always ask:

> “Where does the user go next?”

---

### 5. Every surface maps to a thinking mode

| Surface   | Mode    |
| --------- | ------- |
| Project   | orient  |
| Roadmap   | focus   |
| Item      | execute |
| Evidence  | trust   |
| Workflow  | monitor |
| Promotion | evolve  |

---

# 💡 Final Insight (This is the big one)

What you’re building is NOT:

> a UI for data

It is:

> **a UI for thinking inside a governed system**
