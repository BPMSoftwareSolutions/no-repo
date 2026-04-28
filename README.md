# 🧠 AI Engine Repo-less Operator Workspace

## Overview

This project is an **experimental operator workspace** for interacting with AI Engine **without cloning or reading the codebase directly**.

Instead of:

```text
clone repo → read files → modify code
```

This workspace uses:

```text
npm client → API boundary → SQL substrate → governed retrieval → bounded code projection
```

The goal is to validate a new architecture:

> **Separate the operator from the repository.
> Make the substrate the only source of truth and interaction.**

---

## 🔥 Core Idea

AI systems learn from what they can see.

If they can see:

* raw repo files
* markdown docs
* ad hoc scripts

They will copy those patterns.

This workspace removes that entirely.

### New Model

```text
Operator (this workspace)
  → AI Engine Client (npm)
  → API Boundary (auth + claims)
  → SQL Substrate (code + memory)
  → Governed Retrieval
  → Bounded Code Windows
```

**No ambient repo. No uncontrolled context.**

---

## 🚀 Getting Started

### 1. Initialize Workspace

```bash
mkdir ai-engine-operator
cd ai-engine-operator
npm init -y
npm install @bpmsoftwaresolutions/ai-engine-client
```

---

### 2. Configure Environment

```bash
export AI_ENGINE_BASE_URL="https://your-ai-engine-host"
export AI_ENGINE_ACCESS_TOKEN="your-token" # or API key
```

---

### 3. Basic Usage

```js
import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';

const client = AIEngineClient.fromEnv();

// Health check
console.log(await client.ping());

// Load latest memory projection
const memory = await client.getLatestMemoryProjection();
console.log(memory);

// Check current workflow status
const status = await client.currentWorkflowStatus?.();
console.log(status);
```

---

## 🧩 What You Can Do

### 1. Retrieve Code (Governed)

```js
await client.getSymbolDefinition({
  qualifiedName: 'src.orchestration.agent_substrate_service.AgentSubstrateService',
  includeCode: true,
});
```

```js
await client.getRelatedCode({
  query: 'retrieval wrapper service',
});
```

➡️ You **request** code.
➡️ You don’t browse the repo.

---

### 2. Generate Scripts Locally

Use retrieved code to:

* build scripts
* test ideas
* simulate transformations

```text
retrieved code → local script → execution → output
```

---

### 3. Return Evidence

Outputs should be sent back as:

* artifacts
* observations
* proposed changes

Not direct repo edits.

---

### 4. Trigger Governed Actions

All real mutations must go through:

```text
approved contract
→ wrapper execution
→ SQL evidence
→ governance gates
```

---

## 🧱 Architectural Principles

### 1. Substrate is Authority

* SQL is the source of truth
* API exposes governed views
* repo is not the runtime interface

---

### 2. No Ambient Context

This workspace intentionally has:

* ❌ no `/src`
* ❌ no markdown docs
* ❌ no direct file reads

---

### 3. Retrieval is Intent-Based

Every request should be:

```text
intent → scoped retrieval → bounded result
```

Not:

```text
search everything → guess context
```

---

### 4. Mutation is Not Local

You can:

* explore
* simulate
* generate

But you **cannot**:

* directly modify repo code

All changes must go through governed execution.

---

## 🧪 Experiment Goals

This workspace is testing:

### 1. API Sufficiency

Can the current endpoints support:

* code understanding
* dependency tracing
* script generation

---

### 2. Surface Hygiene

Does removing repo access:

* reduce hallucination
* improve consistency
* enforce architectural patterns

---

### 3. Separation of Concerns

Can we cleanly split:

```text
operator ≠ repository
```

---

### 4. Instinct Shaping

Does forcing the AI to use:

```text
substrate → retrieval → wrapper → gate
```

produce better behavior?

---

## ⚠️ Known Gaps

You will likely hit:

* incomplete retrieval endpoints
* missing symbol relationships
* limited dependency tracing
* lack of structured code windows

That’s expected.

This workspace is meant to **expose those gaps clearly**.

---

## 🧭 Target State

The end goal looks like:

```text
No repo access
→ No context pollution
→ All knowledge via substrate
→ All mutation via wrapper
→ All validation via gates
```

---

## 💡 Mental Model

Think of this workspace as:

> **a terminal into the AI Engine brain**

Not:

> a development environment

---

## 🔚 Summary

This is not just a different setup.

It’s a different philosophy:

> **Control the surfaces → control the instincts → control the outcomes**
