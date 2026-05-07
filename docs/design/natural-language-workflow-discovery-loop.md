# Natural Language Workflow Discovery Loop

## Product Alias

Client Workflow Composer

## Thesis

The client should be the place where workflow ideas are discovered, combined, tested, and refined in response to natural language intent.

The engine should remain the authority layer where proven workflows become canonical, governed, and repeatable.

This creates a clear product lane:

```text
natural language
-> client-side workflow composition
-> SDK primitive chain
-> execution trace and evidence
-> promotion candidate
-> governed backend workflow
-> one-command reuse
```

## Core Contract

The entrypoint should be a thin SDK surface that accepts a user command and returns a structured evaluation result.

```ts
client.workflowComposer.runCommand({
  command: "What has been going on in AI Engine today?",
  context: {
    workspace: "operator",
    output: "loga_markdown"
  }
})
```

### Suggested Response Shape

```json
{
  "status": "supported | partial | ambiguous | unsupported",
  "intent": {},
  "execution_plan": [],
  "available_surfaces": [],
  "missing_surfaces": [],
  "evidence_packet": {},
  "promotion_candidate": null,
  "rendered_output": ""
}
```

## Status Semantics

The command evaluation result should always resolve to one of these states:

| Status | Meaning |
| --- | --- |
| `supported` | The command can run end-to-end using available surfaces. |
| `partial` | Safe parts can run, but gaps or missing surfaces should be recorded. |
| `ambiguous` | The intent is underspecified and should be clarified or fail closed. |
| `unsupported` | The platform cannot safely satisfy the command, but should still emit a capability contract. |

Promotion readiness should be tracked separately from command status.

## Promotion Readiness

Instead of treating promotion as a peer status, model it as a property of the workflow draft.

Recommended shape:

```ts
promotion: "none" | "candidate" | "ready"
```

This keeps execution state distinct from graduation state.

## Workflow Draft Lifecycle

The client should support workflow drafts that move through a narrow lifecycle:

```text
drafted -> simulated -> refined -> proven -> promoted -> canonical
```

This lifecycle lets the client invent workflows without pretending they are already trusted runtime authority.

## SDK Responsibilities

The SDK should help the client:

1. Compose workflow steps from stable primitives.
2. Run safe executions and collect evidence.
3. Report available and missing surfaces.
4. Return a promotion candidate when a flow repeats successfully.
5. Render the result in the requested output shape.

The SDK should not become a general-purpose mutation builder or an open-ended workflow runtime.

## Engine Responsibilities

The engine should own:

1. Canonical workflow definitions.
2. Permission checks and governance.
3. Auditability and evidence retention.
4. Versioning and promotion policy.
5. Reliable execution for promoted workflows.

## Suggested First API

Start with one entrypoint and one structured result.

```ts
client.workflowComposer.runCommand({
  command,
  context
})
```

The implementation can internally compose:

1. Intent analysis.
2. Capability mapping.
3. Execution planning.
4. Surface discovery.
5. Safe execution.
6. Evidence capture.
7. Promotion candidate generation.

## Example Flow

User command:

```text
What has been going on in AI Engine today?
```

Possible execution plan:

```text
identify current workspace or project
load recent workflow status
collect blockers and notable events
render a LOGA summary
```

Possible surfaced gaps:

```text
intent_code_search
project-scoped daily briefing projection
```

## Design Rules

1. Every command must end in a structured result.
2. The client may invent workflows, but the engine decides what becomes authoritative.
3. Ambiguity should fail closed unless the safe path is obvious.
4. Missing surfaces should be recorded explicitly instead of hidden.
5. Promotion should require repeatability and evidence, not just a one-off success.

## Main Risks

### Abstraction Drift

The SDK can slowly become a second product surface if it grows into a mini workflow engine, a mini reporting engine, and a mini query engine at the same time.

### Surface Explosion

If every command can expand into arbitrary query, report, projection, and action logic, the client becomes hard to document and harder to support.

### Governance Leakage

Creative workflow composition is useful only if write operations remain constrained and backend-governed.

### Compatibility Fragility

Client-defined workflow drafts can become brittle if the underlying projection and action surfaces change too frequently.

## Recommended Guardrails

1. Keep the SDK thin and compositional.
2. Use versioned, governed read surfaces.
3. Keep writes intent-based, not CRUD-based.
4. Record evidence for every execution path.
5. Promote only flows that repeat cleanly and survive policy checks.

## Product Phrase

The cleanest articulation of the lane is:

> The client is where workflow ideas are discovered. The engine is where proven workflows become authority.
