# Projection Tree Taxonomy

Analysis of all projection tree nodes evaluated against five criteria:
**Accuracy** · **Relevance** · **Specificity** · **Realistic UI** · **Consistency**

Scale: High / Medium / Low / None  
Generated: 2026-05-05

---

## Live Projections (AI Engine)

### `operator.home`

| Criterion | Rating | Finding |
|---|---|---|
| Accuracy | High | Real SQL data: 25 active projects, 0 blocked, 16 needing governed attention |
| Relevance | High | Directly answers "what should I decide next" |
| Specificity | Medium | Priority projects table shows UUIDs as workflow IDs, not human-readable run names; no links to individual project surfaces |
| Realistic UI | Medium | Toolbar zones render; nav pills list "Roadmap / Promotions / Workflows / CI/CD / Memory / Evidence" as plain text — no `target` fields in the data so no hrefs are emitted |
| Consistency | Medium | Tree click loads it correctly; "Open project catalog" nav link resolves; but priority project rows are not clickable — dead end |

### `operator.project_catalog`

| Criterion | Rating | Finding |
|---|---|---|
| Accuracy | High | 58 real projects from SQL with full objectives |
| Relevance | High | Answers "what projects exist" comprehensively |
| Specificity | Low | Flat table — no per-row links to project detail, no drilldown path |
| Realistic UI | Medium | Table renders but is very wide; `::action` blocks (used for refresh CTA) have no renderer and fall through to "Unsupported block" |
| Consistency | Low | No path from catalog entry → project detail. The 58 projects are inert data. |

---

## Live Endpoints That Fail (fall back to fixture)

### `operator.project_roadmap`

| Criterion | Rating | Finding |
|---|---|---|
| Accuracy | Low | Live call fails: `invalid input syntax for type uuid: "ai-engine"` — SQL function expects a UUID, tree sends a slug |
| Relevance | High | Fixture structure answers "what should I care about right now" correctly |
| Specificity | Low | Fixture is hardcoded for ai-engine. Other projects would show ai-engine content. Live path is broken for all string-keyed project IDs. |
| Realistic UI | High | `::roadmap` block renders as a navigable list with status and progress |
| Consistency | Medium | Fixture fallback renders consistently; roadmap items link to correct `operator.roadmap_item` URLs |

### `operator.roadmap_item`

| Criterion | Rating | Finding |
|---|---|---|
| Accuracy | Low | Same UUID error — live endpoint broken for slug-based project IDs |
| Relevance | High | Fixture answers "what is being worked" with tasks, blockers, and focus |
| Specificity | Low | Fixture always shows "Generic Wrapper Runtime" regardless of `itemKey`. Clicking a different roadmap item shows the same content. |
| Realistic UI | High | `::task_list`, `::focus`, `::panel`, `::next_actions` all render cleanly |
| Consistency | Medium | Task links within the roadmap item drilldown to correct task detail URLs |

### `operator.evidence_packet`

| Criterion | Rating | Finding |
|---|---|---|
| Accuracy | Low | Live call returns `evidence_packet_not_found` for key "generic-wrapper-runtime" |
| Relevance | High | Fixture answers "why should I trust this" with structured checklist and drawer |
| Specificity | Low | Fixture is always the same generic-wrapper-runtime packet regardless of `evidencePacketKey` |
| Realistic UI | High | `::evidence_drawer`, `::checklist`, `::panel` all render |
| Consistency | Low | Evidence links from Roadmap Item always show the same fixture; individual promotion evidence links also land here |

---

## Fixture-Only Projections

### `operator.project_detail`

| Criterion | Rating | Finding |
|---|---|---|
| Accuracy | High | ✅ Fixed — calls `getPortfolioProject(projectId)` for live per-project data: completion %, active item, charter status, objective, owner |
| Relevance | High | Focus + open lanes + portfolio metrics + next actions fits the question |
| Specificity | High | ✅ Fixed — dynamic builder uses the real project UUID; each project shows its own title, objective, active item, and completion |
| Realistic UI | High | Breadcrumb, focus, nav lanes, metric_row, next_actions |
| Consistency | High | ✅ Fixed — any project node in the tree now loads its own correct detail |

### `operator.task_detail`

| Criterion | Rating | Finding |
|---|---|---|
| Accuracy | Medium | Hardcoded for "Replace Hard-coded Wrapper Scripts" task |
| Relevance | High | Checklist + blocker panel + evidence drawer answers "what needs to happen" |
| Specificity | Low | `taskKey` param is ignored — all 4 task nodes in the tree show identical "replace-hard-coded-scripts" content |
| Realistic UI | High | Best-structured fixture: checklist with statuses, blocker panel, evidence drawer |
| Consistency | Low | Tree has 4 tasks with distinct labels and statuses. All load the same blocked task detail. |

### `operator.subtask_detail`

| Criterion | Rating | Finding |
|---|---|---|
| Accuracy | High | Dynamically built in JS from `subtaskKey` param with 4 distinct records |
| Relevance | High | Answers "what is the next concrete step" per subtask |
| Specificity | High | Each subtask key maps to a unique title, status, and summary |
| Realistic UI | Medium | Breadcrumb + focus + panel + next_actions; simpler than other projections |
| Consistency | High | All 4 subtask tree nodes load the correct per-key content |

### `operator.promotions`

| Criterion | Rating | Finding |
|---|---|---|
| Accuracy | Medium | 6 promotions matching what the tree shows, but static |
| Relevance | High | Answers "what capabilities were promoted" with status |
| Specificity | Low | `projectId` and `promotionKey` params ignored — clicking any individual promotion node shows the full fixture list, not that promotion's detail |
| Realistic UI | High | `::promotion_list` renders cleanly as loga-list items |
| Consistency | Medium | Fixture renders; but individual promotion nodes in the tree navigate to a URL with `promotionKey` param that is ignored |

### `operator.workflow_runs` (list)

| Criterion | Rating | Finding |
|---|---|---|
| Accuracy | Medium | 3 plausible run entries matching tree's workflow run nodes |
| Relevance | High | Answers "what is currently running" |
| Specificity | Low | Doesn't filter by `projectId`; individual `operator.workflow_run` node links also fall back to this list fixture |
| Realistic UI | High | `::run_list`, focus, nav renders well |
| Consistency | Low | Individual workflow run nodes link to `?type=operator.workflow_run&workflowRunId=...` — no fixture exists for single runs, so the list is shown where a detail was expected |

### `operator.cicd_status`

| Criterion | Rating | Finding |
|---|---|---|
| Accuracy | Medium | 4 passing workflows matching the project's described stack |
| Relevance | High | Answers "is delivery healthy" |
| Specificity | Low | No live data; doesn't vary by project |
| Realistic UI | High | `::cicd_list` + focus + attention panel render cleanly |
| Consistency | High | Single leaf node in the tree, loads the projection once — no drilldown expected |

### `operator.agent_session`

| Criterion | Rating | Finding |
|---|---|---|
| Accuracy | Low | All IDs are placeholder literals (`claim-refactor-runtime-example`, `agent-session-example`) |
| Relevance | High | Memory, turn list, and current turn panel structure fits the question |
| Specificity | Low | One fixture for all params. Memory child nodes have no `contentHref` — clicking them does nothing. Turn nodes link to `?type=operator.agent_session&turn=N` but land on the same session view. |
| Realistic UI | Medium | `::memory` and `::turn_list` render; but turn list items have no meaningful drilldown |
| Consistency | Low | Memory nodes (wrapper-authority, no-local-scripts, sql-truth) are dead ends. Both Memory and DB Turns sub-groups point to the same `operator.agent_session` projection — no distinct sub-projections exist. |

---

## Issue Backlog

Ordered by impact. Issues marked **upstream** have remediation tickets filed in the AI Engine UX gate system.

| # | Issue | Affected Nodes | Impact | Status |
|---|---|---|---|---|
| 1 | Roadmap and roadmap_item live endpoints expect UUID not slug | project_roadmap, roadmap_item | Live data unreachable for all string-keyed projects | **upstream** `18dff230-c83a-4899-9323-31ecf4357b48` — pending |
| 2 | Project catalog rows are inert — no drilldown navigation | project_catalog | 58 projects visible but no path to detail | ✅ resolved — catalog now emits UUID-based nav links |
| 3 | Task detail ignores `taskKey` param | task_detail (4 nodes) | All tasks show same blocked-task content | ✅ fixed — dynamic builder in projection-detail.js per taskKey |
| 4 | Memory tree nodes have no `contentHref` | agent_session > Memory > 3 nodes | Dead-end clicks | ✅ fixed — nodes now link to agent session projection |
| 5 | Individual workflow run nodes fall back to the list | workflow_runs > 3 nodes | List shown where detail was expected | ✅ fixed — operator.workflow_run fixture + routing updated |
| 6 | `::action` block has no renderer | operator.home, project_catalog | Refresh CTAs silently fail | ✅ fixed — `::action` renderer added to primitives.js and browser.js |
| 7 | Home toolbar nav pills have no hrefs | operator.home toolbar | Navigation pill row renders but nothing is clickable | open — AI engine must add `target` fields to pill entries |
| 8 | Evidence packet live endpoint returns not-found | evidence_packet | Forces fixture fallback universally | **upstream** `9940be6c-864b-405f-8827-15f88d0988c0` · clarification `4f5a1937-d036-4229-a6ee-17ad1d510b64` — pending |
| 9 | No turn-scoped sub-projection type | agent_session > Turns > 3 nodes | Turn drilldown is structurally missing | ✅ fixed — dynamic turn projection builder per turn param |
| 10 | Promotions ignore `promotionKey` param | promotions > 6 nodes | All promotion nodes show the full list | ✅ fixed — dynamic promotion projection builder per promotionKey |

---

## Nodes in Good Shape

| Node | Strengths |
|---|---|
| `operator.home` | Live SQL data, good structure, mostly renders correctly |
| `operator.subtask_detail` | Most specific projection in the tree — dynamic, param-driven, correct per key |
| `operator.cicd_status` | Consistent single-leaf node, clean render |
| `operator.task_detail` | Best-structured fixture (checklist + blocker + evidence drawer) — just needs param-awareness |
