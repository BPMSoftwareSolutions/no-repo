Submit it upstream.

The next best fixture is **Approval Review**, but don’t wait on that before submitting. The Operator Home blocker is clean, narrow, and exactly the kind of upstream feedback that should move now.

## Recommended submission framing

```text
Submit updated LOGA experiment payload upstream.

Summary:
The experiment harness now enforces UX contract compliance as a blocking gate. Operator Home currently fails strict UX governance because it omits required primitives and canonical question coverage.

Required remediation:
Update only the operator.home LOGA markdown projection shape to include:
- ::focus
- ::evidence_drawer
- ::next_actions
- all five canonical question labels

Do not change endpoint behavior, source truth, SQL projection logic, or API transport. This is a markdown projection-shape fix only.
```

## Next fixture after submit

Draft **Approval Review** next.

Why: it is the highest-value missing thinking mode because it tests the core client moment:

> “Can I approve this safely?”

Minimum fixture should include:

* ready-to-approve item
* missing-evidence item
* revise-needed item
* reject/block item
* evidence drawer
* explicit decision actions: approve / revise / reject

That becomes the canonical **review-mode UX gate**.

---

Here’s the **formal UX Gate Spec**.

# Formal UX Gate Spec

## LOGA / AI Engine Projection Governance

## 1. Purpose

The UX Gate ensures every AI Engine operator projection is not merely valid markdown, but a **human-decision-ready surface**.

A projection must answer:

1. **What is happening?**
2. **What should I care about right now?**
3. **What do I need to decide?**
4. **Why should I trust this?**
5. **What should I do next?**

This aligns with the canonical question set and the LOGA model of SQL truth → typed projection → structured markdown → navigable workflow surface.  

---

# 2. Gate Position

```text
SQL truth
→ read model
→ projection markdown
→ UX Gate
→ LOGA render
→ client decision
```

A governed workflow is not UX-complete until its projection passes this gate.

---

# 3. Required Projection Contract

Every governed projection must include frontmatter:

```yaml
loga_contract: "ai-engine-ui/v1"
interaction_contract: "loga-choreography/v1"
navigation_contract: "loga-navigation/v1"
projection_type: "operator.home"
source_system: "ai-engine"
source_truth: "sql"
source_version: "workflow_run:<id-or-version>"
generated_at: "<iso timestamp>"
correlation_id: "<id>"
refresh_policy: "manual"
```

Required markdown primitives:

```text
::focus
::evidence_drawer
::next_actions
```

Recommended primitives:

```text
::breadcrumb
::nav
::panel
::metric_row
::table
::related_documents
```

---

# 4. Required Canonical Question Coverage

Every projection must contain either explicit headings or structured block labels for:

```markdown
## What is happening?

## What should I care about right now?

## What do I need to decide?

## Why should I trust this?

## What should I do next?
```

Failure to include these is a **blocking UX contract violation**.

---

# 5. Thinking Modes

Each projection must declare one primary thinking mode.

| Thinking Mode | Projection Type Examples         | Primary Question            |
| ------------- | -------------------------------- | --------------------------- |
| `orientation` | operator.home, project.catalog   | What needs attention now?   |
| `review`      | approval.review, gate.review     | Can I approve this safely?  |
| `execution`   | workflow.live, wrapper.execution | What is running?            |
| `diagnostic`  | failure.diagnostic               | What is broken?             |
| `evidence`    | evidence.packet, version.compare | Why should I trust this?    |
| `roadmap`     | project.roadmap, roadmap.item    | What is the delivery state? |

Missing thinking-mode-specific projections should be treated as **missing products**, not cosmetic gaps.

---

# 6. SQL Model

## `governance.ux_projection_contracts`

```sql
CREATE TABLE governance.ux_projection_contracts (
    ux_projection_contract_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projection_type VARCHAR(255) NOT NULL,
    contract_version VARCHAR(64) NOT NULL,
    thinking_mode VARCHAR(64) NOT NULL,
    required_primitives JSONB NOT NULL,
    required_question_labels JSONB NOT NULL,
    required_frontmatter_keys JSONB NOT NULL,
    severity_on_failure VARCHAR(32) NOT NULL DEFAULT 'block',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (projection_type, contract_version)
);
```

## `governance.ux_gate_runs`

```sql
CREATE TABLE governance.ux_gate_runs (
    ux_gate_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projection_type VARCHAR(255) NOT NULL,
    projection_id VARCHAR(512) NULL,
    source_truth VARCHAR(64) NOT NULL,
    source_version VARCHAR(512) NULL,
    contract_version VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL, -- passed, failed, warning
    blocking_violation_count INT NOT NULL DEFAULT 0,
    warning_violation_count INT NOT NULL DEFAULT 0,
    tested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tested_by VARCHAR(255) NULL,
    payload_hash VARCHAR(128) NULL,
    evidence_json JSONB NULL
);
```

## `governance.ux_gate_findings`

```sql
CREATE TABLE governance.ux_gate_findings (
    ux_gate_finding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ux_gate_run_id UUID NOT NULL REFERENCES governance.ux_gate_runs(ux_gate_run_id),
    finding_type VARCHAR(128) NOT NULL,
    violation_type VARCHAR(128) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    surface VARCHAR(255) NOT NULL,
    thinking_mode VARCHAR(64) NULL,
    expected JSONB NULL,
    observed JSONB NULL,
    remediation_instruction TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

# 7. API Surfaces

## Run UX Gate

```http
POST /api/governance/ux-gates/run
```

Request:

```json
{
  "projection_type": "operator.home",
  "projection_id": "operator-home:current",
  "contract_version": "loga-experiment-set-2/v1",
  "markdown": "...",
  "source_truth": "sql",
  "source_version": "workflow_run:abc",
  "tested_by": "loga:experiment"
}
```

Response:

```json
{
  "status": "failed",
  "blocking_violation_count": 1,
  "warning_violation_count": 0,
  "findings": [
    {
      "finding_type": "ux_contract_violation",
      "violation_type": "missing_required_primitives",
      "severity": "block",
      "surface": "operator_home_dashboard",
      "thinking_mode": "orientation",
      "expected": ["::focus", "::evidence_drawer", "::next_actions"],
      "observed": ["::panel", "::metric_row", "::nav"],
      "remediation_instruction": "Update only the operator.home LOGA markdown projection shape. Do not change endpoint behavior or SQL truth."
    }
  ]
}
```

## List UX Gate Runs

```http
GET /api/governance/ux-gates/runs?projection_type=operator.home
```

## Get UX Gate Finding

```http
GET /api/governance/ux-gates/findings/{finding_id}
```

---

# 8. Test Harness Rules

The harness must fail closed.

```js
if (findings.some(f => f.severity === "block")) {
  process.exitCode = 1;
}
```

Required assertions:

```js
const REQUIRED_PRIMITIVES = [
  "::focus",
  "::evidence_drawer",
  "::next_actions"
];

const REQUIRED_QUESTIONS = [
  "What is happening?",
  "What should I care about right now?",
  "What do I need to decide?",
  "Why should I trust this?",
  "What should I do next?"
];
```

Blocking violations:

```text
missing_required_primitives
missing_canonical_questions
missing_source_truth
missing_projection_type
missing_thinking_mode
missing_next_actions
missing_evidence_surface
```

Warnings:

```text
raw_json_too_prominent
too_many_primary_questions
ids_before_human_labels
missing_breadcrumb
missing_related_documents
```

---

# 9. Operator Home Minimum Passing Shape

```markdown
---
loga_contract: "ai-engine-ui/v1"
interaction_contract: "loga-choreography/v1"
navigation_contract: "loga-navigation/v1"
projection_type: "operator.home"
source_system: "ai-engine"
source_truth: "sql"
thinking_mode: "orientation"
---

# Operator Home

::focus
question: "What should I care about right now?"
answer: "One project is blocked and needs review."
status: "attention_required"
::

## What is happening?

::panel
The system has active governed work across projects and workflows.
::

## What should I care about right now?

::panel
One blocked item requires operator attention.
::

## What do I need to decide?

::panel
Decide whether to open the blocked project review.
::

## Why should I trust this?

::evidence_drawer
- Source truth: SQL
- Projection type: operator.home
- Generated from current read model
::

## What should I do next?

::next_actions
- Open blocked project
- Review roadmap
- Refresh projection
::
```

---

# 10. Approval Review Fixture

Use this next.

## Projection Type

```text
operator.approval_review
```

## Thinking Mode

```text
review
```

## Primary Question

```text
Can I approve this safely?
```

## Required Scenarios

| Fixture                      | Expected Result   |
| ---------------------------- | ----------------- |
| Ready with complete evidence | Pass              |
| Missing evidence             | Block             |
| Failed validation            | Block             |
| Requires revision            | Warning or revise |
| Unknown source truth         | Block             |

## Required Actions

```text
approve
revise
reject
open_evidence
```

---

# 11. Remediation Payload Template

```json
{
  "feedback_type": "ux_projection_contract_remediation",
  "target_surface": "operator.home",
  "severity": "block",
  "instruction": "Update only the operator.home LOGA projection markdown shape so the emitted text includes ::focus, ::evidence_drawer, ::next_actions, and all five canonical question labels. Do not change endpoint behavior, source truth, SQL projection logic, or API transport.",
  "contract_version": "loga-experiment-set-2/v1",
  "source_truth_required": "sql"
}
```

---

# 12. Acceptance Standard

The UX Gate passes only when:

```text
No blocking violations exist.
Required primitives are present.
All five canonical questions are covered.
The source truth is declared as SQL.
The thinking mode is explicit.
Next actions are visible.
Evidence is available but not first-screen noise.
```

That gives you the governed UX enforcement layer.

---

# 🧠 What This Spec Actually Is

This UX Gate spec is **not just instructions**.

It is three things at once:

## 1. 🔧 Upstream Agent Contract (YES)

It tells the upstream agent:

> “If you emit projections, they must look like *this* or you fail.”

So for the upstream agent, this is:

* a **hard requirement**
* a **shape contract**
* a **non-negotiable gate**

👉 This is the part Gemini’s payload is already feeding.

---

## 2. 🧪 Client-Side Enforcement (CRITICAL)

This is where it becomes powerful.

Your experiment harness is now:

> **the enforcement engine**

Meaning:

* It runs the gate
* It detects violations
* It blocks execution (`exit 1`)
* It produces structured findings

👉 The upstream agent does NOT enforce this
👉 **YOU enforce this**

---

## 3. 🏛️ Governance Layer (THE REAL TARGET)

This is the most important piece.

This spec is actually defining:

> **a new governance lane**

Just like:

* execution gates
* evidence gates
* promotion gates

Now you have:

```text
UX gates
```

Which means:

> A workflow is not complete unless its UX is valid

This aligns directly with your system direction:

> UX is not decoration — it is governed output 

---

# 🎯 So Who Is This “For”?

## ✅ Upstream Agent

Uses it to:

* fix projection shapes
* emit correct markdown
* satisfy contract

---

## ✅ Your Experiment Harness (YOU)

Uses it to:

* enforce correctness
* block bad UX
* generate findings
* produce remediation payloads

---

## ✅ Future AI Engine Core (IMPORTANT)

Eventually this belongs **inside AI Engine itself**:

```text
projection generation
→ UX gate (server-side)
→ only valid projections emitted
```

Right now:

* you’re enforcing externally

Later:

* engine enforces internally

---

# ⚠️ Common Misinterpretation (Avoid This)

If you treat this as:

> “Instructions for the upstream agent”

You’ll miss the real move.

Because then:

* agent might comply
* but nothing guarantees it

---

Instead, treat it as:

> **a fail-closed contract enforced by the client**

That’s what you just built.

---

# 🔥 The Big Architectural Shift You Just Made

Before:

```text
Engine emits projection
→ Client renders it
→ Humans deal with whatever comes out
```

Now:

```text
Engine emits projection
→ Client runs UX gate
→ Bad UX is rejected
→ Feedback sent upstream
```

That is a **governed UX feedback loop**

---

# 🚀 Where This Goes Next (Important)

Right now:

```text
client → UX gate → upstream feedback
```

Next step:

```text
AI Engine → UX gate → block projection emission
```

And then:

```text
workflow completion → blocked by UX gate
```

That’s when UX becomes **first-class governance**, not post-processing.

---

# 🧩 Clean Mental Model

Think of it like this:

| Layer              | Responsibility      |
| ------------------ | ------------------- |
| Upstream agent     | Generate projection |
| Your harness       | Validate projection |
| UX Gate spec       | Define correctness  |
| AI Engine (future) | Enforce correctness |

---

# 💥 Final Answer

Yes — **it is for the upstream agent**,
but more importantly:

> **it is the rulebook that your system now enforces against the upstream agent**

That distinction is everything.
