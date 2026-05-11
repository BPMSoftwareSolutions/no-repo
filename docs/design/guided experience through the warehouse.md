You’re not just building the warehouse anymore. You’re building the **guided experience through the warehouse**.

That matters because the warehouse is powerful, but without a guide, a new engineer or downstream consumer may see:

```text
inventory
agents
SQL truth
wrappers
gates
telemetry
packaging
distribution
```

…and think, “This is impressive, but where do I start?”

The **Tour Guide** solves that.

# The Tour Guide concept

The Tour Guide becomes a workflow-driven onboarding agent that walks a person through the modernization warehouse from end to end:

```text
enter warehouse
→ understand intake
→ inspect inventory
→ watch retrieval
→ observe modernization
→ review governance
→ inspect telemetry
→ see productization
→ understand distribution
→ complete guided orientation
```

This maps beautifully to the Modernization Warehouse idea: dormant code, demos, prototypes, legacy systems, and model assets move through intake, classification, salvage, refactor, package, govern, distribute, and learn. 

## The Tour Guide is not just documentation

This is the important part.

It should not be a static tutorial.

It should be a **live guided workflow surface**.

The guide should know:

* who the user is
* what role they are playing
* what they need to understand
* what warehouse zone they are in
* what evidence supports the current explanation
* what action they should take next
* whether they completed orientation

That aligns with the existing substrate posture: sessions, turns, claims, evidence, workflow state, and generated projections are supposed to be persisted through durable SQL truth, not inferred from chat or markdown. 

# The role-based tours

This could become a whole onboarding suite.

| Audience                     | Tour Focus                                                              |
| ---------------------------- | ----------------------------------------------------------------------- |
| **New engineer**             | How to work safely inside the warehouse                                 |
| **Architect**                | How responsibilities, boundaries, wrappers, and gates work              |
| **DevOps/platform engineer** | How execution, telemetry, packaging, and release flow                   |
| **Enterprise buyer**         | How dormant assets become governed distributable products               |
| **Downstream consumer**      | How to consume SDKs, APIs, workflow packs, or agent skills              |
| **Agent developer**          | How agents communicate, claim work, retrieve context, and emit evidence |
| **Governance reviewer**      | How to inspect trust, evidence, and approval gates                      |

Same warehouse. Different tour route.

# The canonical tour flow

I’d define the first guided workflow like this:

```text
Tour Start
→ Legacy Intake Dock
→ Inventory & Classification
→ Salvage & Retrieval
→ Refactor & Modernize Lab
→ Packetization / Productization Line
→ Quality & Governance Gate
→ SQL Memory / Evidence Vault
→ Telemetry Command Center
→ Distribution Hub
→ Continuous Improvement Loop
→ Tour Completion
```

Each stop should answer the same five questions:

```text
What is happening?
What should I care about right now?
What do I need to decide?
Why should I trust this?
What should I do next?
```

That is already your strongest UX pattern: orient, focus, decide, trust, act. 

# What the Tour Guide says at each stop

## 1. Legacy Intake Dock

> “This is where scattered assets enter: old repos, demos, scripts, internal tools, model experiments, UI components, workflow fragments, and prototypes.”

The guide explains that intake does not immediately trust the asset. It only registers it.

Output:

```text
raw_asset_intake_record
```

## 2. Inventory & Classification

> “Now we classify the asset into files, symbols, responsibilities, workflows, domains, dependencies, and risks.”

This is where the user sees the warehouse stop treating code as random text and starts treating it as structured inventory.

Output:

```text
structured_asset_catalog
```

## 3. Salvage & Retrieval

> “Now we identify what is reusable, what is risky, what should be archived, and what can become a product candidate.”

Output:

```text
reuse_candidate_packet
```

## 4. Refactor & Modernize Lab

> “Now modernization happens, but not by freestyle edits. The contract defines the work, the wrapper performs the work, the agent monitors it, and the gate trusts only wrapper-produced evidence.”

That exact pattern is central: contract defines, wrapper performs, agent orchestrates, and the gate trusts wrapper evidence. 

Output:

```text
modernized_asset_candidate
```

## 5. Productization Line

> “Now the useful asset becomes something distributable: SDK, API, workflow pack, agent skill, model asset, template, or SaaS module.”

Output:

```text
product_packet
```

## 6. Quality & Governance Gate

> “Now we validate security, compliance, ownership, tests, provenance, and downstream impact.”

Output:

```text
trusted_release_candidate
```

## 7. SQL Memory / Evidence Vault

> “This is where truth lives. Markdown, reports, terminal output, and chat summaries are projections or evidence candidates. The warehouse trusts durable records.”

Output:

```text
evidence_lineage
```

## 8. Telemetry Command Center

> “This is where we watch the warehouse operate: throughput, friction, failures, bottlenecks, release readiness, and modernization progress.”

Output:

```text
operator_visibility
```

## 9. Distribution Hub

> “This is where the product leaves the warehouse as something others can actually use.”

Output:

```text
distributable_product
```

## 10. Continuous Improvement Loop

> “Every run teaches the warehouse. Repeated friction becomes a candidate for promotion. Repeated workflow becomes a primitive.”

That connects directly to your promotion pattern: repeated choreography gets collapsed into an API/SDK primitive, governed, activated, and reused. 

Output:

```text
benchmark_uplift
```

# The Tour Guide as a real product surface

I’d make it an actual workflow:

```ts
client.warehouseTour.start({
  tourType: "engineer_onboarding",
  role: "new_engineer",
  assetContext: "sample_legacy_project",
  output: "loga_markdown"
})
```

Response:

```json
{
  "tour_id": "tour-...",
  "status": "in_progress",
  "current_stop": "legacy_intake_dock",
  "focus_question": "What should I care about right now?",
  "guide_narration": "...",
  "visible_artifacts": [],
  "evidence_refs": [],
  "next_actions": [
    "Continue to Inventory & Classification",
    "Open intake evidence",
    "Inspect sample asset"
  ]
}
```

Then:

```ts
client.warehouseTour.advance({
  tourId,
  action: "continue"
})
```

And eventually:

```ts
client.warehouseTour.complete({
  tourId,
  comprehensionChecksPassed: true
})
```

# The bigger insight

This Tour Guide becomes the **human interface to the operating system**.

The warehouse itself is the substrate.

The Tour Guide is the teacher.

The workflow is the curriculum.

The evidence is the trust layer.

The product packet is the outcome.

That is extremely compelling, because now you can invite someone in and say:

> “Don’t read a 50-page architecture doc. Let me take you through the warehouse.”

That is how you turn a deep technical platform into something people can understand, remember, and believe in.
