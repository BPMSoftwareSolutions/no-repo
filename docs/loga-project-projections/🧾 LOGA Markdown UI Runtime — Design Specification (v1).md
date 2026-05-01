# 🧾 LOGA Markdown UI Runtime — Design Specification (v1)

## 1. Purpose

Define a **portable UI rendering system** where:

```text
Markdown → UI contract → runtime renderer → styled UI
```

With **no hardcoded UI transformation logic** in the renderer.

---

## 2. Core Principle

> **UI is not implemented in code. UI is declared as a contract and interpreted at runtime.**

```text
Markdown = intent
Registry = structure + style mapping
Renderer = execution engine
CSS (from DB later) = visual behavior
```

---

## 3. Architecture Overview

```text
┌────────────────────────────┐
│ Markdown UI Contract       │
└────────────┬───────────────┘
             ↓
┌────────────────────────────┐
│ Parser (AST generator)     │
└────────────┬───────────────┘
             ↓
┌────────────────────────────┐
│ Element Registry (JSON)    │
│ - elements                 │
│ - variants                 │
│ - field mappings           │
│ - styles                   │
└────────────┬───────────────┘
             ↓
┌────────────────────────────┐
│ Renderer Engine            │
│ - generic renderer         │
│ - layout rules             │
│ - specialized handlers     │
└────────────┬───────────────┘
             ↓
┌────────────────────────────┐
│ DOM Output                 │
│ + injected styles          │
└────────────────────────────┘
```

---

## 4. Rendering Model

### 4.1 Data-driven rendering

```text
block.name → registry lookup → render
```

### 4.2 No UI knowledge in runtime

❌ Bad:

```js
if (block.name === "focus_strip") renderFocusStrip()
```

✅ Good:

```js
spec = registry[block.name]
renderGeneric(block, spec)
```

---

## 5. Registry Contract

## 5.1 Structure

```json
{
  "elements": {},
  "styles": {}
}
```

---

## 5.2 Element Definition

```json
{
  "focus_strip": {
    "category": "component",
    "element": "section",
    "className": "loga-focus-strip",
    "fields": {
      "primary.question": {
        "element": "h2",
        "className": "loga-focus-strip__question"
      },
      "primary.answer": {
        "element": "p",
        "className": "loga-focus-strip__answer"
      }
    }
  }
}
```

---

## 5.3 Variant Mapping

```json
{
  "toolbar": {
    "variants": {
      "linear": "loga-toolbar--linear",
      "stacked": "loga-toolbar--stacked"
    }
  }
}
```

---

## 5.4 Style Definition (critical)

```json
{
  "styles": {
    ".loga-toolbar--linear": {
      "display": "flex",
      "flexWrap": "nowrap",
      "alignItems": "flex-end",
      "gap": "10px",
      "overflowX": "auto"
    }
  }
}
```

---

# 6. Renderer Responsibilities

## 6.1 MUST DO

```text
parse markdown → AST
lookup registry entry
validate block
apply class names
render DOM
inject styles
```

---

## 6.2 MUST NOT DO

```text
NO hardcoded UI components
NO implicit transformations
NO fallback rendering
NO hidden behavior
```

---

## 6.3 Failure Modes

```text
missing registry → hard fail
unknown block → visible warning
invalid field → validation error
```

---

# 7. Layout System

## 7.1 Layout blocks

```text
toolbar
grid
split
stack
rail
```

---

## 7.2 Layout rules (critical)

### Toolbar

```text
linear:
  single row
  no wrapping
  bottom aligned
  scroll allowed
  no overlap ever
```

---

### Grid

```text
equal columns
responsive collapse
```

---

### Split

```text
2 regions
ratio-based
responsive collapse
```

---

### Stack

```text
vertical flow
spacing controlled
```

---

### Rail

```text
side-aligned
sticky
collapsible
```

---

# 8. Styling Model (future-ready)

## Current

```text
styles loaded from JSON
injected into DOM
```

## Future (AI Engine)

```text
styles served from SQL
→ versioned
→ governed
→ per-surface override
```

---

# 9. AI Engine Integration Target

## 9.1 Storage

```text
ui_element_registry
ui_style_registry
ui_theme_registry
```

---

## 9.2 API Surface

```http
GET /api/ui/registry
GET /api/ui/styles
GET /api/ui/theme?context=operator
```

---

## 9.3 Runtime flow

```text
client loads projection
→ client fetches UI registry
→ client fetches styles
→ renderer executes contract
```

---

# 10. Design Philosophy

## 10.1 No fallback rule

```text
If registry fails → UI fails
```

---

## 10.2 Explicit over implicit

```text
All UI behavior must be declared
```

---

## 10.3 Separation of concerns

| Layer    | Responsibility      |
| -------- | ------------------- |
| Markdown | intent              |
| Registry | structure + mapping |
| Renderer | execution           |
| Styles   | visual behavior     |

---

## 10.4 Portable UI system

This enables:

```text
same markdown
→ LOGA
→ client app
→ AI Engine UI
→ any future surface
```

---

# 11. Migration Strategy

## Phase 1 (now)

* Introduce registry
* convert simple blocks
* inject styles from JSON

---

## Phase 2

* refactor layout system
* remove hardcoded components
* unify renderer

---

## Phase 3

* move registry + styles to database
* version contracts
* enable multi-tenant theming

---

# 12. Final State

```text
AI Engine stores:
- workflow state (SQL)
- UI contract (markdown)
- UI registry (JSON)
- UI styles (JSON)

Client renders:
- without hardcoded UI logic
- using only contracts + registry
```

---

# 🚀 What you actually built

You didn’t just “fix a toolbar.”

You created:

```text
A contract-driven UI runtime
capable of being served from a database
and rendered consistently across clients
```

---

# AI Engine UI Contract Registry — v1

## 1. Target flow

```text
AI Engine SQL
→ UI registry API
→ client renderer
→ markdown projection
→ registry-driven HTML
→ registry-driven styles
```

## 2. Database schema

```sql
CREATE SCHEMA IF NOT EXISTS ui;

CREATE TABLE ui.ui_contract_registries (
  ui_registry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_key TEXT NOT NULL UNIQUE,
  registry_name TEXT NOT NULL,
  registry_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT NULL,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ui.ui_element_contracts (
  ui_element_contract_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ui_registry_id UUID NOT NULL REFERENCES ui.ui_contract_registries(ui_registry_id),
  element_key TEXT NOT NULL,
  category TEXT NOT NULL,
  semantic_element TEXT NOT NULL,
  class_name TEXT NOT NULL,
  variants_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  fields_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  repeated_item_json JSONB NULL,
  allowed_children_json JSONB NULL,
  required_fields_json JSONB NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (ui_registry_id, element_key)
);

CREATE TABLE ui.ui_style_contracts (
  ui_style_contract_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ui_registry_id UUID NOT NULL REFERENCES ui.ui_contract_registries(ui_registry_id),
  selector TEXT NOT NULL,
  style_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (ui_registry_id, selector)
);

CREATE TABLE ui.ui_registry_publications (
  ui_registry_publication_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ui_registry_id UUID NOT NULL REFERENCES ui.ui_contract_registries(ui_registry_id),
  publication_version TEXT NOT NULL,
  publication_status TEXT NOT NULL DEFAULT 'published',
  registry_payload_json JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  published_by TEXT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (ui_registry_id, publication_version)
);
```

## 3. Canonical API

```http
GET /api/ui/registries/{registryKey}
```

Returns:

```json
{
  "registryKey": "loga-ui-elements",
  "version": "v1",
  "status": "published",
  "sourceTruth": "sql",
  "contentHash": "sha256:...",
  "elements": {
    "toolbar": {
      "category": "layout",
      "element": "header",
      "className": "loga-toolbar",
      "variants": {
        "linear": "loga-toolbar--linear"
      }
    }
  },
  "styles": {
    ".loga-toolbar--linear": {
      "display": "flex",
      "flexWrap": "nowrap",
      "alignItems": "flex-end",
      "overflowX": "auto"
    }
  }
}
```

## 4. Admin/governance APIs

```http
POST /api/ui/registries
PUT /api/ui/registries/{registryKey}/elements/{elementKey}
PUT /api/ui/registries/{registryKey}/styles
POST /api/ui/registries/{registryKey}/validate
POST /api/ui/registries/{registryKey}/publish
GET /api/ui/registries/{registryKey}/publications
```

## 5. Renderer client behavior

```js
const registry = await fetch('/api/ui/registries/loga-ui-elements')
  .then((r) => {
    if (!r.ok) throw new Error('UI registry load failed');
    return r.json();
  });

injectStyles(registry.styles);
renderMarkdownWithRegistry(markdown, registry.elements);
```

Failure posture:

```text
No registry → no render.
Unknown block → visible unsupported-block error.
Invalid registry → hard fail.
No embedded fallback.
```

## 6. First migration path

```text
1. Keep markdown-ui-elements.json as seed artifact
2. Add SQL tables
3. Import JSON into ui.* tables
4. Publish registry snapshot
5. Client loads registry from API
6. Remove local JSON dependency
```

## 7. Design rule

```text
Markdown declares intent.
SQL stores registry and style truth.
Client renders from registry.
Renderer owns mechanics, not UI knowledge.
```

This is the durable boundary you want.
