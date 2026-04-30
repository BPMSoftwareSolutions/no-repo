# Formal Approval Review Fixture

This fixture defines the **review-mode UX gate** as defined in the Formal UX Gate Spec. It is the target markdown shape that the AI Engine must emit when projecting `operator.approval_review` content.

## Acceptance Standard

The projection MUST include:
- `::focus`
- `::evidence_drawer`
- `::next_actions`
- all five canonical questions explicit headings/labels
- explicit decision actions (`approve`, `revise`, `reject`)
- clear distinction between "ready-to-approve", "missing-evidence", "revise-needed", and "reject/block" items.

---

## The Fixture Markdown

```markdown
---
loga_contract: "ai-engine-ui/v1"
interaction_contract: "loga-choreography/v1"
navigation_contract: "loga-navigation/v1"
projection_type: "operator.approval_review"
source_system: "ai-engine"
source_truth: "sql"
thinking_mode: "review"
---

# Approval Review

::focus
question: "Can I approve this safely?"
answer: "One item is ready for approval, one requires revision, and one is blocked due to missing evidence."
status: "attention_required"
::

## What is happening?

::panel
You are reviewing three pending gate decisions. These decisions control whether governed code mutations promote to the next environment.
::

## What should I care about right now?

::table id="review_queue"
| Item | Status | Risk Level | Evidence |
|---|---|---|---|
| Implement governed LOGA parser | ready-to-approve | Low | Complete |
| Change authentication boundary | revise-needed | High | Outdated |
| Execute unsandboxed script | reject/block | Critical | Missing |
::

## What do I need to decide?

::panel
You need to decide whether to explicitly approve, revise, or reject each item. Do not approve without reviewing the provided SQL-backed evidence.
::

## Why should I trust this?

::evidence_drawer
- Source truth: SQL
- Projection type: operator.approval_review
- Contract: ai-engine-ui/v1
- Generated from current governance read model
::

## What should I do next?

::next_actions
- Approve "Implement governed LOGA parser"
- Revise "Change authentication boundary"
- Reject "Execute unsandboxed script"
- Refresh projection
::
```
