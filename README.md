# AI Engine Repo-less Operator Workspace

## Overview

This project is an experimental operator workspace for interacting with AI Engine without cloning or reading the target codebase directly.

Instead of:

```text
clone repo -> read files -> modify code
```

This workspace uses:

```text
npm client -> API boundary -> SQL substrate -> governed retrieval -> bounded code projection
```

The goal is to validate a new architecture:

> Separate the operator from the repository. Make the substrate the only source of truth and interaction.

## Installed Client

This workspace uses:

```bash
npm install @bpmsoftwaresolutions/ai-engine-client
```

The package is installed in `package.json` and exposes `AIEngineClient.fromEnv()`.

## Environment

Set these variables before running scripts:

```bash
export AI_ENGINE_API_KEY="your-api-key"
export AI_ENGINE_BASE_URL="https://your-ai-engine-host"
```

PowerShell:

```powershell
$env:AI_ENGINE_API_KEY = "your-api-key"
$env:AI_ENGINE_BASE_URL = "https://your-ai-engine-host"
```

See `.env.example` for the required names.

## Smoke Test

Run a health check against the configured AI Engine:

```bash
npm run ping
```

This runs `scripts/ping.mjs`, which creates the client from the environment and calls:

```js
import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';

const client = AIEngineClient.fromEnv();
const health = await client.ping();
console.log(health);
```

## Experiment Harness

Run the governed execution simulation:

```bash
npm run experiment
```

The harness emits:

- contract stub
- wrapper execution record shape
- per-operation log
- gate-ready evidence payload
- missing capability findings

This is diagnostic evidence, not wrapper-produced mutation authority.

The discovery test intentionally records the current missing surface:

```json
{
  "finding_type": "missing_surface",
  "surface": "intent_code_search",
  "impact": "repo_less_operator_requires_prior_symbol_knowledge"
}
```

## Basic Usage

```js
import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';

const client = AIEngineClient.fromEnv();

const health = await client.ping();
console.log(health);

const memory = await client.getLatestMemoryProjection();
console.log(memory);

const status = await client.currentWorkflowStatus();
console.log(status);
```

## What You Can Do

### Retrieve Code Governed By The API

```js
await client.getSymbolDefinition({
  qualifiedName: 'src.orchestration.agent_substrate_service.AgentSubstrateService',
  includeCode: true,
});
```

```js
await client.getRelatedCode({
  qualifiedName: 'src.orchestration.agent_substrate_service.AgentSubstrateService',
  relationshipType: 'calls',
});
```

You request code through the client; you do not browse the target repository directly.

### Generate Scripts Locally

Use retrieved code to build scripts, test ideas, and simulate transformations:

```text
retrieved code -> local script -> execution -> output
```

### Return Evidence

Outputs should be sent back as artifacts, observations, and proposed changes, not direct repo edits.

### Trigger Governed Actions

Real mutations should go through:

```text
approved contract -> wrapper execution -> SQL evidence -> governance gates
```

## Architectural Principles

### Substrate Is Authority

- SQL is the source of truth.
- The API exposes governed views.
- The repo is not the runtime interface.

### No Ambient Context

This workspace intentionally has no target `/src`, markdown docs, or direct target repo reads.

### Retrieval Is Intent-Based

Every request should be:

```text
intent -> scoped retrieval -> bounded result
```

Not:

```text
search everything -> guess context
```

### Mutation Is Not Local

You can explore, simulate, and generate. Real changes must go through governed execution.

## Experiment Goals

This workspace is testing:

- API sufficiency for code understanding, dependency tracing, and script generation.
- Surface hygiene from removing ambient repo access.
- Separation between operator and repository.
- Instinct shaping through substrate, retrieval, wrapper, and governance gates.

## Known Gaps

You may hit incomplete retrieval endpoints, missing symbol relationships, limited dependency tracing, or lack of structured code windows. That is expected; this workspace is meant to expose those gaps clearly.

## Target State

```text
No repo access -> no context pollution -> all knowledge via substrate -> all mutation via wrapper -> all validation via gates
```

## Mental Model

Think of this workspace as a terminal into the AI Engine brain, not a conventional development environment.
