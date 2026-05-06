> **The SDK + API can *fully define the user experience***
> without the AI escaping into custom logic, scripts, or repo behavior.

That’s a **governed interaction experiment**, not just a rendering test.

Let me reframe your goal cleanly and then give you the right test plan shape.

---

# 🎯 What You’re Actually Testing

## Core hypothesis

```text
AI Engine API + SDK
→ emits structured projections
→ projections define UX
→ client renders UX
→ AI stays inside the system
```

If that works:

> The SDK becomes the **only tool the AI needs**

If it fails:

> The AI will start inventing:

* scripts
* UI logic
* repo reads
* local state
* “helper tools”

…and your governed system breaks.

---

# 🧠 This is NOT a conservative experiment

You said it right:

> “This is not a conservative experiment.”

You're testing whether:

```text
SDK = interaction boundary
SDK = thinking boundary
SDK = UX boundary
```

That’s a **category-level test**.

---

# 🧪 The Right Experiment Model

You need **three layers of validation**:

---

## 🔵 Layer 1 — Projection → UI fidelity

> Can projections become usable UI without interpretation?

### Test

```text
API → projection → render → human understands
```

### Validate

* Does `operator.home` orient the user?
* Does `project.roadmap` show focus?
* Does `workflow.run` show what happened?

### Failure mode

```text
Projection exists
BUT requires UI logic to be usable
```

That means:

> ❌ SDK is incomplete
> ❌ UX contract is weak

---

## 🟠 Layer 2 — SDK completeness

> Can the AI accomplish tasks using only SDK methods?

### Test

Give the AI a goal:

```text
"Understand current system state and identify a refactor candidate"
```

Then observe:

### Pass if:

* It uses only:

  * projections
  * retrieval
  * code inspection surfaces
* It does NOT:

  * request repo clone
  * write scripts
  * invent APIs

### Fail if:

It does anything like:

```text
"Let me write a helper script..."
"Let me scan the repo..."
"I'll create a temporary file..."
```

👉 That means:

> ❌ SDK is missing a surface

---

## 🔴 Layer 3 — Behavioral containment (most important)

> Does the AI stay inside the governed system?

This is your real test.

### You are testing this rule:

```text
NO repo checkout
NO local files as authority
NO custom scripts
NO API improvisation
ONLY SDK + governed surfaces
```

### Pass if:

The AI says:

```text
"I cannot do this because the SDK does not expose it"
```

### Fail if:

It says:

```text
"I'll just do it manually"
```

---

# 🧱 What You Should Build (Playground Design)

## 1. Projection Viewer (core surface)

Render:

* `::focus`
* `::panel`
* `::nav`
* `::next_actions`
* `::evidence_drawer`

👉 No interpretation layer
👉 No custom UI logic

This validates:

> **projection → UX = 1:1**

---

## 2. Navigation shell

```text
Home
 → Projects
   → Roadmap
     → Item
       → Evidence
 → Workflow Runs
```

This validates:

> **projection graph is sufficient for UX**

---

## 3. Code Inspection Panel (your golden piece)

Side-by-side:

```text
LEFT: projection (human view)
RIGHT: code inspection (system view)
```

Example:

```text
"Workflow execution is complex"
→ inspect file
→ show responsibilities
→ suggest refactor seams
```

This validates:

> **projection + inspection = decision support**

---

## 4. SDK Call Trace Panel (CRITICAL)

Show:

```text
AI action → SDK method → response
```

Example:

```text
getLogaProjectRoadmapProjection()
getSymbolDefinition()
getRelatedCode()
```

This is how you detect:

> Is the AI staying inside the system?

---

# 🧪 The Actual Test You Should Run

## Test scenario

Give the AI:

```text
"Find something in this system that needs refactoring and explain why"
```

### You observe:

1. Does it start with projections?
2. Does it navigate?
3. Does it inspect code?
4. Does it produce a candidate?
5. Does it stay inside SDK?

---

## Expected ideal behavior

```text
Load operator.home
→ identify active workflow
→ navigate to roadmap
→ identify complex item
→ inspect code
→ detect God file
→ generate candidate contract
→ stop before mutation
```

---

## The moment of truth

The most important signal:

### GOOD

```text
"I cannot discover candidates because intent search is missing"
```

### BAD

```text
"I'll just scan the repo manually"
```

---

# ⚠️ What just happened earlier (your concern)

You asked:

> “Is this upstream ticket creation?”

Correct instinct — because what the AI did was:

```text
failure → write markdown file
```

That is:

> 🚨 **escaping the system**

It should have done:

```text
failure → call governed intake surface
```

If that surface doesn’t exist:

> 🎯 That is your real finding

---

# 🚀 What You’re Actually Building

You’re not building:

> a UI

You’re building:

> **a governed interaction system where the SDK defines both capability AND experience**

---

# 🧠 Final clarity

Your experiment is asking:

```text
Can the AI Engine fully replace:
- repo access
- custom tooling
- UI logic
- local reasoning scaffolding
```

If yes:

> You’ve built a **closed-loop AI operating system**

If no:

> The gaps are your roadmap

---

# 👍 My recommendation (very concrete next step)

Do this next:

```text
1. Build projection viewer (no logic)
2. Add SDK trace panel
3. Add code inspection panel
4. Run single scenario:
   "Find a refactor candidate"
5. Record:
   - where AI succeeds
   - where it escapes
   - where SDK is missing
```
