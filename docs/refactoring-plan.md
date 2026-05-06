# Codebase Refactoring Plan

Goal: make this look like a real shipped app — clean structure, clear separation of concerns, no experiment leftovers.

---

## Proposed Directory Structure

```
root/
├── server.mjs                      # ~55 lines: HTTP setup + routing only
├── package.json
├── .env.example
├── README.md
│
├── src/
│   ├── server/
│   │   ├── tree.mjs                # All buildLogaTree* functions (extracted from server.mjs)
│   │   └── proxy.mjs               # POST /api/ai-engine handler (extracted from server.mjs)
│   │
│   ├── renderer/                   # MOVED from docs/loga-project-projections/markdown-contract-lab/
│   │   ├── parser.js
│   │   ├── renderer.js
│   │   ├── primitives.js
│   │   ├── html.js
│   │   ├── element-registry.js
│   │   ├── registry-renderer.js
│   │   ├── contract.js
│   │   ├── toolbar.js
│   │   ├── app.js
│   │   ├── sample.js
│   │   ├── browser.js              # IIFE bundle (co-located with source; loaded by lab.html)
│   │   ├── lab-shell.css           # Lab-scoped stylesheet
│   │   └── markdown-ui-elements.json
│   │
│   ├── css/
│   │   └── global-inspection.css
│   │
│   ├── html/
│   │   ├── index.html
│   │   ├── playground.html
│   │   ├── projection-detail.html
│   │   ├── projection-group.html
│   │   ├── projections.html
│   │   ├── repositories.html
│   │   ├── repository-detail.html
│   │   ├── anti-pattern-detail.html
│   │   ├── candidate-analysis.html
│   │   ├── code-intelligence.html
│   │   ├── file-detail.html
│   │   ├── patterns.html
│   │   ├── refactor-workbench.html
│   │   ├── remediation-proposals.html
│   │   ├── symbol-detail.html
│   │   └── lab.html                # MOVED from docs/loga-project-projections/markdown-contract-lab.html
│   │
│   └── js/
│       ├── api-client.js
│       ├── projection-detail.js
│       ├── projection-tree.js
│       ├── projection-workspace.js
│       ├── projection-group.js
│       ├── projections.js
│       ├── playground.js
│       ├── code-intelligence.js
│       ├── repositories.js
│       ├── repository-detail.js
│       └── symbol-detail.js
│
├── fixtures/
│   ├── projections/                # MOVED from docs/loga-project-projections/markdown-projections/
│   │   ├── operator.agent_session.md
│   │   ├── operator.cicd_status.md
│   │   ├── operator.evidence_packet.md
│   │   ├── operator.project_detail.md
│   │   ├── operator.project_roadmap.md
│   │   ├── operator.promotions.md
│   │   ├── operator.roadmap_item.md
│   │   ├── operator.task_detail.md
│   │   ├── operator.workflow_run.md
│   │   └── operator.workflow_runs.md
│   └── project-portfolio.md        # MOVED from docs/loga-project-projections/markdown-contract-lab/
│
├── scripts/
│   ├── ping.mjs
│   ├── pull-portfolio-projection.mjs
│   ├── probe-loga-surfaces.mjs
│   ├── test-markdown-contract-lab.mjs
│   └── test-ux-gate.mjs
│
└── docs/
    ├── api-client.md               # MOVED from AI Engine API Client/README.md
    ├── refactoring-plan.md         # this file
    ├── design/
    │   ├── markdown-ui-runtime-spec.md     # RENAMED from 🧾 LOGA Markdown UI Runtime...v1.md
    │   ├── projection-tree-taxonomy.md     # MOVED from docs/loga-project-projections/
    │   ├── four-inspection-modes.md        # RENAMED from Four Inspection Modes.md
    │   ├── renderer-mapping.md             # MOVED from docs/loga-project-projections/renderer-mapping/
    │   ├── sdk-surface-sketch.md           # MOVED from docs/loga-project-projections/renderer-mapping/
    │   ├── toolbar-tree-ux-guidance.md     # MOVED from docs/loga-project-projections/toolbar-addition/
    │   ├── tree-sidebar.md                 # MOVED from docs/loga-project-projections/
    │   └── ui-ascii-sketches.md
    └── archive/                    # Experiment notes, test plans, correction payloads
        ├── experiment-1-correction-payload.md
        ├── experiment-1-implementation-instruction.md
        ├── experiment-1-remediation-instruction.md
        ├── experiment-1-upstream-implementation-request.md
        ├── experiment-2-upstream-submission.md
        ├── experiment-set-2.md
        ├── Experiment Test Plan.md
        ├── Client UX Inspection Test Suite.md
        ├── test-strategy.md
        ├── test-suite-run-review-gemini.md
        ├── review.md
        ├── mental-model-refactoring.md
        ├── ai-engine-upstream-fixes.md
        ├── governed-interaction-experiment.md
        ├── critical-thinking-mode.md
        ├── playground-ux-test-plan.md
        ├── playground-ux-test-plan-clean.md
        ├── playground-mission-runbook.md
        ├── operator-home-remediation-payload.md
        ├── project-roadmap-mental-model.md
        ├── approval-review-fixture.md
        ├── layout-mental-model.md
        ├── new-ui-contracts.md
        ├── run-experiment.mjs              # archived scripts
        ├── run-loga-experiments.mjs
        ├── shape-evidence.mjs
        └── shape-loga-evidence.mjs
```

---

## What Moves Where and Why

### `src/renderer/` — rendering engine out of `docs/`

Every file in `docs/loga-project-projections/markdown-contract-lab/` except the generated data file (`project-portfolio.md`) moves to `src/renderer/`. These are ES modules that form a production rendering pipeline imported by `src/js/api-client.js` and tested by `scripts/test-markdown-contract-lab.mjs`. Putting production source modules in `docs/` is the root structural problem this refactor fixes.

`browser.js` and `lab-shell.css` move with them — they are part of the same rendering subsystem and co-location makes the `<script src="../renderer/browser.js">` reference in `lab.html` natural.

### `fixtures/projections/` — fixture files out of `docs/`

The 10 `operator.*.md` files are static fallback data served at runtime, not documentation. `fixtures/` at the root is the conventional location for test/fallback data. The server needs a companion `/fixtures/` static route alongside the existing `/docs/` route.

### `src/html/lab.html` — lab promoted into app

The contract lab HTML page becomes a first-class route at `/lab.html`, served the same way as all other pages. The duplicate inner copy (`markdown-contract-lab/markdown-contract-lab.html`) is deleted.

### `src/server/tree.mjs` and `src/server/proxy.mjs` — server split

`server.mjs` has three separate concerns: HTTP/routing, AI Engine proxy, and the full tree builder (~500 lines). The split:
- `src/server/tree.mjs` — exports `buildLogaTreeRoot()` and `buildLogaTreeChildren(nodeId)`. All builder helpers stay as module-private functions.
- `src/server/proxy.mjs` — exports `createProxyHandler(client)` returning a `(req, res)` function. The `client` is injected so the module is testable.
- `server.mjs` — becomes ~55 lines: imports, client setup, HTTP server, routing.

### `docs/design/` — active design docs surfaced

Five files from the scattered `docs/` root and `loga-project-projections/` are live design specs worth keeping: the markdown UI runtime spec, the projection tree taxonomy, four inspection modes, renderer mapping, toolbar/tree UX guidance.

### `docs/archive/` — experiment dump cleared

The remaining ~20 markdown files are experiment payloads, correction payloads, early test plans, and session notes. They go to `docs/archive/` rather than being deleted, so nothing is lost.

### `AI Engine API Client/` — stray directory removed

The README moves to `docs/api-client.md`. The directory is deleted.

### `scripts/` — experiment runners removed

`run-experiment.mjs`, `run-loga-experiments.mjs`, `shape-evidence.mjs`, `shape-loga-evidence.mjs` are early experiment harnesses, not operational scripts. They move to `docs/archive/`.

---

## Import Paths That Need Updating

### `src/js/api-client.js`
```js
// Before:
import { parseMarkdown } from '../docs/loga-project-projections/markdown-contract-lab/parser.js';
import { renderMarkdown } from '../docs/loga-project-projections/markdown-contract-lab/renderer.js';
// ...
const url = new URL('../docs/loga-project-projections/markdown-contract-lab/markdown-ui-elements.json', import.meta.url);

// After:
import { parseMarkdown } from '../renderer/parser.js';
import { renderMarkdown } from '../renderer/renderer.js';
// ...
const url = new URL('../renderer/markdown-ui-elements.json', import.meta.url);
```

### `scripts/test-markdown-contract-lab.mjs`
```js
// Before:
import { ... } from '../docs/loga-project-projections/markdown-contract-lab/element-registry.js';
import { ... } from '../docs/loga-project-projections/markdown-contract-lab/contract.js';
import { parseMarkdown } from '../docs/loga-project-projections/markdown-contract-lab/parser.js';
import { renderMarkdown, ... } from '../docs/loga-project-projections/markdown-contract-lab/renderer.js';
// ...
fs.readFileSync('./docs/loga-project-projections/markdown-contract-lab/markdown-ui-elements.json')
fs.readFileSync('./docs/loga-project-projections/markdown-contract-lab/browser.js')
fs.readFileSync('./docs/loga-project-projections/markdown-contract-lab.html')
fs.readFileSync('./docs/loga-project-projections/markdown-contract-lab/lab-shell.css')

// After:
import { ... } from '../src/renderer/element-registry.js';
import { ... } from '../src/renderer/contract.js';
import { parseMarkdown } from '../src/renderer/parser.js';
import { renderMarkdown, ... } from '../src/renderer/renderer.js';
// ...
fs.readFileSync('./src/renderer/markdown-ui-elements.json')
fs.readFileSync('./src/renderer/browser.js')
fs.readFileSync('./src/html/lab.html')
fs.readFileSync('./src/renderer/lab-shell.css')
```

### `src/js/projection-detail.js`
```js
// Before:
fetch(`/docs/loga-project-projections/markdown-projections/${safeType}.md`)

// After:
fetch(`/fixtures/projections/${safeType}.md`)
```

### `scripts/pull-portfolio-projection.mjs`
```js
// Before: output path pointing to markdown-contract-lab/
// After: '../fixtures/project-portfolio.md'
```

### `browser.js` internal URL
```js
// Before: './markdown-contract-lab/markdown-ui-elements.json'
// After:  './markdown-ui-elements.json'
// Also update the test assertion that checks this string.
```

### `server.mjs` — add fixtures route
```js
// Add alongside the existing /docs/ route:
if (pathname.startsWith('/fixtures/')) {
  filePath = path.join(ROOT_DIR, pathname);
}
```

---

## package.json Script Cleanup

Remove (reference deleted scripts):
- `check:experiment`
- `evidence:shape`
- `experiment`
- `loga:evidence:shape`
- `loga:experiment`

Update `test`:
```json
// Before: "npm run check && npm run check:experiment && node ./scripts/test-markdown-contract-lab.mjs"
// After:  "npm run check && node ./scripts/test-markdown-contract-lab.mjs"
```

---

## Sequencing (do in this order to avoid broken states)

1. **Move rendering engine → `src/renderer/`** and update all import paths in the same step. Highest risk — touches the most import edges at once. Do not leave half-moved.

2. **Move fixtures → `fixtures/projections/`**, add `/fixtures/` server route, update fetch URL in `projection-detail.js`. These three changes must land together or the app 404s on fixture loads.

3. **Split `server.mjs`** into `server.mjs` + `src/server/tree.mjs` + `src/server/proxy.mjs`. Pure refactor, no behavior change. Own commit for easy bisect.

4. **Move `lab.html` → `src/html/lab.html`** and update its `<script>` tag. Low risk — the server already serves `src/html/*.html` at `/*.html`.

5. **Update `pull-portfolio-projection.mjs`** output path and `test-ux-gate.mjs` fixture path.

6. **Docs and scripts cleanup** — archive/delete everything with no code dependencies. Last step, no risk.

---

## Key Risk: `browser.js` URL resolution

`browser.js` resolves the JSON registry via a URL relative to `document.currentScript.src`. After the move, it will be at `src/renderer/browser.js` and the JSON will be at `src/renderer/markdown-ui-elements.json`. The internal path changes from `./markdown-contract-lab/markdown-ui-elements.json` to `./markdown-ui-elements.json`. The test assertion that validates this string must also be updated, or the test will pass with a stale expected value.
