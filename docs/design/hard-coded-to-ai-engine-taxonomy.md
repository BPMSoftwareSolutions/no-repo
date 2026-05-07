# Hard-coded Client Values — AI Engine Migration Taxonomy

Audit of JavaScript values and logic in the application source that are hard-coded today but should be driven by the AI Engine. Findings are grouped by category and ordered by priority.

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

## Priority Summary

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
