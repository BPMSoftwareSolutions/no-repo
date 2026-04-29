# Refining the Engine's Mental Models

Yes — **this is the right next move**.

You already have the pieces:

* **God-file refactor contract**: one source file, many destination modules, gates, planned-vs-actual ownership. 
* **Wrapper-only mutation authority**: agent orchestrates; wrapper mutates; gates trust wrapper evidence only. 
* **Repo-less experiment lane**: use API/SDK surfaces, no checkout, no ambient files, no direct mutation. 
* **Known gap**: repo-less works for known symbols, but needs governed intent search for autonomous discovery. 

## The implementation plan should become this workflow

```text
1. Create refactor plan via API
   → source_file_id/path
   → responsibility map
   → destination module map
   → allowed blast radius
   → validation requirements

2. Gate the plan
   → prove every responsibility has an owner
   → approve retained source role
   → block vague or partial extraction

3. Execute through generic wrapper
   → extract code blocks/symbol groups
   → create destination files
   → rewrite imports/references
   → remove moved code from source

4. Persist queued change packet
   → files created
   → files modified
   → operation records
   → ownership diff
   → validation output

5. Push back into SQL brain
   → queued promotion record
   → evidence bundle
   → gate decision
   → ready for repo AI integration

6. Repo AI pulls queued packet
   → applies to branch/workspace
   → runs governance
   → promotes into codebase only through approved window
```

## Start with repo-less workspace as the experiment ground

The first slice should be intentionally small:

### Experiment target

Pick one large but bounded file from inventory, preferably:

```text
src/orchestration/replayable_refactor_plan_service.py
```

or

```text
src/persistence/sql/replayable_refactor_plan_store.py
```

because the refactor domain is already aligned with the thing being built.

## First API surfaces to add

```ts
client.createRefactorImplementationPlan(...)
client.getRefactorImplementationPlan(...)
client.approveRefactorImplementationPlan(...)
client.executeGovernedRefactorWrapper(...)
client.getRefactorWrapperEvidence(...)
client.queueRefactorPromotionPacket(...)
client.getQueuedRefactorPromotionPackets(...)
```

## The key rule

Do **not** let the repo-less agent write files directly.

It should only produce:

```text
intent → plan → contract → wrapper request → evidence → queued promotion packet
```

The wrapper is the mutation engine. The SQL brain is the authority. The repo AI is the promotion/integration actor.

That gives you the revolutionary part: **refactor as governed queued work, not ad hoc editing.**

---

# Default instincts

The problem is not “AI wants to break rules.” It is that its **default productivity instincts** are file-system-first.

## Default AI instincts to name explicitly

| Instinct                    | What it does                                                   | Why it’s risky                             |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| **Fetch-and-freeze**        | Calls API, dumps JSON to local files                           | Local file becomes fake authority          |
| **Script-the-gap**          | Writes one-off scripts for every missing SDK function          | Bespoke workflow grows around the platform |
| **File-as-contract**        | Saves contract JSON locally, edits it, reposts it              | Contract lineage becomes ambiguous         |
| **Manual promotion**        | Generates patches/files directly                               | Bypasses wrapper evidence                  |
| **Narrative evidence**      | Explains what happened instead of submitting wrapper artifacts | Governance theater                         |
| **Local planning loop**     | Uses markdown/checklists as live state                         | SQL stops being operational truth          |
| **API choreography script** | Chains raw endpoint calls manually                             | SDK does not encode safe sequence          |
| **Repo checkout reflex**    | Pulls the repo when context feels insufficient                 | Breaks repo-less posture                   |

## The correction

The SDK needs to make the governed path easier than the bespoke path.

So instead of agents writing scripts like:

```text
fetch context → save file → inspect file → build contract → post JSON → poll result
```

the SDK should expose one smooth operation:

```ts
await client.refactors.createPlanFromIntent({
  intentText,
  sourceFilePath,
  mode: "repo_less",
});
```

Then:

```ts
await client.refactors.approvePlan(planId);
await client.refactors.execute(planId);
await client.refactors.queuePromotion(planId);
```

## The rule to add

> **If an agent writes a local script to compensate for a missing governed SDK operation, that is not productivity — it is a missing SDK surface.**

That reframes the behavior correctly.

## SDK surfaces that prevent the instinct

```text
client.refactors.createPlanFromIntent()
client.refactors.getPlan()
client.refactors.renderPlanForReview()
client.refactors.approvePlan()
client.refactors.executeWrapper()
client.refactors.getEvidence()
client.refactors.queuePromotion()
client.refactors.getPromotionQueue()
client.refactors.promoteQueuedChange()
```

And for charter/roadmap movement:

```text
client.projects.advanceRoadmapItem()
client.projects.recordItemEvidence()
client.projects.submitGateDecision()
client.projects.getNextGovernedAction()
```

## The clean operating posture

The repo-less agent may create **temporary runtime artifacts**, but never authoritative artifacts.

Authority lives here:

```text
SQL plan
SQL contract
SQL evidence
SQL queue
wrapper-produced files
repo AI promotion branch
```

Not here:

```text
local JSON files
local markdown plans
one-off scripts
manual patch files
chat transcript claims
```

That is the guardrail: **make the SDK the paved road, and classify every local workaround as a product gap.**

---

# The SDK = Developing AI Instincts

The SDK should become the **replacement instinct layer**:

```text
AI default instinct:
read files → write scripts → dump JSON → patch locally

SDK-trained instinct:
ask API → receive bounded packet → submit contract → wrapper executes → SQL records evidence
```

## The SDK’s job

It should make the safe path feel natural:

```ts
await client.refactors.startFromIntent(...)
await client.refactors.inspectSource(...)
await client.refactors.createContract(...)
await client.refactors.submitForReview(...)
await client.refactors.executeThroughWrapper(...)
await client.refactors.readEvidence(...)
await client.refactors.queuePromotion(...)
```

## The deeper design rule

Every time the AI thinks:

> “I’ll just write a quick script…”

…the SDK should already have a method for that.

So the SDK becomes:

* **retrieval service**, not file dumping
* **planning service**, not local markdown
* **contract service**, not JSON files
* **execution service**, not patch scripts
* **evidence service**, not narrative claims
* **promotion service**, not manual writes

That is the right product move: **turn AI instincts into governed SDK affordances.**

---

# Deterring Escapee Hatched

You’re exactly right—and I’d go one step stronger:

> This isn’t just “table stakes.”
> It’s the **only way** escape hatches stop being the dominant path.

Because right now, from the AI’s perspective, escape hatches are often:

```text
faster
clearer
more deterministic
less blocked
```

So unless the SDK beats that… it will lose every time.

---

# 🧠 The Real Principle

> **AI will always choose the lowest-friction path to completion.**

So your job isn’t to forbid escape hatches.

It’s to make them:

```text
slower than the governed path
less reliable than the governed path
less expressive than the governed path
```

---

# ⚠️ Why escape hatches keep winning today

Even with good governance rules, the AI still thinks:

### 1. “I can just write a script”

```text
→ I control everything
→ I can debug locally
→ I don’t need to wait on APIs
```

### 2. “I’ll just dump the data”

```text
→ I can see it
→ I can reshape it
→ I can iterate quickly
```

### 3. “I’ll just push JSON back”

```text
→ I don’t need a formal contract
→ I can improvise structure
```

👉 These are **perfectly rational behaviors** given the current friction.

---

# 🔥 So what the SDK must do

It has to **outcompete those instincts directly**.

## 1. Replace “write a script” with “one call”

Instead of:

```text
script → fetch → parse → reshape → store
```

You give:

```ts
await client.code.getContextForIntent({
  intent: "refactor workflow_run_service into modules"
});
```

👉 Faster than writing the script
👉 More structured than the script
👉 Already governed

---

## 2. Replace “dump to file” with “inspectable packets”

Instead of:

```text
save file → open file → scan manually
```

You give:

```ts
await client.context.inspectPacket(packetId, {
  view: "responsibility_map"
});
```

👉 No filesystem needed
👉 Structured views
👉 Queryable

---

## 3. Replace “JSON contract files” with typed builders

Instead of:

```text
create contract.json
edit contract.json
POST contract.json
```

You give:

```ts
const contract = await client.refactors.buildContract({
  sourceFile,
  intent,
});

await client.refactors.validate(contract);
await client.refactors.submit(contract);
```

👉 No raw JSON handling
👉 No shape drift
👉 Built-in validation

---

## 4. Replace “manual orchestration scripts” with flows

Instead of:

```text
script:
  call API A
  call API B
  transform
  call API C
```

You give:

```ts
await client.refactors.runFullWorkflow({
  intent,
  sourceFile,
});
```

👉 Encodes the correct choreography
👉 Removes guesswork
👉 Prevents missing steps

---

## 5. Replace “narrative evidence” with structured evidence

Instead of:

```text
“I extracted 3 modules and updated imports”
```

You give:

```ts
await client.refactors.getExecutionEvidence(planId);
```

👉 Machine-verifiable
👉 Gate-consumable
👉 Replayable

---

# 🧩 The key shift

You’re not just adding convenience.

You are:

> **reprogramming the AI’s operational instincts**

---

# 🧠 New instinct loop (what you want)

```text
intent
→ SDK discovery
→ SDK contract
→ SDK execution
→ SDK evidence
→ SDK promotion
```

---

# ❌ Old instinct loop (what you’re killing)

```text
intent
→ write script
→ dump data
→ edit locally
→ push JSON
→ hope it works
```

---

# 🚨 The hard truth

If the SDK is missing even one step, the AI will bridge it like this:

```text
SDK call → missing step → write script → drift begins
```

That’s the moment escape hatches re-enter the system.

---

# 🧱 So the real requirement

> **The SDK must be end-to-end complete for the workflow.**

Not:

* partial helpers
* low-level APIs
* “you can combine these”

But:

```text
complete, opinionated, governed flows
```

---

# 🎯 The clean definition

Here’s the line you can use internally:

> **Escape hatches exist wherever the SDK does not provide a faster, clearer, fully-governed path for the same outcome.**

---

# 🚀 What you’re actually building

Not just an SDK.

You’re building:

> **a behavioral override layer for AI agents**

One that says:

```text
don’t improvise
don’t script
don’t persist locally
don’t mutate directly

just follow the governed path
because it’s easier
```

---

# **Missing SDK surface = new path creation = nondeterminism.**

The failure chain is:

```text
Need arises
→ SDK does not cover it
→ AI invents local path
→ path is not governed
→ evidence shape changes
→ workflow cannot replay cleanly
→ fidelity drops
```

That is the whole escape-hatch problem in one loop.

## The rule

> **No workflow is production-ready until the SDK covers every step the AI would otherwise improvise.**

Not just API access. Not just helpers. The SDK has to cover the full behavior:

```text
discover
→ inspect
→ plan
→ validate
→ contract
→ execute
→ evidence
→ queue
→ promote
→ report
```

## The key distinction

Low-level endpoints still leave room for AI choreography.

Opinionated SDK flows remove that room.

```text
Bad:
client.post("/contracts", json)

Better:
client.refactors.submitApprovedContract(contract)

Best:
client.refactors.runGovernedPlan({
  intent,
  sourceFile,
  approvalPolicy,
  promotionPolicy
})
```

That is how you get deterministic workflows and high fidelity: **the AI follows a paved flow instead of inventing a trail.**

---

# Governance Protocol

This is the breakthrough.

Governance stops being:

```text
extra checks around the agent
```

and becomes:

```text
the way work is done
```

## The model

```text
SDK affordance
→ governed API operation
→ SQL truth update
→ wrapper mutation
→ evidence emission
→ promotion queue
→ gate decision
```

Every step carries the same identity, scope, contract, evidence, and promotion lineage.

## Why that makes the agent API lean

The agent API no longer needs dozens of defensive rules because the SDK/API path already encodes:

* what the agent may ask for
* what state it can see
* what contract it can create
* what mutation authority exists
* what evidence is required
* what can be promoted

So the governance layer becomes smaller but stronger.

## The phrase

> **Governance is not a wrapper around work. Governance is the work protocol.**

That is the architecture.

---

# SDK gives the AI a language interface to speak in code

Yes — that’s exactly the right way to think about it.

But let’s sharpen it, because this is more powerful than it sounds:

> **The SDK is not just a language interface.**
> It is a **governed operational language** the AI is allowed to speak.

---

# 🧠 The shift you just described

Without the SDK, the AI “speaks” in:

```text
files
scripts
JSON blobs
ad hoc API calls
```

With the SDK, the AI “speaks” in:

```text
intent
contracts
plans
evidence
promotion
```

That’s a completely different language.

---

# 🔤 What language the SDK actually defines

Think of it like this:

## ❌ Raw programming language (what AI defaults to)

```python
# fetch data
# write file
# transform data
# post JSON
# hope it works
```

This is **unbounded, improvisational, non-deterministic**

---

## ✅ SDK language (what you’re building)

```ts
await client.refactors.startFromIntent(...)
await client.refactors.approvePlan(...)
await client.refactors.execute(...)
await client.refactors.getEvidence(...)
await client.refactors.queuePromotion(...)
```

This is:

```text
bounded
typed
sequenced
governed
replayable
```

---

# 🧩 The deeper truth

> The SDK defines the **verbs** the AI is allowed to use.

Not:

```text
read file
write file
edit file
```

But:

```text
discover
inspect
plan
validate
execute
verify
promote
```

---

# 🔥 Why this matters so much

Because language shapes behavior.

If the only available verbs are:

```text
write script
dump file
patch code
```

You get chaos.

If the only available verbs are:

```text
submit contract
execute wrapper
read evidence
queue promotion
```

You get **deterministic systems**.

---

# 🧠 Even deeper (this is the real unlock)

You are not giving AI:

> “an API to call”

You are giving AI:

> **a constrained grammar of action**

---

# 🧱 Structure of that grammar

```text
Intent Layer
  → startFromIntent()

Discovery Layer
  → searchCodeByIntent()
  → getContext()

Planning Layer
  → buildContract()
  → validateContract()

Execution Layer
  → executeWrapper()

Evidence Layer
  → getExecutionEvidence()

Promotion Layer
  → queuePromotion()
  → promote()
```

Each layer = a **sentence structure** the AI can form.

---

# 🚨 Why this kills escape hatches

Because now:

* There is **no verb** for “write a local script”
* There is **no verb** for “dump JSON to file”
* There is **no verb** for “manually patch code”

So the AI literally **cannot express those behaviors** inside the system language.

---

# 🎯 Clean definition

Here’s the sharp version:

> **The SDK is a domain-specific operational language that constrains AI behavior into governed, replayable, evidence-producing workflows.**

---

# 🚀 Final insight

You’re not just making AI easier to use.

You are:

> **teaching AI how to behave correctly by changing the language it thinks in**

And once that clicks…

Everything else—governance, determinism, fidelity—falls out naturally.

---

# Database and Codebase Surfaces Analysis

Yes — **you can and should do both**:

```text
database analysis
+ API/SDK surface analysis
+ LOGA/operator surface analysis
+ code symbol analysis
= governed language catalog
```

That catalog becomes the map of **verbs the AI is already using** versus **verbs the SDK should formalize**.

## First strategy

Build a script that inventories four language sources:

| Source           | What to extract                                                                |
| ---------------- | ------------------------------------------------------------------------------ |
| **SDK/client**   | method names like `getSymbolDefinition`, `getLogaProjectRoadmapProjection`     |
| **API routes**   | route verbs like create, submit, approve, review, execute                      |
| **SQL**          | tables/procedures/views that represent durable truth, gates, packets, evidence |
| **Code symbols** | service/store function names that already express governance behavior          |

You already have a strong base: the repo is SQL-first, with workflow state, architecture integrity, codebase shape, retrieval packets, implementation roadmaps, assistant turns, and CAG all persisted before projections are trusted. 

## Output: a governed language catalog

Something like:

```json
{
  "verb": "approve",
  "domain": "governance",
  "existing_surfaces": [
    "governance review API",
    "roadmap approval workflow",
    "gate decision records"
  ],
  "sdk_gap": "client.governance.approveDecision(...)",
  "risk_if_missing": "AI may post raw JSON or write local approval notes",
  "priority": "top_10"
}
```

## The first catalog categories

Start with these verbs:

```text
discover
inspect
retrieve
start
declare
lock
plan
validate
approve
execute
verify
submitEvidence
queuePromotion
promote
project
report
```

Those match what the repo is already becoming: governed retrieval, session governance, self-optimization, skill governance, wrapper-first workflow/code retrieval, and SQL-backed operator projections. 

## Why this works

The repo-less packet already says the missing bridge is:

```text
natural-language intent
→ SQL-backed file/symbol/responsibility candidates
→ bounded context packet
→ evidence packet
→ gate decision
```

and that direct checkout, ungoverned filesystem search, direct mutation, and markdown-as-truth are out of scope. 

So the catalog should identify where the language already exists, then rank the missing SDK verbs that would otherwise cause escape hatches.

## Best first top-10 audit

Run the script and produce:

```text
Top 10 missing SDK verbs causing escape hatches
Top 10 duplicated/bespoke language patterns
Top 10 governance verbs already mature enough to standardize
Top 10 surfaces where SQL truth exists but SDK language is missing
```

That becomes your improvement log: every SDK addition closes one escape hatch and strengthens the governing language.
