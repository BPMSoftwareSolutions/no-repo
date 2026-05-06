Absolutely. The instruction needs to be **explicit enough that the builder AI cannot confuse “styled prototype” with “usable product.”**

## Toolbar + Tree UX implementation instructions

### Core principle

Build a **human-friendly projection workspace**, not a technical dashboard.

The user should never need to know exact projection names, IDs, route names, workflow keys, or SDK method names to find what they need.

```text
User intent → suggestions → filtered tree → selected projection
```

---

## Search behavior

The search bar must be **typeahead-driven**.

When the user types:

```text
wrap
```

The UI should suggest:

```text
Generic Wrapper Runtime
Wrapper Evidence
Refactor Wrapper Execution
Bespoke Wrapper Script Finding
SDK Wrapper Promotion
```

Search must support partial matches across:

```text
project names
roadmap item titles
task titles
projection labels
workflow names
promotion names
evidence labels
anti-pattern names
memory reminders
DB turn objectives
CI/CD workflow names
```

Search should not require exact names like:

```text
operator.project_roadmap
workflow-run-refactor-runtime-123
```

Those can exist in evidence drawers, not primary UI.

---

## Search suggestions

Suggestions should appear immediately below the search input.

Each suggestion should show:

```text
Label
Type
Context
Status
```

Example:

```text
Generic Wrapper Runtime
Roadmap Item · AI Engine · In progress

Wrapper Evidence
Evidence Packet · AI Engine · Awaiting wrapper run

executeGovernedRefactorWrapper
SDK Promotion · Needed
```

Clicking a suggestion should:

```text
1. expand the tree path
2. select the matching node
3. load the projection into the main pane
4. highlight the matched text
```

---

## Toolbar controls must be functional

Do not create decorative controls.

Every toolbar control must change either:

```text
tree contents
projection contents
visible suggestions
selected scope
expanded branch
refresh behavior
```

If a control is not wired yet, show it as disabled with a clear reason.

Example:

```text
Live Mode disabled — no workflow subscription available
```

---

## Required toolbar controls

### 1. Search

```text
Search projections, tasks, evidence...
```

Must provide:

```text
typeahead suggestions
partial matching
keyboard navigation
Enter to open
Esc to close suggestions
```

---

### 2. Scope selector

```text
Scope: AI Engine
```

Changing scope must reload the tree root for:

```text
All Projects
Current Project
Specific Project
System Surfaces
```

---

### 3. Thinking mode selector

```text
Mode: Focus
```

Modes:

```text
Focus       → current focus, active roadmap item
Execution   → tasks, workflow runs, active work
Diagnostic  → blockers, failures, warnings
Evidence    → evidence packets, gates, trust material
Evolution   → promotions, SDK changes, CI/CD, releases
```

Changing mode must filter and reorder the tree.

---

### 4. Surface chips

```text
Roadmap
Promotions
Workflows
CI/CD
Memory
Evidence
```

These are toggles. They must show selected/unselected states clearly.

They filter visible tree branches and search results.

---

### 5. Attention filters

```text
Needs Attention
Blocked Only
High Priority
```

These must be mutually clear:

```text
Needs Attention = active + blocked + awaiting review
Blocked Only = only blocked/failing items
High Priority = priority high/critical
```

---

### 6. Tree controls

```text
Expand Focus
Collapse All
Refresh Branch
```

Behavior:

```text
Expand Focus
→ expands only the path to the current active item

Collapse All
→ collapses all non-root branches

Refresh Branch
→ reloads only the selected branch, not the entire tree
```

---

## Lazy loading requirements

The tree must not load the full graph.

Initial load:

```text
root groups only
```

Expand behavior:

```text
on expand:
  if children not loaded:
    show inline loading state
    fetch children for that node only
    cache result by node id
  else:
    just expand/collapse
```

Do not use full-page loading spinners for branch expansion.

Use:

```text
Roadmap
  loading children...
```

---

## Button and layout quality

Buttons must never overflow text.

Rules:

```text
use max-width
use text-overflow: ellipsis
use nowrap only where safe
allow toolbar rows to wrap cleanly
preserve minimum tap target size
do not let pills crush search
```

Responsive behavior:

```text
desktop:
  toolbar in two rows
  tree left
  projection right

tablet:
  toolbar wraps
  tree remains visible above or left

mobile:
  toolbar stacks
  tree becomes collapsible drawer
  projection remains readable
```

---

## Visual hierarchy

The toolbar should feel like a **control plane**, not a form.

Priority order:

```text
Search first
Scope second
Mode third
Filters fourth
Tree actions last
```

Search should be the widest control.

Runtime context should be compact:

```text
Agent active · Turn 3
```

Clicking runtime context should open:

```text
Agent Memory + DB Turns
```

---

## Tree behavior

The tree should be semantic, not technical.

Good labels:

```text
AI Engine
Roadmap
Current Focus
Generic Wrapper Runtime
Tasks
Evidence
Workflow Runs
Promotions
CI/CD Status
Agent Memory + DB Turns
```

Bad labels:

```text
operator.project_detail
workflow_run_projection
implementation_packet_key
```

Technical names belong in evidence drawers.

---

## Projection pane behavior

When the selected tree node changes:

```text
load projection content
update breadcrumb
update primary question
update open lanes
update selected node state
```

The projection pane should answer one question clearly.

Example:

```text
What is happening in this project?
```

Not:

```text
Here are all project records.
```

---

## Acceptance criteria

The implementation passes only if:

```text
typing "wrap" shows useful suggestions
clicking a suggestion expands the tree path
scope changes reload tree roots
mode changes reorder/filter tree contents
surface chips actually filter visible nodes
Expand Focus opens the active roadmap path
Refresh Branch reloads only one branch
buttons do not overflow
technical IDs are not primary labels
duplicates are grouped into human surfaces
```

Failure examples:

```text
raw projection table appears
duplicate operator.project_detail rows appear
search only matches exact labels
controls are decorative
entire tree loads at once
full-page spinner appears for branch expansion
button text overflows
IDs appear before human names
```

## Builder AI instruction

Give the implementing AI this rule:

> Do not optimize for showing data. Optimize for helping the operator find, understand, trust, and act on the next meaningful projection surface. Every control must change what the user can see, find, or do. Decorative controls are not acceptable.
