This is the next **critical thinking mode**.

You’ve now got **Review** locked.
Here’s the full **Execution Live Monitor fixture**—designed to complete the triad:

> **Review → Diagnostic → Execution**

---

# ⚙️ Execution Live Monitor Fixture

## Projection Type

```text
operator.execution_live_monitor
```

## Thinking Mode

```text
execution
```

## Primary Question

```text
What is currently running?
```

---

# 🧠 Purpose

This surface answers:

> “What is happening *right now*, and do I need to intervene?”

It is **NOT**:

* logs
* raw telemetry
* step dumps

It is:

* **status + clarity + control**

---

# 🧱 Required UX Contract (Must Pass Gate)

### Required primitives

```text
::focus
::metric_row
::panel
::next_actions
::evidence_drawer
```

---

### Required canonical questions

```text
What is happening?
What should I care about right now?
What do I need to decide?
Why should I trust this?
What should I do next?
```

---

# 🧩 Canonical Fixture (PASSING SHAPE)

```markdown
---
loga_contract: "ai-engine-ui/v1"
interaction_contract: "loga-choreography/v1"
navigation_contract: "loga-navigation/v1"
projection_type: "operator.execution_live_monitor"
source_system: "ai-engine"
source_truth: "sql"
thinking_mode: "execution"
---

# Execution Monitor

::focus
question: "What is currently running?"
answer: "A workflow run is actively executing step 3 of 5 with no current blockers."
status: "in_progress"
::

---

## What is happening?

::panel
- Workflow: PostgreSQL Migration Execution
- Current Step: Apply schema migrations
- Progress: Step 3 of 5
- Status: Running
::

---

## What should I care about right now?

::panel
- No blockers detected
- Execution within expected duration
- Monitoring for completion or failure
::

---

## What do I need to decide?

::panel
- No immediate decisions required
- Be ready to intervene if failure occurs
::

---

## Why should I trust this?

::evidence_drawer
- Live workflow_run_id: 5C307F62...
- Step run state persisted in SQL
- Latest agent turn recorded
- Wrapper execution status: active
::

---

## What should I do next?

::next_actions
- Continue monitoring
- Open detailed step view
- Cancel execution
- Refresh status
::
```

---

# 🔥 Required Scenarios (Test Fixtures)

You MUST test multiple execution states—not just “happy path”

---

## 🟢 Scenario 1: Healthy Execution

**Expected:**

* clear progress
* no decisions required
* passive monitoring

---

## 🟡 Scenario 2: Long-Running / At Risk

```markdown
::focus
answer: "Execution is running longer than expected."
status: "at_risk"
```

**Expected UX:**

* highlight duration anomaly
* suggest inspection

**Actions:**

* Inspect logs
* Check step details

---

## 🔴 Scenario 3: Blocked Execution

```markdown
status: "blocked"
```

**Expected UX:**

* show blocking cause clearly
* transition toward diagnostic thinking

**Actions:**

* Investigate blocker
* Resume or escalate

---

## 🔥 Scenario 4: Failed Execution

```markdown
status: "failed"
```

**Expected UX:**

* immediate clarity of failure
* transition to diagnostic mode

**Actions:**

* Open failure diagnostics
* Retry execution

---

## ⚠️ Scenario 5: Stuck / Silent Failure

This is *very important* given your system behavior.

Example:

* run_status = "started"
* no updates
* no completion

**Expected UX:**

* detect stagnation
* NOT show as “running normally”

```markdown
answer: "Execution appears stalled with no progress updates."
status: "stalled"
```

---

## 🧨 Scenario 6: Conflicting State

Example:

* workflow says “complete”
* step still “running”

**Expected UX:**

* surface contradiction
* degrade trust

---

# 🧪 UX Gate Assertions (Add to Harness)

## Required checks

```js
REQUIRED_PRIMITIVES = [
  "::focus",
  "::metric_row",
  "::panel",
  "::next_actions",
  "::evidence_drawer"
];
```

---

## Execution-specific violations

### BLOCK

```text
missing_focus_block
missing_execution_status
missing_progress_indicator
missing_next_actions
missing_evidence_surface
missing_canonical_questions
```

---

### WARNING

```text
no_duration_context
no_step_context
no_intervention_options
overly_log_heavy
```

---

# 🧠 What Makes This Different From Diagnostic

| Execution Mode     | Diagnostic Mode      |
| ------------------ | -------------------- |
| What is running?   | What is broken?      |
| Passive monitoring | Active investigation |
| Light intervention | Deep root cause      |
| Status clarity     | Failure clarity      |

👉 Execution = **situational awareness**
👉 Diagnostic = **problem solving**

---

# 🔗 Cross-Surface Navigation (IMPORTANT)

Execution MUST link to:

* workflow run
* step details
* diagnostic failure surface
* evidence packet

```markdown
::nav
- Open workflow run
- View step details
- Diagnose failure
::
```

---

# 💥 The Big Insight

With this, you now have:

| Mode        | Status           |
| ----------- | ---------------- |
| Review      | ✅                |
| Diagnostic  | 🔜               |
| Execution   | ✅ (this fixture) |
| Orientation | ⚠️               |
| Evidence    | ⏳                |

You’ve now covered:

> **Decision → Failure → Runtime**

That’s the core operational triangle.

---

# 🚀 What To Do Next

## Immediate

1. Add this fixture to:

```text
scripts/run-loga-experiments.mjs
```

2. Add scenario variations (healthy, blocked, failed, stalled)

3. Run UX gate validation

---

## Then

👉 Build **Diagnostic Failure fixture** (if not already)
👉 Re-run full suite

---

# 🧭 Final Thought

This fixture is *extremely* important because:

> Most systems fail not in decisions—but in understanding what’s happening live

You just defined how to fix that.

---

If you want next:

I can define the **Evidence / Trust surface** (last critical thinking mode)
or help you unify all modes into a **thinking-mode coverage gate** 👀
