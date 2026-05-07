# Natural Language Workflow Discovery Loop v1 API Spec

## Status

Draft

## Purpose

Define the first SDK surface for natural language workflow discovery, execution, evidence capture, and promotion candidacy.

This spec is intentionally narrow. It describes one command-oriented entrypoint and one structured result so the client can invent workflows without becoming a general-purpose workflow runtime.

## Endpoint Shape

The SDK should expose one high-level entrypoint:

```ts
client.workflowComposer.runCommand(request)
```

## Request Schema

```ts
type WorkflowComposerContext = {
  workspace?: string;
  output?: 'loga_markdown' | 'markdown' | 'json' | 'table';
  projectId?: string;
  itemKey?: string;
  workflowRunId?: string;
  evidenceMode?: 'minimal' | 'standard' | 'verbose';
  allowPartial?: boolean;
  surfaceHints?: string[];
};

type WorkflowComposerRequest = {
  command: string;
  context?: WorkflowComposerContext;
};
```

### Request Fields

- `command`
  - Required natural language command.
  - Must be treated as the user intent input for the discovery loop.
- `context.workspace`
  - Optional workspace name or lane identifier.
- `context.output`
  - Optional output preference for the rendered result.
- `context.projectId`
  - Optional project scope hint.
- `context.itemKey`
  - Optional active item or focus hint.
- `context.workflowRunId`
  - Optional workflow run scope hint.
- `context.evidenceMode`
  - Controls how much evidence metadata is included.
- `context.allowPartial`
  - If `false`, the command should fail closed on missing surfaces.
- `context.surfaceHints`
  - Optional list of surfaces the client already expects to use.

## Response Schema

```ts
type WorkflowComposerStatus =
  | 'supported'
  | 'partial'
  | 'ambiguous'
  | 'unsupported';

type PromotionReadiness = 'none' | 'candidate' | 'ready';

type WorkflowComposerResponse = {
  status: WorkflowComposerStatus;
  promotion: PromotionReadiness;
  intent: {
    goal?: string;
    entities?: Record<string, unknown>;
    constraints?: string[];
    assumptions?: string[];
  };
  execution_plan: string[];
  available_surfaces: string[];
  missing_surfaces: string[];
  evidence_packet: {
    trace?: unknown[];
    sources?: unknown[];
    notes?: string[];
    provenance?: Record<string, unknown>;
  };
  promotion_candidate: {
    name?: string;
    confidence?: number;
    reason?: string;
  } | null;
  rendered_output: string;
};
```

## Status Rules

### `supported`

The requested command can execute safely end-to-end using current surfaces.

### `partial`

The SDK can complete safe sub-steps, but one or more required surfaces are missing.

### `ambiguous`

The user intent is underspecified or contradictory. The SDK should clarify or fail closed.

### `unsupported`

The command cannot be satisfied safely with current capability. The SDK should still return a capability contract when possible.

## Promotion Rules

The `promotion` field should be independent from `status`.

- `none`
  - No repeatable pattern was identified.
- `candidate`
  - The command produced a promising reusable flow, but it has not been proven enough for canonical promotion.
- `ready`
  - The command has repeated successfully, evidence is adequate, and the workflow may be proposed for backend canonicalization.

## Minimal Execution Phases

The implementation may use these internal phases:

1. Intent analysis.
2. Capability mapping.
3. Execution planning.
4. Surface discovery.
5. Safe execution.
6. Evidence capture.
7. Promotion candidate generation.

## Example

```ts
const result = await client.workflowComposer.runCommand({
  command: 'What has been going on in AI Engine today?',
  context: {
    workspace: 'operator',
    output: 'loga_markdown',
    evidenceMode: 'standard',
    allowPartial: true,
  },
});

if (result.status === 'unsupported') {
  console.log(result.missing_surfaces);
}

console.log(result.rendered_output);
```

## Non-Goals

This v1 spec does not define:

- a general-purpose query language
- client-side workflow persistence
- raw CRUD mutation helpers
- a visual workflow builder
- promotion approval policy

Those capabilities belong in the engine and governance layer, or in later versions of the client contract.

