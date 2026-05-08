# Execution Substrate Telemetry Design

## Why this design exists

This workspace currently renders execution telemetry, but the information architecture still over-exposes identifiers and under-exposes operator insight.

This design defines:
- how to extract telemetry directly from SDK methods
- how to normalize telemetry into a stable taxonomy
- how to present newest signals first
- how to display timestamps in America/New_York
- how to filter by execution type, domain object type, and related criteria
- how to render operator-facing markdown contracts owned in this repo

## Design principles

- Newest first: all timelines and feeds default to descending time order.
- Operator meaning over raw IDs: labels, status, objective, and action should be prominent; GUIDs should be secondary metadata.
- Declarative iteration: list rendering should be driven by filter and sort contracts, not hard-coded imperative loops.
- One time standard: all displayed timestamps render in America/New_York.
- Structured drill-down: summary, stream, and detail views each answer a distinct operator question.

## SDK telemetry extraction surfaces

Primary methods we can use now:

- getExecutionTelemetryCurrent()
  - Current runtime health and counters.
- listExecutionProcessRuns({ limit, artifactKind, status, since })
  - Recent execution runs with server-side filtering.
- getExecutionProcessRun(processRunId)
  - Full details for a selected run.
- getWorkflowRunSubstrate(workflowRunId)
  - Context fragments and recent activity for a workflow run.
- getSessionPerformanceMetrics({ workflowRunId, sessionId, clientType })
  - Session-level metrics and status.
- getLatestMemoryProjection()
  - Hydration summary and latest status hints.
- listPromotionCandidates({ workflowRunId, learningCategory, promotionReadiness, limit })
  - Candidate queue and posture context.
- listWorkflowCandidates({ limit })
  - Fallback candidate discovery.

## Unified telemetry taxonomy

Normalize all upstream payloads into these domain records.

### ExecutionRun

- runId
- workflowRunId
- executionType
- status
- startedAtUtc
- completedAtUtc
- durationMs
- artifactKind
- objective
- summary

### SessionSignal

- sessionId
- sessionKey
- workflowRunId
- telemetryStatus
- heartbeatAtUtc
- activeProcessCount
- failedProcessCount
- recentProcessCount
- frictionCount

### ActivityEvent

- eventId
- eventType
- occurredAtUtc
- executionType
- domainObjectType
- status
- title
- summary
- actorLabel
- sourceSurface
- workflowRunId
- sessionId
- rawMetadata

### PromotionInsight

- candidateKey
- workflowRunId
- learningCategory
- promotionReadiness
- targetType
- signalSummary

## Display model

### 1) Command deck (top summary)

Primary operator answers:
- Is execution healthy now?
- What changed most recently?
- Where should I look next?

Cards:
- Runtime status
- Last heartbeat (New York time)
- Active and failed process counts
- Friction count
- Promotion candidates
- Recommended next action

### 2) Recent execution stream (newest first)

Default behavior:
- Sort descending by occurredAtUtc.
- Page size 30, with Load more.
- Timestamp format: MMM dd, yyyy, hh:mm:ss a z (America/New_York).

Each row should prioritize meaning:
- Title: semantic label (not raw GUID)
- Subtitle: summary text
- Chips: execution type, domain object type, status
- Right rail: NY timestamp
- Optional expandable metadata (includes IDs)

### 3) Focus detail panel

For selected row:
- human summary
- objective and workflow context
- domain object summary
- linked session and run
- raw metadata in collapsible section

## Filtering model

Mandatory filters:
- executionType
- domainObjectType
- status
- workflowRunId
- sessionId
- timeRange

Optional filters:
- monitorId
- actorLabel
- artifactKind
- learningCategory
- promotionReadiness

Filter UX:
- multi-select chips for categorical fields
- quick presets for time range: 15m, 1h, 6h, 24h
- clear all and save view

## Time standard

- Store and compare in UTC.
- Display in America/New_York.
- Include zone abbreviation in every visible timestamp.
- Relative age can be shown, but never without absolute timestamp.

## Declarative iterator contract

The UI should consume a declarative query contract before rendering lists.

Example contract:

```yaml
contract: execution.telemetry.stream.v1
source:
  method: getWorkflowRunSubstrate
  args:
    workflowRunId: ${workflowRunId}
normalize: ActivityEvent
filters:
  - field: executionType
    operator: in
    value: ${filters.executionType}
  - field: domainObjectType
    operator: in
    value: ${filters.domainObjectType}
  - field: status
    operator: in
    value: ${filters.status}
sort:
  - field: occurredAtUtc
    direction: desc
paginate:
  size: 30
render:
  timestamp:
    timezone: America/New_York
    format: MMM dd, yyyy, hh:mm:ss a z
```

This keeps iteration rules explicit and testable.

## In-repo markdown contracts

We should own telemetry markdown templates here instead of relying on upstream projections.

Proposed templates:
- fixtures/templates/operator.execution_telemetry_dashboard.md.tmpl
- fixtures/templates/operator.execution_telemetry_event_stream.md.tmpl

These templates should consume normalized records and avoid exposing raw identifiers by default.

## Content rules to avoid GUID noise

- Never lead with IDs in titles.
- IDs are only shown in a metadata/details section.
- Surface labels should be human terms: Run status, Session state, Last heartbeat, Next action.
- If no human label exists, derive one from event type map.

## Event type map (starter)

- monitor_heartbeat -> Heartbeat
- process_started -> Process started
- process_completed -> Process completed
- shell_command_observed -> Shell command observed
- git_operation_observed -> Git operation observed
- test_run_observed -> Test run observed
- projection_generation_observed -> Projection generated
- verification_retry_observed -> Verification retry
- remote_publish_failed -> Remote publish failed

## Phased implementation plan

1. Data contract phase
- implement normalization layer for ExecutionRun, SessionSignal, ActivityEvent, PromotionInsight
- enforce descending time sort at contract level

2. Presentation phase
- update telemetry page to render stream newest-first
- apply NY timestamp formatter consistently
- add filter panel and active filter chips

3. Markdown contract phase
- render dashboard and event stream using local templates
- add test fixtures for low/no/high telemetry scenarios

4. Validation phase
- verify ordering and filtering behavior
- verify timezone rendering and DST correctness
- verify fallback states and error handling

## Acceptance checks

- Stream shows newest event first by default.
- All displayed timestamps are in America/New_York.
- Filters support execution type and domain object type.
- Primary surface is human-readable and action-oriented.
- IDs are available but de-emphasized.
- Contracts and templates are owned in this repo.
