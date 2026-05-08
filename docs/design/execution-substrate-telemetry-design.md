# Execution Substrate Telemetry Design

## Why this design exists

The current cockpit renders execution telemetry but its information architecture
over-exposes identifiers and under-exposes operator insight. Raw GUIDs lead
every row, timestamps appear in UTC with no zone label, and the feed is sorted
oldest-first, forcing operators to scroll past history to see current state.

This document specifies:

- exactly what each SDK method returns and which fields matter
- how to normalize those fields into a stable taxonomy independent of the upstream projection shape
- how to sort, filter, and display records newest-first
- how to display timestamps in America/New_York with DST-correct zone labels
- how to hide identifiers behind semantic labels and expose them only in drill-down
- how to express iteration rules as declarative contracts rather than imperative loops
- how to own all display templates in this repo rather than relying on upstream projections

---

## Design principles

1. **Newest first.** All timelines and feeds default to descending time order. The most
   recent signal is always visible without scrolling.

2. **Operator meaning over raw IDs.** Status, objective, action, and labels should
   be prominent. GUIDs and raw keys are secondary metadata, visible only in drill-down.

3. **Declarative iteration.** List rendering is driven by filter-and-sort contracts
   defined in YAML. No hard-coded imperative sort/filter logic in templates.

4. **One time standard.** Every visible timestamp renders in America/New_York with
   the DST-aware abbreviation (EDT / EST). Relative age may supplement but never
   replace the absolute timestamp.

5. **Structured drill-down.** Three view layers answer distinct operator questions:
   - Command deck → Is execution healthy right now?
   - Event stream → What happened most recently and in what order?
   - Detail panel → What exactly occurred at this moment?

6. **Owned contracts.** All markdown templates and field bindings live in this repo.
   Upstream projection shape changes do not break our display layer.

---

## What the SDK can truly provide

The following describes each method, its filter surface, and which fields carry
operator-meaningful information versus which are pure identifiers.

### getLatestMemoryProjection()

**Purpose.** Real-time snapshot of the agent's current state — the "what is
happening right now" signal. This is the fastest path to the operator summary
and recommended next action.

**Returns (meaningful fields):**

```
summary.session_status         — running | completed | failed | paused
summary.session_key            — human-readable key (e.g. active-6285-463a-b81e)
summary.operator_summary       — plain-language status narrative
summary.next_action            — recommended operator action
summary.updated_at             — ISO8601 of last session update

workflow_run_id                — links to substrate
workflow_run_status            — status of the parent run
latest_turn_completed_at       — when the most recent turn finished
latest_tool_event_kind         — type of the last tool call (read_file, bash, etc.)
latest_tool_name               — name of that tool

operator_handoff.operator_summary   — narrative for handoff
operator_handoff.next_action        — next action at handoff point

execution_context_posture.open_gap_count  — number of unresolved execution gaps

current_objective              — what the agent is currently trying to accomplish
status_headline                — one-line status label
projected_at                   — when this projection was generated
```

**Identifiers (shown only in drill-down):**

```
summary.agent_session_id       — UUID
summary.workflow_run_id        — UUID
```

**Filter surface:** None. Always returns latest. Use stored session ID only to
correlate with substrate calls.

---

### getExecutionTelemetryCurrent()

**Purpose.** Immediate process health counters. Answers: are processes running,
failing, or idle?

**Returns (meaningful fields):**

```
status                         — running | completed | idle | error
last_observed_at               — ISO8601 of last observation
active_process_count           — processes currently executing
failed_process_count           — processes that failed (friction metric)
recent_process_count           — processes in the recent window
```

**Filter surface:** None. Returns the current moment only.

**Operator use:** Surface `status`, `active_process_count`, and `failed_process_count`
in the command deck. Map `failed_process_count` to "Friction" with a severity color.

---

### listExecutionProcessRuns({ limit, artifactKind, status, since, before? })

**Purpose.** The primary server-side–filtered list of execution runs. This is the
most powerful filter surface in the SDK and is currently underutilized.

**Filter parameters:**

```
limit          — integer, max rows to return
artifactKind   — filter to a specific artifact domain
                 known values: shell_command, git_operation, test_run,
                               projection_generation, verification_retry,
                               remote_publish, context_fragment, workflow_turn
status         — filter by run outcome
                 known values: running, completed, failed, skipped, retried
since          — ISO8601 lower bound on start time (server-side time filter)
before         — ISO8601 upper bound on start time (pagination cursor)
                 COMPATIBILITY NOTE: presence of this parameter in the SDK is
                 unconfirmed at design time. Verify against the live SDK before
                 implementing pagination. See fallback strategy below.
```

**Pagination compatibility note.**

The `before` cursor is the preferred pagination approach because it is stable
under concurrent inserts. However, it must be verified that the SDK accepts this
parameter before it is used in production code.

If `before` is **not supported** by the SDK, use this confirmed fallback:

```
Fallback strategy: fetch a larger limit (e.g., 200) on the first load.
Client-side slice the result into pages of 30 for display.
"Load more" advances the client-side slice pointer — no additional server call.
This trades request size for confirmed compatibility and avoids the cursor
dependency entirely. Reassess when the SDK surface is fully documented.
```

Whichever strategy is used, the design does not change: events are sorted
descending by `started_at`, and appended pages show older events.

**Returns per run (meaningful fields):**

```
process_run_id                 — stable ID for drill-down (not shown in list)
workflow_run_id                — parent run reference
artifact_kind                  — domain category of this run
status                         — outcome
started_at                     — ISO8601 start time
completed_at                   — ISO8601 completion time
duration_ms                    — elapsed time in milliseconds
objective                      — what this run was trying to do
summary_text                   — plain-language result narrative
actor_label                    — which component executed this
workflow_stage                 — stage name within the workflow
```

**Normalized to ExecutionRun record (see taxonomy).**

**Operator use:** Feed the event stream. The `since` filter enables time-range
presets (15m, 1h, 6h, 24h) without client-side date math on the full dataset.

---

### getExecutionProcessRun(processRunId)

**Purpose.** Full details for a selected run. Used in the detail panel only.

**Returns (in addition to list fields):**

```
command_text                   — the actual shell command or tool call
output_text                    — stdout / result content
error_text                     — error output if failed
retry_count                    — number of retries before this outcome
retry_reason                   — why retries were triggered
context_summary                — context state at time of execution
metadata                       — raw structured metadata (shown collapsed)
```

---

### getWorkflowRunSubstrate(workflowRunId)

**Purpose.** Full substrate for a workflow run. Returns conversation context history
and recent activity log. This is the richest single payload in the SDK.

**Returns:**

**telemetry block:**

```
status                         — current substrate status
last_observed_at               — ISO8601
active_process_count           — live count
failed_process_count           — failure count
recent_process_count           — activity count
```

**context_fragments[] (conversation history):**

```
context_fragment_id            — identifier (drill-down only)
fragment_type                  — system | user | assistant | tool_result | tool_call
fragment_role                  — role in conversation turn
content_text                   — the actual text content
created_at                     — ISO8601
metadata.agent_turn_id         — which turn
metadata.status_headline       — one-line status for that fragment
metadata.source_ref            — source reference label
```

**recent_activity[] (execution log):**

```
agent_turn_id                  — identifier (drill-down only)
workflow_artifact_id           — identifier (drill-down only)
tool_name                      — which tool was called
model_name                     — which model was used
workflow_stage                 — stage in the execution pipeline
summary_text                   — what happened in plain language
created_at                     — ISO8601
```

**Normalization strategy:**
- context_fragments → ActivityEvent with domainObjectType = `context_fragment`
- recent_activity → ActivityEvent with domainObjectType = `workflow_turn`
- Map fragment_type and tool_name to execution type labels (see event type map)

---

### getSessionPerformanceMetrics({ workflowRunId, sessionId, clientType })

**Purpose.** Session-level status and metadata. Used to resolve the current session
from a stored ID or workflow run ID.

**Returns per session (meaningful fields):**

```
agent_session_id               — identifier (drill-down only)
session_key                    — human-readable key, show this
session_status                 — running | completed | paused | failed
workflow_run_id                — parent run
session_updated_at             — ISO8601 of last activity
```

**Operator use:** Populate the session section in command deck. Always display
`session_key` as the primary label; collapse `agent_session_id` to drill-down.

---

### listPromotionCandidates({ workflowRunId, learningCategory, promotionReadiness, limit })

**Purpose.** Candidates queued for promotion. The filter surface enables
category- and readiness-specific views.

**Filter parameters:**

```
workflowRunId       — scope to a specific run
learningCategory    — filter by learning domain
                      known values: capability, pattern, constraint, heuristic
promotionReadiness  — filter by readiness level
                      known values: draft, ready, validated, promoted
limit               — max rows
```

**Returns per candidate (meaningful fields):**

```
candidate_key                  — identifier (drill-down only)
workflow_run_id                — parent run
learning_category              — domain category
promotion_readiness            — readiness level
target_type                    — what type of object is being promoted
signal_summary                 — plain-language description of the signal
created_at                     — ISO8601
```

**Normalized to PromotionInsight record (see taxonomy).**

---

### listWorkflowCandidates({ limit })

**Purpose.** Fallback when listPromotionCandidates scoped to a run returns nothing.
Returns workflow-level candidates without run scoping.

**Returns:** Same shape as listPromotionCandidates items.

---

## Unified telemetry taxonomy

Normalize all upstream payloads into these canonical records. Templates bind to
normalized records only — never directly to raw API shapes.

### ExecutionRun

```
runId              string   — internal reference, drill-down only
workflowRunId      string   — parent run, drill-down only
executionType      string   — normalized type label (see event type map)
domainObjectType   string   — normalized domain category
status             string   — running | completed | failed | skipped | retried
startedAtUtc       string   — ISO8601, store UTC
completedAtUtc     string   — ISO8601, store UTC (null if running)
durationMs         number   — elapsed time
durationLabel      string   — derived: "1.2s", "340ms", "2m 14s"
objective          string   — what this run was trying to do
summary            string   — plain-language outcome
actorLabel         string   — which component (derived from actor_label or tool_name)
sourceSurface      string   — workflow_stage normalized label
```

### SessionSignal

```
sessionId          string   — internal reference, drill-down only
sessionKey         string   — human-readable label, show prominently
workflowRunId      string   — internal reference, drill-down only
telemetryStatus    string   — running | completed | idle | error
heartbeatAtUtc     string   — ISO8601 of last heartbeat
activeProcessCount number
failedProcessCount number
recentProcessCount number
frictionCount      number   — alias of failedProcessCount for display
openGapCount       number   — from execution_context_posture
operatorSummary    string   — narrative from memory projection
nextAction         string   — recommended next action
currentObjective   string   — active objective
```

### ActivityEvent

```
eventId            string   — internal reference, drill-down only
eventType          string   — normalized type label (see event type map)
domainObjectType   string   — context_fragment | workflow_turn | process_run | session
occurredAtUtc      string   — ISO8601, store UTC
status             string   — ok | error | running | skipped
title              string   — semantic label derived from content (never raw ID)
summary            string   — content_text or summary_text
actorLabel         string   — tool_name | model_name | fragment_role
sourceSurface      string   — workflow_stage or fragment_type
workflowRunId      string   — drill-down only
sessionId          string   — drill-down only
rawMetadata        object   — full upstream record, shown collapsed
```

### PromotionInsight

```
candidateKey       string   — drill-down only
workflowRunId      string   — drill-down only
learningCategory   string   — capability | pattern | constraint | heuristic
promotionReadiness string   — draft | ready | validated | promoted
targetType         string   — what is being promoted
signalSummary      string   — plain-language signal description
occurredAtUtc      string   — ISO8601 created_at
```

---

## Event type map

Map upstream raw type identifiers to operator-readable labels.
The label is what appears in the stream. The raw type goes into drill-down metadata.

| Raw type / tool name                | Execution type label       | Domain object type     |
|-------------------------------------|----------------------------|------------------------|
| monitor_heartbeat                   | Heartbeat                  | session                |
| process_started                     | Process started            | process_run            |
| process_completed                   | Process completed          | process_run            |
| shell_command_observed              | Shell command              | process_run            |
| git_operation_observed              | Git operation              | process_run            |
| test_run_observed                   | Test run                   | process_run            |
| projection_generation_observed      | Projection generated       | workflow_turn          |
| verification_retry_observed         | Verification retry         | process_run            |
| remote_publish_failed               | Remote publish failed      | process_run            |
| execution_telemetry_current         | Telemetry snapshot         | session                |
| context_fragment / system           | System context             | context_fragment       |
| context_fragment / user             | User turn                  | context_fragment       |
| context_fragment / assistant        | Assistant turn             | context_fragment       |
| context_fragment / tool_call        | Tool call                  | context_fragment       |
| context_fragment / tool_result      | Tool result                | context_fragment       |
| recent_activity (any tool_name)     | Tool: {tool_name}          | workflow_turn          |
| read_file                           | File read                  | workflow_turn          |
| bash                                | Shell execution            | workflow_turn          |
| write_to_file                       | File write                 | workflow_turn          |
| search_files                        | File search                | workflow_turn          |
| computer_use                        | Computer use               | workflow_turn          |

For any unrecognized type, derive label as: capitalize first word, replace underscores with spaces.

---

## Display model

### Layer 1 — Command deck (top summary)

**Primary operator question:** Is execution healthy right now?

**Layout:** Two rows of metrics, then a next-action panel.

**Row 1 — Runtime health:**

| Label               | Source field                                      | Display rule                          |
|---------------------|---------------------------------------------------|---------------------------------------|
| Status              | sessionSignal.telemetryStatus                     | Status badge with color               |
| Last heartbeat      | sessionSignal.heartbeatAtUtc                      | ET timestamp + relative age           |
| Active processes    | sessionSignal.activeProcessCount                  | Number, green if > 0                  |
| Friction            | sessionSignal.frictionCount                       | Number, red if > 0                    |

**Row 2 — Execution posture:**

| Label               | Source field                                      | Display rule                          |
|---------------------|---------------------------------------------------|---------------------------------------|
| Open gaps           | sessionSignal.openGapCount                        | Number, amber if > 0                  |
| Promotion queue     | count of promotionInsights                        | Number                                |
| Current objective   | sessionSignal.currentObjective                    | Truncated text, max 120 chars         |
| Session             | sessionSignal.sessionKey                          | Human key label (not UUID)            |

**Next action panel:**

- Title: sessionSignal.nextAction
- Body: sessionSignal.operatorSummary
- Status badge: sessionSignal.telemetryStatus

---

### Layer 2 — Event stream (newest first)

**Primary operator question:** What happened most recently, and in what order?

**Default sort:** descending by occurredAtUtc.

**Default page size:** 30 rows. "Load more" fetches the next window using
time-window pagination: the oldest visible event's `occurredAtUtc` becomes the
`before` cursor for the next call. This avoids offset drift when new events
arrive between pages.

**Columns:**

| Column              | Source field                  | Width    | Notes                               |
|---------------------|-------------------------------|----------|-------------------------------------|
| Time (ET)           | occurredAtUtc → ET            | 180px    | Full timestamp, no truncation       |
| Type                | eventType label               | chip     | Color-coded by domain object type   |
| Domain              | domainObjectType label        | chip     | Secondary type chip                 |
| Status              | status badge                  | 80px     | Color by outcome                    |
| Title               | title (semantic)              | flex     | Never a raw ID                      |
| Summary             | summary (truncated 200 chars) | flex     | Muted, expandable                   |

**Row interaction:** Click row → expand detail panel inline or push to detail view.

**Empty state:** "No execution telemetry events were found for this scope and filter."

---

### Layer 3 — Detail panel

**Primary operator question:** What exactly happened at this moment?

**Sections:**

1. **Header**
   - Title (semantic)
   - Status badge
   - Time (ET, full format)
   - Type chip + Domain chip

2. **Narrative**
   - summary (full text, not truncated)
   - objective (from ExecutionRun.objective if available)

3. **Context**
   - Actor: actorLabel
   - Surface: sourceSurface
   - Session: sessionKey (human label)
   - Workflow run: workflowRunId last 8 chars + "..." prefix to indicate truncation

4. **Duration** (if ExecutionRun)
   - durationLabel
   - retry count if > 0

5. **Raw metadata** (collapsed `<details>` section)
   - Full upstream record as formatted JSON
   - Includes all IDs, raw field names

---

## Filter model

### Server-side filters (pass to SDK methods)

These filters are sent to the server before any normalization. Omit a parameter
entirely if the user has not selected a value for it — do not send empty strings
or null.

| Filter key       | SDK parameter          | Method                     | Cardinality  |
|------------------|------------------------|----------------------------|--------------|
| artifactKind     | artifactKind           | listExecutionProcessRuns   | single value |
| status (single)  | status                 | listExecutionProcessRuns   | single value |
| since            | since (ISO8601)        | listExecutionProcessRuns   | single value |
| before           | before (ISO8601)       | listExecutionProcessRuns   | single value (pagination cursor) |
| learningCategory | learningCategory       | listPromotionCandidates    | single value |
| promotionReady   | promotionReadiness     | listPromotionCandidates    | single value |

**Status filter cardinality rule.** The server `status` param accepts a single
value. Multi-select behavior is handled as follows:

- 0 statuses selected → omit `status` from server call; no status filter applied
- 1 status selected → pass directly as the server `status` param
- 2+ statuses selected → omit `status` from server call; apply multi-select filter
  client-side after normalization

This avoids sending unsupported multi-value syntax to the server.

**Known enum values are not exhaustive.** The listed values are observed at
design time. The server may add new values at any time. See the unknown-value
fallback rules in the Query Mechanics section.

### Client-side filters (applied after normalization)

These filters are applied to the merged, normalized record set.

| Filter key       | Normalized field       | Type              | Notes                          |
|------------------|------------------------|-------------------|--------------------------------|
| executionType    | eventType              | multi-select      | Populated dynamically from data|
| domainObjectType | domainObjectType       | multi-select      | Populated dynamically from data|
| status           | status                 | multi-select      | Active when 2+ statuses chosen |
| actorLabel       | actorLabel             | multi-select      | Populated dynamically from data|
| workflowRunId    | workflowRunId          | single-select     |                                |
| sessionId        | sessionId              | single-select     |                                |
| timeRange        | occurredAtUtc          | preset select     | Gates ALL sources (see below)  |

**Time range gates all sources.** After merging primary and supplement results,
apply a client-side `occurredAtUtc >= since` filter to every normalized event.
This prevents supplement source events (substrate fragments, recent activity)
from leaking records outside the selected time window, since those calls do not
accept a `since` parameter.

### Time range presets

| Label   | since value                          |
|---------|--------------------------------------|
| 15m     | now − 15 minutes                     |
| 1h      | now − 1 hour                         |
| 6h      | now − 6 hours                        |
| 24h     | now − 24 hours                       |
| All     | no since filter (server default)     |

### Filter UX

- Active filters shown as dismissible chips below the filter bar.
- Multi-select dropdowns for categorical fields.
- Time range as a button group (15m · 1h · 6h · 24h · All).
- "Clear all" resets all filters to defaults.
- Filter state persisted in URL params or localStorage.

---

## Query mechanics

This section defines the exact runtime behavior for the stream contract: how
pagination works, how multi-select filters map to server params, how sources
are merged and deduplicated, and how unknown enum values are handled.

### Pagination: time-window, not offset

"Load more" uses a `before` cursor, not a numeric offset.

```
First load:
  listExecutionProcessRuns({ limit: 30, since, ...otherFilters })
  → returns events [E1 ... E30] sorted desc by started_at
  → record oldestSeenTimestamp = E30.occurredAtUtc

"Load more" click:
  listExecutionProcessRuns({ limit: 30, since, before: oldestSeenTimestamp, ...otherFilters })
  → returns events [E31 ... E60]
  → append to list, update oldestSeenTimestamp = E60.occurredAtUtc
```

Why: offset pagination returns duplicates or skips records when new events
arrive between pages. Time-window pagination is deterministic — "everything
before timestamp X" does not shift.

Supplement sources (substrate fragments and recent activity) are fetched once
on the first page load only. They are not re-fetched on "Load more" because
they represent a fixed historical set for the current workflow run.

### Polling vs pagination: two distinct operations

These are separate behaviors and must not be conflated.

**Polling (timer refresh, manual refresh):**
- Re-fetches all sources: primary (`listExecutionProcessRuns`) and all supplements
  (`getWorkflowRunSubstrate` context_fragments + recent_activity)
- Resets the view to the current top-30 window (does not accumulate previous pages)
- Updates the command deck, session signal, and promotion count
- Supplement re-fetch is required so new context fragments and activity during a
  long-running session are visible without reloading the page

**Pagination ("Load more" click):**
- Extends only the primary source using the `before` cursor (or client-side slice
  if cursor is unsupported)
- Does NOT re-fetch supplement sources — they represent the fixed historical
  substrate of the current workflow run up to the current poll cycle
- Appends older records below the existing visible list
- Does NOT reset the command deck or session signal

**Implementation boundary:**

```
onTimerFire() or onManualRefresh():
  resetPaginationState()       // clear before cursor, reset to page 1
  fetchAllSources()            // primary + supplement
  replaceCurrentView()         // new top-30 replaces old

onLoadMoreClick():
  fetchPrimaryWithCursor()     // before = oldestSeenTimestamp
  appendToCurrentView()        // appended below existing rows
  // supplement NOT fetched
```

### Multi-select status filter

The server `status` param accepts a single string. To support multi-select in
the UI without multiple parallel requests:

```
filters.status_server = (filters.status.length === 1) ? filters.status[0] : undefined
filters.status_client = (filters.status.length >= 2) ? filters.status : []
```

When 2+ statuses are selected, the server call is made without a status param
(returns all statuses for the window), and the client-side filter narrows the
result. This trades one extra network response for simplicity of a single call.

### Step order: normalize → merge → time gate → dedupe → client filters → sort

This ordering is not arbitrary. The time gate must run before dedupe, not after.

**Why order matters:** If a primary source event falls outside the selected time
window and a supplement event with the same dedupe key falls inside it, running
dedupe first causes the primary to win the key. The time gate then removes the
primary (out of window) — but the supplement was already evicted by the dedupe
step. The result is no event in the output, even though a valid in-window event
existed. Gating first removes the out-of-window primary before dedupe runs, so
the supplement survives.

### Time gate (step 3, after merge, before dedupe)

```javascript
function applyTimeGate(events, since) {
  if (!since) return events;  // no gate if timeRange = "All"
  return events.filter(e => e.occurredAtUtc >= since);
}
```

Applied to the merged array (primary + supplement) before any dedupe or client
filter. Supplement source events (context_fragments, recent_activity) do not
accept a `since` server parameter, so this client-side gate is their only time
constraint.

### Merge and deduplicate (step 4, after time gate)

Merge order: primary source events first, supplement events appended.

Dedupe key resolution for each event:

```javascript
function dedupeKey(event) {
  if (event.eventId) return event.eventId;
  return `${event.occurredAtUtc}:${event.executionType}:${event.actorLabel}`;
}
```

Build a `Map<string, ActivityEvent>`. Iterate primary source first — keys are
set. Iterate supplement — skip any key that already exists. Primary wins on
collision. Because the time gate already ran, both primary and supplement events
in this step are guaranteed to be within the selected window.

### Unknown enum values

The listed `artifactKind`, `status`, `learningCategory`, and `promotionReadiness`
values are observed at design time and are not exhaustive. Runtime behavior:

**Server params:** If the user selects a value not in the known list, still pass
it to the server. The server may accept newer values we don't know about yet.
Only omit a param if the value is empty.

**Filter chip options:** Populate dynamically from the unique values observed in
the current result set, not from a hardcoded list. This means new enum values
the server returns automatically appear as filter options.

**Display chips (eventType, domainObjectType):** If a value has no entry in the
event type map, apply the fallback transform:

```javascript
function eventTypeLabel(rawType) {
  return EVENT_TYPE_MAP[rawType]
    ?? rawType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
```

This renders `new_unknown_type` as `New Unknown Type` — readable without
crashing or showing a blank chip.

---

## Declarative iterator contracts

The stream view consumes a declarative query contract before rendering any list.
This keeps sort and filter rules explicit, testable, and separate from template markup.

### Contract: execution.telemetry.stream.v1

```yaml
contract: execution.telemetry.stream.v1
description: "Main execution event stream — newest first with optional filters"

source:
  primary:
    method: listExecutionProcessRuns
    args:
      limit: 30
      artifactKind: ${filters.artifactKind}         # omit if unset
      status: ${filters.status_server}              # single value only; omit if 0 or 2+ selected
      since: ${filters.since}                       # ISO8601 from timeRange preset; omit for "All"
      before: ${pagination.oldestSeenTimestamp}     # ISO8601 cursor; omit on first load
  supplement:
    - method: getWorkflowRunSubstrate
      args:
        workflowRunId: ${workflowRunId}
      extract:
        - path: context_fragments
          normalize: ActivityEvent
          domainObjectType: context_fragment
        - path: recent_activity
          normalize: ActivityEvent
          domainObjectType: workflow_turn
      # refresh: every_cycle — supplement is re-fetched on every timer-triggered
      # or manual refresh so new context fragments and activity are picked up.
      # paginate: first_only — "Load more" clicks do NOT re-fetch the supplement.
      # Load more only extends the primary source window backward in time.
      refresh: every_cycle
      paginate: first_only

normalize: ActivityEvent

# Step order: normalize → merge → time_gate → dedupe → client_filters → sort
# Time gate must precede dedupe. If a primary event falls outside the window but
# a supplement event with the same dedupe key falls inside, deduping first (primary
# wins) then time-gating removes the primary — leaving nothing. Gating first
# removes the out-of-window primary, so the supplement event survives dedupe.

time_gate:
  field: occurredAtUtc
  operator: gte
  value: ${filters.since}     # applied to ALL sources; omit entire step if filters.since is unset

dedupe:
  # Apply after time gate, before client filters.
  # Primary source records take precedence over supplement records.
  key:
    primary: eventId                               # use if non-empty
    fallback: "${occurredAtUtc}:${executionType}:${actorLabel}"
  precedence: primary_over_supplement

client_filters:
  - field: executionType
    operator: in
    value: ${filters.executionType}                # empty array = no filter
  - field: domainObjectType
    operator: in
    value: ${filters.domainObjectType}
  - field: status
    operator: in
    value: ${filters.status_client}                # active when 2+ statuses chosen
  - field: actorLabel
    operator: in
    value: ${filters.actorLabel}

sort:
  - field: occurredAtUtc
    direction: desc

paginate:
  preferred:
    strategy: time_window     # "Load more" passes before=oldestSeenTimestamp to server
    size: 30
    cursor_field: occurredAtUtc
    append: true
  fallback:
    strategy: client_slice    # used if server does not accept the before param
    fetch_limit: 200          # fetch 200 on first load; no further server calls for Load more
    slice_size: 30            # client advances a slice pointer per Load more click
    append: true
  selection: cursor_detected  # runtime: choose preferred if before param is supported

render:
  emptyMessage: "No execution telemetry events were found for this scope."
  timestamp:
    field: occurredAtUtc
    timezone: America/New_York
    format: "MMM dd, yyyy hh:mm:ss a z"
  titleField: title
  summaryField: summary
  typeChipField: eventType
  domainChipField: domainObjectType
  statusField: status
  idFields:
    - eventId
    - workflowRunId
    - sessionId
```

### Contract: execution.telemetry.promotions.v1

```yaml
contract: execution.telemetry.promotions.v1
description: "Promotion candidates for the current workflow run"

source:
  primary:
    method: listPromotionCandidates
    args:
      workflowRunId: ${workflowRunId}
      learningCategory: ${filters.learningCategory}
      promotionReadiness: ${filters.promotionReadiness}
      limit: 25
  fallback:
    method: listWorkflowCandidates
    args:
      limit: 25
    condition: primary_empty

normalize: PromotionInsight

sort:
  - field: occurredAtUtc
    direction: desc

render:
  emptyMessage: "No promotion candidates found for this workflow run."
  timestamp:
    field: occurredAtUtc
    timezone: America/New_York
    format: "MMM dd, yyyy hh:mm:ss a z"
  titleField: signalSummary
  typeChipField: learningCategory
  statusField: promotionReadiness
```

---

## In-repo markdown template specifications

The following specifies the content and field bindings for each owned template.
Templates live at `fixtures/templates/`. They bind only to normalized record fields.

### operator.execution_telemetry_dashboard.md.tmpl

```markdown
---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.execution_telemetry_dashboard"
projection_id: "execution-telemetry:{{workflowRunId}}"
source_truth: "sdk"
primary_question: "What is the execution substrate doing right now?"
workspace_mode: "focus"
active_surfaces: "execution,session,events,promotions"
surface_label: "Execution Telemetry Dashboard"
iterator_contract: "execution.telemetry.stream.v1"
---

# Execution Substrate Cockpit

::focus
question: "What is the execution substrate doing right now?"
answer: "{{sessionSignal.operatorSummary}}"
status: "{{sessionSignal.telemetryStatus}}"
::

## Runtime Health

::metric_row
items:
- label: "Status"
  value: "{{sessionSignal.telemetryStatus}}"
- label: "Last heartbeat (New York)"
  value: "{{sessionSignal.heartbeatAtEt}}"
- label: "Active processes"
  value: "{{sessionSignal.activeProcessCount}}"
- label: "Friction"
  value: "{{sessionSignal.frictionCount}}"
::

## Execution Posture

::metric_row
items:
- label: "Open gaps"
  value: "{{sessionSignal.openGapCount}}"
- label: "Promotion queue"
  value: "{{promotionInsights.count}}"
- label: "Session"
  value: "{{sessionSignal.sessionKey}}"
- label: "Objective"
  value: "{{sessionSignal.currentObjective}}"
::

## Recommended Next Action

::panel
title: "{{sessionSignal.nextAction}}"
status: "{{sessionSignal.telemetryStatus}}"
summary: "{{sessionSignal.operatorSummary}}"
::

## Recent Execution Events

::table
columns: "time_et,execution_type,domain_object_type,status,title,summary"
sort: "time_et:desc"
rows_source: "executionEventRows"
empty_message: "No execution telemetry events were found for this scope."
::

## Context Links

::nav
- label: "Full Event Stream"
  target: "operator.execution_telemetry_event_stream"
  projection_type: "operator.execution_telemetry_event_stream"
- label: "Session Metrics"
  target: "operator.agent_session"
  projection_type: "operator.agent_session"
- label: "Promotions"
  target: "operator.promotions"
  projection_type: "operator.promotions"
::
```

### operator.execution_telemetry_event_stream.md.tmpl

```markdown
---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.execution_telemetry_event_stream"
projection_id: "execution-telemetry-stream:{{workflowRunId}}"
source_truth: "sdk"
primary_question: "What happened most recently in execution?"
workspace_mode: "focus"
active_surfaces: "events,filters,detail"
surface_label: "Execution Event Stream"
iterator_contract: "execution.telemetry.stream.v1"
---

# Execution Event Stream

::focus
question: "What happened most recently in execution?"
answer: "{{streamSummary}}"
status: "{{streamStatus}}"
::

## Filters

::filters
- key: "executionType"
  label: "Execution type"
  value: "{{filters.executionType}}"
  multiSelect: true
- key: "domainObjectType"
  label: "Domain"
  value: "{{filters.domainObjectType}}"
  multiSelect: true
- key: "status"
  label: "Status"
  value: "{{filters.status}}"
  multiSelect: true
- key: "timeRange"
  label: "Time range"
  value: "{{filters.timeRange}}"
  options: ["15m", "1h", "6h", "24h", "All"]
::

## Events (Newest First)

::table
columns: "time_et,title,execution_type,domain_object_type,status,summary"
sort: "time_et:desc"
rows_source: "eventRows"
page_size: 30
load_more: true
empty_message: "No events match the current filters."
::

## Selected Event

::panel
title: "{{selectedEvent.title}}"
status: "{{selectedEvent.status}}"
summary: "{{selectedEvent.summary}}"
::

- Time (New York): {{selectedEvent.occurredAtEt}}
- Execution type: {{selectedEvent.executionType}}
- Domain: {{selectedEvent.domainObjectType}}
- Actor: {{selectedEvent.actorLabel}}
- Surface: {{selectedEvent.sourceSurface}}
- Session: {{selectedEvent.sessionKey}}

{{#if selectedEvent.durationLabel}}
- Duration: {{selectedEvent.durationLabel}}
{{/if}}

{{#if selectedEvent.retryCount}}
- Retries: {{selectedEvent.retryCount}}
{{/if}}

<details>
<summary>Raw metadata</summary>

::code
language: "json"
content: "{{selectedEvent.rawMetadataJson}}"
::

</details>
```

---

## GUID hiding rules

### What is never shown in list or summary views

- agent_session_id (UUID)
- workflow_run_id (UUID)
- process_run_id (UUID)
- context_fragment_id (UUID)
- agent_turn_id (UUID)
- workflow_artifact_id (UUID)
- candidate_key (UUID)

### What is shown instead

| Hidden field         | Shown instead                                          |
|----------------------|--------------------------------------------------------|
| agent_session_id     | session_key (e.g. active-6285-463a-b81e)               |
| workflow_run_id      | Last 8 chars prefixed with "Run …" in detail           |
| process_run_id       | derived title from objective or artifact_kind label    |
| context_fragment_id  | fragment_role + created_at time                        |
| agent_turn_id        | "Turn" + tool_name + created_at time                  |
| candidate_key        | learning_category + promotion_readiness label          |

### Where IDs are exposed

Only in the raw metadata `<details>` section at the bottom of the detail panel.
Formatted as JSON, labeled clearly as "Raw metadata."

---

## Time standard

- **Store:** UTC in all normalized records (occurredAtUtc, heartbeatAtUtc, etc.)
- **Compare:** UTC for sort and filter operations
- **Display:** America/New_York with DST-aware abbreviation from Intl.DateTimeFormat
- **Format:** `MMM dd, yyyy hh:mm:ss a z` — example: `May 08, 2026 02:14:33 PM EDT`
- **Relative age:** Allowed as supplement (e.g. "14m ago"), but absolute timestamp
  must always be visible alongside it
- **Never:** display a raw ISO8601 string or UTC timestamp on a primary surface

### Formatter reference

```javascript
const NEW_YORK = 'America/New_York';

function formatEt(isoString) {
  const ms = Date.parse(String(isoString ?? ''));
  if (!Number.isFinite(ms)) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: NEW_YORK,
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(ms);
}
```

---

## Normalization layer specification

### Normalizing ActivityEvent from context_fragments

```javascript
function normalizeContextFragment(fragment) {
  const role = cleanText(fragment.fragment_role || fragment.fragment_type || '');
  const typeKey = `context_fragment/${role}` || 'context_fragment';
  return {
    eventId: fragment.context_fragment_id || fragment.metadata?.agent_turn_id || '',
    eventType: eventTypeLabel(typeKey),
    domainObjectType: 'context_fragment',
    occurredAtUtc: fragment.created_at || '',
    status: 'ok',
    title: deriveFragmentTitle(fragment),
    summary: fragment.content_text || fragment.metadata?.status_headline || '',
    actorLabel: role || 'system',
    sourceSurface: fragment.fragment_type || '',
    workflowRunId: '',
    sessionId: fragment.metadata?.agent_turn_id || '',
    rawMetadata: fragment,
  };
}

function deriveFragmentTitle(fragment) {
  const role = cleanText(fragment.fragment_role || '');
  const headline = cleanText(fragment.metadata?.status_headline || '');
  const source = cleanText(fragment.metadata?.source_ref || '');
  if (headline) return headline;
  if (source) return source;
  if (role) return `${capitalize(role)} turn`;
  return 'Context fragment';
}
```

### Normalizing ActivityEvent from recent_activity

```javascript
function normalizeRecentActivity(entry) {
  const tool = cleanText(entry.tool_name || '');
  return {
    eventId: entry.agent_turn_id || entry.workflow_artifact_id || '',
    eventType: eventTypeLabel(tool) || 'workflow_turn',
    domainObjectType: 'workflow_turn',
    occurredAtUtc: entry.created_at || '',
    status: 'ok',
    title: deriveActivityTitle(entry),
    summary: entry.summary_text || '',
    actorLabel: tool || entry.model_name || 'agent',
    sourceSurface: entry.workflow_stage || '',
    workflowRunId: '',
    sessionId: '',
    rawMetadata: entry,
  };
}

function deriveActivityTitle(entry) {
  const tool = cleanText(entry.tool_name || '');
  const stage = cleanText(entry.workflow_stage || '');
  const summary = cleanText(entry.summary_text || '');
  if (tool) return eventTypeLabel(tool) || tool;
  if (stage) return capitalize(stage.replace(/_/g, ' '));
  if (summary) return summary.slice(0, 80);
  return 'Activity';
}
```

### Normalizing SessionSignal

```javascript
function normalizeSessionSignal({ projection, session, telemetry }) {
  return {
    sessionId: cleanText(session?.agent_session_id || projection?.summary?.agent_session_id || ''),
    sessionKey: cleanText(session?.session_key || projection?.summary?.session_key || ''),
    workflowRunId: cleanText(session?.workflow_run_id || projection?.workflow_run_id || ''),
    telemetryStatus: cleanText(telemetry?.status || session?.session_status || projection?.summary?.session_status || 'unknown'),
    heartbeatAtUtc: cleanText(telemetry?.last_observed_at || projection?.latest_turn_completed_at || session?.session_updated_at || ''),
    activeProcessCount: numberOrZero(telemetry?.active_process_count),
    failedProcessCount: numberOrZero(telemetry?.failed_process_count),
    recentProcessCount: numberOrZero(telemetry?.recent_process_count),
    frictionCount: numberOrZero(telemetry?.failed_process_count),
    openGapCount: numberOrZero(projection?.execution_context_posture?.open_gap_count),
    operatorSummary: cleanText(projection?.operator_handoff?.operator_summary || projection?.operator_summary || projection?.status_headline || ''),
    nextAction: cleanText(projection?.operator_handoff?.next_action || projection?.next_action || projection?.summary?.next_action || ''),
    currentObjective: cleanText(projection?.current_objective || ''),
  };
}
```

---

## Current implementation gaps

The following specific gaps exist between the current cockpit and this design.

### Ordering

- **Gap:** `buildSummary()` sorts events ascending then takes `at(-1)`.
  The feed in `renderEventFeed()` does sort descending, but the summary strip
  derives its "latest event" using an ascending intermediate sort, which is
  confusing and fragile.
- **Fix:** Remove the intermediate ascending sort. Always sort descending from the
  start. Latest event is always `events[0]` after descending sort.

### GUID exposure

- **Gap:** `renderEventFeed()` renders `event.id` inline in `<strong>` alongside
  the type. The ID is a raw fragment UUID or timestamp string.
- **Fix:** Replace `event.id` in the list row with the derived semantic `title`
  from normalized ActivityEvent. Move the raw ID to the detail panel only.

### listExecutionProcessRuns unused

- **Gap:** `listExecutionProcessRuns` is declared in the design but never called
  in `execution-telemetry.js`. The event feed is built entirely from substrate
  fragments and raw telemetry, missing the richer process run records.
- **Fix:** Call `listExecutionProcessRuns({ limit: 30, since: derivedSince })`
  alongside the substrate fetch. Merge and normalize results using ActivityEvent.
  The `since` parameter enables server-side time-range filtering.

### Timestamp inconsistency

- **Gap:** `renderEventFeed()` calls `formatTimestampEt()` correctly, but the
  summary strip's heartbeat label uses `formatTimestampEt()` only for the
  heartbeat, while `renderSessionDetails()` uses it for `observed_at`. The
  raw `sessionId` and `workflowRunId` are shown plainly in session details.
- **Fix:** Session details should show `sessionKey` as the primary label, not
  the raw UUID. WorkflowRunId should show as "Run …{last8}" in detail.

### No filter controls

- **Gap:** The current cockpit has no filter UI. All events from all types
  are shown simultaneously with no way to narrow to shell commands, git ops, etc.
- **Fix:** Implement filter bar per the filter model spec. Use `listExecutionProcessRuns`
  server-side filters first, then client-side normalize remaining multi-select filters.

---

## Phased implementation plan

### Phase 1 — Normalization layer

- Implement `normalizeContextFragment(fragment) → ActivityEvent`
- Implement `normalizeRecentActivity(entry) → ActivityEvent`
- Implement `normalizeSessionSignal({ projection, session, telemetry }) → SessionSignal`
- Implement `eventTypeLabel(rawType) → string` using the event type map
- Implement `deriveFragmentTitle(fragment) → string`
- Implement `deriveActivityTitle(entry) → string`
- All normalization functions should be pure (no side effects, no DOM access)
- Add `listExecutionProcessRuns` call to the refresh cycle

### Phase 2 — Display order and GUID removal

- Change `renderEventFeed()` to consume normalized ActivityEvent records
- Remove `event.id` from list row content — move to detail only
- Use `event.title` (semantic) as the primary list label
- Confirm descending sort at the normalization stage, not in the render function
- Confirm `sessionKey` shown in command deck instead of `sessionId` UUID

### Phase 3 — Filter panel

- Add time range button group (15m · 1h · 6h · 24h · All)
- Wire `since` parameter to `listExecutionProcessRuns` based on selected range
- Add execution type multi-select (populated from known event type labels)
- Add domain object type multi-select
- Show active filters as dismissible chips
- Persist filter state to localStorage

### Phase 4 — Template ownership

- Update `operator.execution_telemetry_dashboard.md.tmpl` to bind to
  normalized SessionSignal and ActivityEvent fields
- Update `operator.execution_telemetry_event_stream.md.tmpl` to include
  filter block bindings and full column spec
- Validate templates render correctly against test fixture data

### Phase 5 — Validation

- Verify descending order: newest event is always row 1
- Verify ET timestamps: run through DST boundary (March and November dates)
- Verify GUID suppression: no UUID visible in list or command deck
- Verify filter behavior: time range narrows results, clear resets
- Verify empty states: no data, no filter match, API error each render cleanly

---

## Acceptance criteria

**Ordering**
- [ ] Stream shows newest event first by default with no user interaction
- [ ] "Load more" appends older events, never duplicates or re-orders existing rows

**Timestamps**
- [ ] All displayed timestamps are in America/New_York with EDT/EST abbreviation
- [ ] Relative age (e.g. "14m ago") is always accompanied by an absolute ET timestamp

**GUID suppression**
- [ ] No UUID or raw GUID appears in any list row, metric, or summary label
- [ ] Session is identified by human session_key, not agent_session_id
- [ ] Raw IDs are available only in the detail panel's collapsed "Raw metadata" section

**Filters**
- [ ] Time range preset passes `since` to listExecutionProcessRuns as a server-side param
- [ ] Time range preset also gates supplement source events client-side by occurredAtUtc
- [ ] Selecting 1 status sends it as the server `status` param
- [ ] Selecting 2+ statuses omits server `status` param and applies filter client-side
- [ ] Selecting 0 statuses omits server `status` param (all statuses returned)
- [ ] Execution type filter options are populated dynamically from observed data
- [ ] Domain object type filter options are populated dynamically from observed data
- [ ] An unknown event type renders as a capitalized, space-separated label (not blank, not crash)

**Pagination**
- [ ] "Load more" uses the `before` cursor (oldest visible timestamp), not a numeric offset
- [ ] Supplement sources are fetched only on first page load, not on "Load more"
- [ ] Re-fetching (auto-refresh) resets to the first page; it does not accumulate

**Data integrity**
- [ ] Merge deduplicate step eliminates events that appear in both primary and supplement
- [ ] Primary source event wins when primary and supplement share a dedupe key
- [ ] listExecutionProcessRuns is called in every refresh cycle

**Contracts**
- [ ] Normalization functions are pure and independently testable
- [ ] Templates bind to normalized fields only, not raw API shapes
