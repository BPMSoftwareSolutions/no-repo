# Declarative Portfolio Projection

## What the code does today

`buildProjectPortfolioProjection` in `projection-detail.js` does four things in JavaScript that belong in a contract:

| Responsibility | Where it lives today |
|---|---|
| Markdown document structure | Template string literal in JS (~45 lines) |
| Collection filtering (`activeProjects`) | `.filter()` in JS |
| Field derivation (`cardStatus`, `target` URL) | Inline functions in JS |
| Scalar extraction + fallback chaining | Inline `toNum`, `||` chains in JS |

Compare this to `buildProjectDetailProjection`, which is already contract-driven:
it calls `loadTemplate('operator.project_detail')` and applies `{{token}}` substitution.
Portfolio cannot use the same path because it needs to iterate over an array of projects — the template engine only handles scalar substitution today.

---

## What declarative looks like

### 1. Template file

Move the markdown structure to `fixtures/templates/operator.project_portfolio.md.tmpl`.
Scalar fields use the existing `{{token}}` syntax. The list section uses a new `{{#each}}` block.

```markdown
---
loga_contract: "ai-engine-ui/v1"
interaction_contract: "loga-choreography/v1"
navigation_contract: "loga-navigation/v1"
projection_type: "operator.project_portfolio"
projection_id: "operator-project-portfolio"
source_system: "ai-engine"
source_truth: "sql"
primary_question: "What is the delivery state across all projects?"
workspace_mode: "focus"
surface_label: "Project Portfolio"
allowed_actions:
  - refresh_projection
---

# Project Portfolio

::surface type="project_portfolio" priority="high" summary="Portfolio completion is {{completion.completion_percentage}}% across {{completion.total_roadmap_items}} roadmap items."
::

## Portfolio Completion

::portfolio_gauge
completion_pct: {{completion.completion_percentage}}
completed_items: {{completion.completed_roadmap_items}}
total_items: {{completion.total_roadmap_items}}
in_progress: {{completion.in_progress_items}}
blocked: {{completion.blocked_items}}
awaiting_review: {{completion.awaiting_review_items}}
::

## Portfolio Snapshot

::metric_row
Total Projects: {{summary.total_projects}}
Open Items: {{completion.open_roadmap_items}}
Blocked Items: {{completion.blocked_items}}
Approval Backlog: {{summary.approval_backlog_count}}
::

## Active Projects

::portfolio_grid
{{#each activeProjects}}
- name: "{{project_name}}"
  project_id: "{{project_id}}"
  target: "{{$target}}"
  status: "{{$status}}"
  completion_pct: {{completion_pct}}
  done_items: {{done_items}}
  total_items: {{total_items}}
  active_item: "{{active_item_title}}"
  blockers: {{blocker_count}}
  last_run: "{{last_activity_at||last_updated_at}}"
{{/each}}
::
```

`{{field.nested}}` accesses nested objects. `{{a||b}}` is a fallback chain.
`{{$name}}` references a derived field defined in the contract (see below).

---

### 2. Data contract in `markdown-ui-elements.json`

Add a `transforms` section alongside the existing `routes`, `dataSources`, and `shell` sections.
Each transform declares: where to get data, how to shape it, and how to derive fields.

```json
"transforms": {
  "buildProjectPortfolioProjection": {
    "template": "operator.project_portfolio",
    "dataMap": {
      "completion": "portfolio_completion",
      "summary": "summary",
      "activeProjects": {
        "source": "projects",
        "filter": {
          "process_status": ["active", "completed"]
        }
      }
    },
    "derive": {
      "$status": {
        "rules": [
          { "if": { "process_status": "completed" },              "value": "completed" },
          { "if": { "active_item_status": "blocked" },            "value": "blocked" },
          { "if": { "blocker_count": { "gt": 0 } },              "value": "blocked" },
          { "if": { "process_status": "cancelled" },              "value": "inactive" },
          { "default": "active" }
        ]
      },
      "$target": {
        "template": "projection-detail.html?type=operator.project_detail&projectId={project_id|encode}",
        "fallback": "#"
      }
    }
  }
}
```

---

## Gap analysis: what needs to be built

### Gap 1: `{{#each}}` in `applyTemplate` — required

`applyTemplate()` today only handles flat `{{token}}` substitution using a regex replace.
It needs to support:

```
{{#each <collection>}}
  ...body with {{field}} tokens...
{{/each}}
```

Implementation: Before scalar substitution, match `{{#each name}}...{{/each}}` blocks.
For each item in the named collection, clone the body, substitute item fields, and join.

Estimated size: ~30 lines added to `applyTemplate()`.

### Gap 2: Dot-notation field access — required

`{{completion.completion_percentage}}` needs nested lookup.
Today's `applyTemplate` splits on `.` but only one level deep.
The token resolver needs to recurse: `tokens['completion']['completion_percentage']`.

Already partially present — extend to arbitrary depth.

Estimated size: ~5 lines change to the token resolver.

### Gap 3: Fallback chaining `{{a||b}}` — required

`{{last_activity_at||last_updated_at}}` must try the first field and fall back to the second
if the first is empty or missing.

Estimated size: ~10 lines added to the token resolver.

### Gap 4: `dataMap` application in the transform executor — required

`loadProjection()` in `projection-detail.js` calls `TRANSFORMS[def.transform](params, apiData)`.
Today the transform receives the raw API data and shapes it in JS.

With the contract, the executor needs to:
1. Read `def.dataMap` from the registry
2. Map `apiData` fields to named tokens (`completion`, `summary`, `activeProjects`)
3. Apply collection filters (`process_status: ["active", "completed"]`)
4. Pass the shaped token object to `applyTemplate()`

Estimated size: ~40 lines in a new `applyDataMap(apiData, dataMap)` utility.

### Gap 5: Derived field evaluation — required

`derive.$status.rules` is a priority-ordered rule chain.
Each rule has `if` (a field-value match) and `value` (the result).
`derive.$target.template` is a URL template with `{field|transform}` interpolation.

The evaluator needs to:
- Walk rules in order, evaluate the `if` condition against the current item, return `value` on first match
- Support `{ "gt": N }` comparisons (at minimum — no expression language needed beyond this)
- Apply `|encode` pipe to URL-encode field values

Estimated size: ~50 lines for a `evaluateDerived(item, deriveSpec)` utility.

### Gap 6: `$derive` fields injected into `{{#each}}` items — required

When iterating `{{#each activeProjects}}`, each item needs to have `$status` and `$target`
computed before the body template is applied. The executor computes derived fields per item
and merges them into the token object before substitution.

This is covered by Gap 5's utility — no separate work.

### Gap 7: `buildProjectPortfolioProjection` removed from JS — the payoff

Once the above gaps are closed, the entire transform reduces to:

```javascript
async buildProjectPortfolioProjection(params, apiData) {
  return applyContractTransform('buildProjectPortfolioProjection', params, apiData);
}
```

Or the transform can be eliminated entirely by having `loadProjection` call
`applyContractTransform` directly when `def.transforms` exists in the registry.

---

## What stays in JavaScript

| Concern | Stays in JS? | Why |
|---|---|---|
| Template loading (`fetch /fixtures/templates/...`) | Yes | I/O boundary |
| `applyTemplate()` — extended with loops + fallbacks | Yes | Execution engine |
| `applyDataMap()` — maps raw API response to tokens | Yes | Execution engine |
| `evaluateDerived()` — rule-chain evaluator | Yes | Execution engine |
| `callAiEngine()` / `loadProjection()` | Yes | Routing and API boundary |
| Document structure, section headings, block order | **No — moves to template** | |
| Field selection, filtering logic, status derivation | **No — moves to contract** | |
| URL construction, fallback chains | **No — moves to contract** | |

The JS becomes a pure runtime: it executes what the contract declares, with no portfolio-specific knowledge.

---

## Other transforms that benefit from the same work

Once Gaps 1–6 are closed, the following transforms can also be migrated:

| Transform | Currently in JS | Blocking gap |
|---|---|---|
| `buildProjectDetailProjection` | Template-based, near-done | Gap 2 (dot notation) |
| `buildRoadmapItemsProjection` | Inline string literal | Gap 1 (each), Gap 4 (dataMap) |
| `buildProjectStatusProjection` | Inline string literal | Gap 4 (dataMap), Gap 5 (derive) |
| `buildTaskProjection` | Template + SDK fetch | Stays hybrid (SDK branch too dynamic) |

---

## Recommended implementation order

1. **Gap 2** — dot-notation in token resolver (5 lines, zero risk, benefits everything)
2. **Gap 3** — fallback chaining (10 lines, zero risk)
3. **Gap 1** — `{{#each}}` in `applyTemplate` (30 lines, self-contained)
4. **Gap 4** — `applyDataMap` utility + route wiring (40 lines)
5. **Gap 5** — `evaluateDerived` utility (50 lines)
6. Write `operator.project_portfolio.md.tmpl` and add `transforms.buildProjectPortfolioProjection` to registry
7. Swap `buildProjectPortfolioProjection` to call `applyContractTransform` and delete the 100 lines of JS

Total estimated JS change: ~135 lines added, ~100 lines deleted.
The template and contract additions are pure declaration — no logic.
