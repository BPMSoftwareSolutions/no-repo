# Client Source Taxonomy — Hard-coded Values and Bespoke Duplication

Two-part audit of the JavaScript source. Part 1 covers values and logic that are hard-coded today but should be driven by the AI Engine. Part 2 covers repeating patterns and bespoke implementations that should be centralized as shared functionality. Both parts are ordered by priority.

---

## 1. Entity Lookup Tables

**File:** `src/js/projection-detail.js:1338–1459`

Four JavaScript objects return static project data. These are the highest-priority items — live state frozen in client code.

| Function | Lines | Entries | Replacement call |
|---|---|---|---|
| `getTask(taskKey)` | 1374 | 4 tasks with `status`, `summary`, `acceptanceCriteria`, `deliverables` | `callAiEngine('getImplementationTask', taskKey)` |
| `getSubtask(subtaskKey)` | 1340 | 4 subtasks with `status`, `summary` | `callAiEngine('getSubtask', subtaskKey)` |
| `getTurn(turn)` | 1442 | 3 turns with `action`, `status`, `evidence`, `summary` | `callAiEngine('getAgentTurn', workflowRunId, turn)` |
| `getPromotion(promotionKey)` | 1450 | 6 promotions with `status`, `impact`, `description` | `callAiEngine('getPromotion', promotionKey)` |

Each function falls back to an "unknown" stub when the key is not found, which means adding a new task or promotion today requires a code change.

---

## 2. Status Inference Logic

**File:** `src/js/projection-detail.js:740–762, 854–865`

`buildProjectStatusProjection()` and `buildProjectRoadmapProjection()` both contain duplicated client-side logic that derives each roadmap item's status from raw task counts:

```js
if (tasksByStatus.completed === tasks.length && tasks.length > 0) inferredStatus = 'completed';
else if (tasksByStatus.in_progress > 0 || tasksByStatus.blocked > 0 ...) inferredStatus = 'in_progress';
else inferredStatus = 'open';
```

This inference belongs in the engine. Roadmap items returned by `getProjectRoadmap()` should carry a computed `status` field so the client can render without re-deriving it.

---

## 3. Status-to-Percentage Mapping

**File:** `src/js/projection-detail.js:212–215`

Fixed completion percentages assigned per status value:

```js
if (status === 'done' || status === 'completed') return { pct: 100 ... };
if (status === 'awaiting_review')               return { pct: 90 ... };
if (status === 'in_progress')                  return { pct: 50 ... };
if (status === 'blocked')                      return { pct: 25 ... };
```

These thresholds are tightly coupled to the engine's status vocabulary. The engine should either return a `completion_pct` field alongside each item's status, or publish a status schema that includes these weights.

---

## 4. Default Context Identifiers

Hard-coded fallback IDs that silently route all requests to a specific project when no context is present.

| Value | Location | Effect |
|---|---|---|
| `'ai-engine'` (default `projectId`) | `projection-detail.js:683, 711, 824`; `api-client.js:177` | All context-free requests resolve to the `ai-engine` project |
| `'generic-wrapper-runtime'` (default `itemKey`) | `api-client.js:178` | All context-free task list links resolve to this item |
| `'project-ai-engine-roadmap-item-generic-wrapper-runtime'` (focus node) | `projection-tree.js:36` | The "expand focus" button always opens this one node |

The focus node in particular should come from the engine as a "current focus" concept — a query rather than a constant.

---

## 5. URL/Routing Pattern Table

**File:** `src/js/api-client.js:105–168`

`resolveProjectionHref()` contains ten regex patterns that translate `/viewer/ai-engine/...` URL paths into SPA query strings:

```js
const viewerProject     = href.match(/\/viewer\/ai-engine\/projects\/([^/\s]+)$/i);
const viewerRoadmapItem = href.match(/\/viewer\/ai-engine\/projects\/([^/\s]+)\/roadmap\/([^/\s]+)/i);
const viewerEvidence    = href.match(/\/viewer\/ai-engine\/projects\/([^/\s]+)\/evidence\/([^/\s]+)/i);
// ... seven more patterns
```

`resolveListItemHref()` adds four more block-type-to-route mappings. As new projection types are added, both functions grow. The engine should return canonical `href` values in its responses, or expose a routing manifest, so the client does not maintain a parallel URL scheme.

---

## 6. Workspace Mode and Surface Definitions

**File:** `src/js/projection-workspace.js:184–268`

Four hard-coded maps define how the operator workspace is organized:

**Mode presets** — which surface buttons each mode activates:
```js
focus:      ['roadmap', 'memory'],
execution:  ['roadmap', 'workflows'],
diagnostic: ['roadmap', 'workflows', 'cicd', 'evidence'],
evidence:   ['evidence', 'memory', 'workflows'],
evolution:  ['promotions', 'cicd'],
```

**Mode hint text** — one-line description shown per mode (`:243`)

**Surface-to-type mapping** — which node types belong to which surface bucket (`:197`, `:232`)

**Node type display labels** — human-readable names for tree node types (`:184`)

These define operator-UX schema. Keeping them in the engine means the workspace can adapt to project-specific surface configurations without a client release.

---

## 7. Attention Filter Patterns

**File:** `src/js/projection-workspace.js:225–228`

Tree nodes are shown or hidden using text pattern matching against status strings:

```js
state.attention === 'blocked-only'  && /blocked|failed|waiting|pending/.test(status)
state.attention === 'high-priority' && /high|critical|2 \/ 4|needed/.test(status + ' ' + text)
```

The `2 \/ 4` pattern is a heuristic for a specific task count format. These regexes should be replaced by structured status/priority fields returned by the engine so filtering is deterministic rather than text-scraped.

---

## 8. Navigation Tree Root Structure

**File:** `src/server/tree.mjs:1–81`

`buildLogaTreeRoot()` returns three static root nodes (Projections, Repositories, Patterns). `buildLogaTreeChildren('projections')` returns six fixed surface nodes hardcoded in the server. Adding a new top-level surface requires a code change. The root tree shape should come from an engine call.

---

## 9. Gauge Color Tiers and Polling Interval

**File:** `src/js/projection-detail.js:65–87, 222`

```js
const tierColor = { high: '#22c55e', mid: '#f59e0b', low: '#ef4444' }[tier];
pollingInterval = setInterval(..., 5000);
```

Gauge color thresholds are coupled to the engine's completion percentage ranges. The polling interval (5 seconds) is lower priority but could be a server-provided hint to allow tuning without a client release.

---

## Part 1 — Priority Summary

| Priority | Category | Key file |
|---|---|---|
| Now | Entity lookup tables (tasks, subtasks, turns, promotions) | `src/js/projection-detail.js:1338` |
| Now | Default project/item/focus IDs | `src/js/api-client.js:177`, `src/js/projection-tree.js:36` |
| Soon | Status inference logic | `src/js/projection-detail.js:740` |
| Soon | Status-to-percentage mapping | `src/js/projection-detail.js:212` |
| Later | URL routing pattern table | `src/js/api-client.js:105` |
| Later | Mode and surface definitions | `src/js/projection-workspace.js:184` |
| Later | Tree root structure | `src/server/tree.mjs:1` |
| Config | Attention filter patterns, gauge colors, polling interval | scattered |

---

---

# Part 2 — Repeating Patterns and Missing Modularization

A shared module already exists at `src/shared/projection-schema.js` and exports `normalizeStatus`, `getItemStatus`, `getItemCompletionPct`, `getProjectId`, `WORKSPACE_SCHEMA`, and the default ID constants. The problem is that the module is only partially consumed — several files re-implement what it already provides, and several patterns that belong in it haven't been moved there yet.

---

## 10. `escapeHtml` — 6 Identical Copies

The same five-replacement HTML escaping function is copy-pasted verbatim into every file that renders dynamic content:

| File | Line |
|---|---|
| `src/js/projection-detail.js` | 1298 |
| `src/js/projection-workspace.js` | 271 |
| `src/js/projection-tree.js` | 408 |
| `src/js/api-client.js` | 96 |
| `src/js/projections.js` | 147 |
| `src/js/projection-group.js` | 96 |

This is the most mechanical duplication in the codebase. It belongs in `src/shared/dom-utils.js` (or `projection-schema.js`) and should be imported everywhere.

---

## 11. `WORKSPACE_SCHEMA` Imported but Bypassed

`src/js/projection-workspace.js:9` imports `WORKSPACE_SCHEMA` from the shared module, then ignores it and re-implements the same data inline in four functions:

| Function | Lines | Duplicates |
|---|---|---|
| `formatNodeType()` | 184–195 | `WORKSPACE_SCHEMA.nodeTypeLabels` |
| `surfacesForType()` | 197–205 | `WORKSPACE_SCHEMA.surfaceByType` |
| `applyModeHint()` | 243–253 | `WORKSPACE_SCHEMA.modeHints` |
| `applyModePreset()` | 255–268 | `WORKSPACE_SCHEMA.modePresets` |

Each of these functions maintains an inline object that is already defined in the schema. The functions should read from `WORKSPACE_SCHEMA` instead.

---

## 12. `projection-tree.js` Ignores the Shared Module Entirely

`src/js/projection-tree.js` does not import from `src/shared/projection-schema.js` at all. As a result:

- `expandFocusPath()` at line 36 hardcodes the focus node ID string directly instead of calling `buildFocusNodeId()` from the shared module
- Field extraction patterns throughout the file (`project?.project_id || project?.id`) duplicate `getProjectId()` and `getItemKey()` from the shared module
- Status comparisons throughout duplicate `normalizeStatus()` from the shared module

---

## 13. `tasksByStatus` Bucketing — Duplicated Loop

**Files:** `src/js/projection-detail.js:751–756` and `:853–858`

The same four-line pattern for bucketing tasks by status appears identically inside both `buildProjectStatusProjection()` and `buildProjectRoadmapProjection()`:

```js
const tasksByStatus = {
  open:       tasks.filter((t) => normalizeStatus(t.status) === 'open').length,
  in_progress: tasks.filter((t) => normalizeStatus(t.status) === 'in_progress').length,
  completed:  tasks.filter((t) => normalizeStatus(t.status) === 'completed' || ...).length,
  blocked:    tasks.filter((t) => normalizeStatus(t.status) === 'blocked').length,
};
```

This should be a `bucketTasksByStatus(tasks)` function in the shared module.

---

## 14. `isDone` Predicate — 4 Inline Repetitions

**File:** `src/js/projection-detail.js:753, 770, 777, 855`

The check `normalizeStatus(s) === 'completed' || normalizeStatus(s) === 'done'` is written out in full four times. `projection-schema.js` already has `getStatusCompletionPct` which treats both as 100%, but there is no exported `isDone(status)` predicate. One should be added and used consistently in place of the repeated two-term OR expression.

---

## 15. `buildProjectStatusProjection` and `buildProjectRoadmapProjection` — Near-Identical Structure

**File:** `src/js/projection-detail.js:710–821` and `:823–957`

Both transforms follow the same four-phase structure:
1. Fetch roadmap via `getProjectRoadmap(projectId)`
2. For each item, fetch tasks via `listImplementationTasks(item.implementation_item_id)`
3. Bucket tasks by status and infer item status from the counts
4. Compute aggregate stats (completedItems, inProgressItems, completionPercent, blockedCount)

Phase 3 and 4 are nearly word-for-word identical across the two functions. The shared logic should be extracted into an `enrichRoadmapItems(items)` helper so each transform only contains the rendering logic that differs.

---

## 16. `normalizeItemProgress()` Not Exported from the Shared Module

**File:** `src/js/projection-detail.js:205–234`

`normalizeItemProgress()` converts a roadmap item into the gauge progress shape `{ pct, completed, total, inProgress, blocked, awaiting }`. It is used in four places within `projection-detail.js` and overlaps with `getItemCompletionPct()` already in `projection-schema.js`. It should be moved to the shared module so the gauge data shape is defined in one place.

---

## 17. Projection Card Markup — 2 Parallel Implementations

The `.projection-card` element is constructed independently in two files with the same structure, same class names, and same "Open" button:

| Function | File | Lines |
|---|---|---|
| `renderSurface()` | `src/js/projections.js` | 119–134 |
| `renderProjectProjection()` | `src/js/projection-group.js` | 65–85 |

The only differences are which data fields are used for the title/summary/status slots. A shared `createProjectionCard({ label, summary, status, href, index, meaning })` factory in `src/shared/dom-utils.js` would serve both callers.

---

## 18. Table Error Rendering — Repeated DOM Pattern

**Files:** `src/js/code-intelligence.js`, `src/js/repositories.js`, `src/js/repository-detail.js`

All three use the same pattern to report an error inside a table body:

```js
tbody.innerHTML = `<tr><td colspan="X" class="loga-error-row">Error: ${error.message}</td></tr>`;
```

A `renderTableError(tbody, colSpan, message)` helper in `src/shared/dom-utils.js` would eliminate this pattern.

---

## 19. URL Params Extraction — 4 Separate Reads

`new URLSearchParams(window.location.search)` is called at page load in at least four files (`projection-detail.js:21`, `projection-group.js:22`, `symbol-detail.js:4`, `repository-detail.js:4`), and each file then manually extracts the same set of fields (`type`, `projectId`, `itemKey`, `taskKey`). A shared `parseProjectionParams()` function that returns a typed object would eliminate the repeated extraction and ensure consistent field handling across all pages.

---

## Part 2 — Priority Summary

| Priority | Finding | Where to fix |
|---|---|---|
| Now | `escapeHtml` — 6 copies | Extract to `src/shared/dom-utils.js`, import everywhere |
| Now | `WORKSPACE_SCHEMA` imported but bypassed — 4 functions | Rewrite `formatNodeType`, `surfacesForType`, `applyModeHint`, `applyModePreset` to read from schema |
| Now | `projection-tree.js` ignores shared module | Import and use `buildFocusNodeId`, `normalizeStatus`, `getProjectId` |
| Soon | `tasksByStatus` bucketing — 2 identical loops | Extract `bucketTasksByStatus(tasks)` to shared module |
| Soon | `buildProjectStatusProjection` / `buildProjectRoadmapProjection` — shared structure | Extract `enrichRoadmapItems(items)` shared helper |
| Soon | `isDone` predicate — 4 inline repetitions | Add `isDone(status)` to `projection-schema.js` |
| Soon | `normalizeItemProgress()` — not exported | Move to shared module |
| Later | Projection card markup — 2 parallel implementations | Shared `createProjectionCard()` in `dom-utils.js` |
| Later | Table error rendering — repeated DOM pattern | Shared `renderTableError()` in `dom-utils.js` |
| Later | URL params extraction — 4 separate reads | Shared `parseProjectionParams()` |
