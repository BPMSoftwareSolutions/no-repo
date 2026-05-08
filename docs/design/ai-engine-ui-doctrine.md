# AI Engine UI Doctrine

## Doctrine statement

AI Engine UI must remain a thin, markdown-native operator surface.
The operator experience should feel like a clean, navigable work document
with live state, governed evidence, and actionable next steps.

One-sentence doctrine:

**AI Engine exposes governed operational truth as compact,
copy-pasteable, markdown-native projection documents, with progressive
disclosure for logs/evidence and registry-driven rendering for visual
behavior.**

---

## Non-negotiable product rule

**Summary first. Diagnosis second. Payload third.**

All operator surfaces must answer, in order:

1. What is happening?
2. What should I care about right now?
3. What changed most recently?
4. What is blocked?
5. What evidence supports this?
6. What can I do next?

Raw payloads belong in drawers and drill-down, not the first visible
surface.

---

## Separation of concerns

### AI Engine owns

- SQL truth
- projection meaning
- navigation graph
- provenance
- action contracts

### LOGA / client renderer owns

- markdown rendering
- interaction affordances
- visual theme
- drawers, rails, breadcrumbs
- copy-paste experience

AI Engine must not build a parallel bespoke operator UI.

---

## Standard display model

Every operator page should follow this document-first shape:

```text
focus answer -> current state summary -> recent events -> evidence drawer -> next actions
```

Reference contract pattern:

```markdown
# [Surface Name]

::focus
question: "What should I care about right now?"
answer: "One concise operator answer"
status: "attention"
::

## Current State

::summary
- Latest event: ...
- Active item: ...
- Blocker: ...
- Next gate: ...
::

## Recent Events

::event_log limit="5"
- 10:42 Event A
- 10:41 Event B
- 10:39 Event C
::

::evidence_drawer
title: "Raw execution payload"
source_truth: "sql"
::
```

---

## Runtime architecture rule

The rendering path is contract-driven:

```text
Markdown projection
-> UI contract
-> registry lookup
-> generic renderer
-> styled operator surface
```

Runtime must not introduce:

- hidden UI knowledge
- implicit transformations
- fallback rendering that masks contract failures
- hardcoded domain-specific components

---

## Quality gates

A surface is not promotable unless all are true:

1. Primary question is present and operator-readable.
2. Summary-first order is preserved.
3. Evidence is progressive disclosure (drawer/drill-down), not top-level clutter.
4. Markdown + UI contract validate against runtime with loud failures.
5. Source truth and provenance are explicit in contract metadata.

---

## Outcome we optimize for

Clean document, live state, governed evidence, expandable depth.