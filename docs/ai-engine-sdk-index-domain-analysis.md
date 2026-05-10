# AI Engine SDK `index.js` Domain Analysis

Date: 2026-05-10

Package analyzed: `@bpmsoftwaresolutions/ai-engine-client@1.1.64`

File analyzed: `node_modules/@bpmsoftwaresolutions/ai-engine-client/src/index.js`

## Executive Summary

The AI Engine SDK currently exposes almost the entire client through one massive entrypoint:

- Approximately 6,026 physical lines.
- One exported client class, `AIEngineClient`.
- One exported factory, `createAIEngineClient(options)`.
- 15 exported constants.
- 33 top-level helper functions.
- 364 class methods.
- 330 direct HTTP request calls.
- 8 constructor-created compatibility facades.

The file is not just a transport client. It currently mixes:

- HTTP transport concerns.
- Auth/header/version/capability concerns.
- Input normalization and enum coercion.
- Governance gate enforcement.
- Post-mutation verification.
- Collaboration choreography.
- Agent communication channel management.
- Project chartering and roadmap orchestration.
- Implementation packet workflows.
- LOGA projection download/render helpers.
- Repo/retrieval intelligence APIs.
- Skill, tool, context, portfolio, performance, design, notes, search, and benchmark APIs.

The shape is a classic SDK god file. It is still valuable because it has already discovered a broad domain surface, but it has outgrown a single source file. The upstream remediation should preserve the public API while moving implementation into domain modules with one responsibility each.

## Current Public Surface

The top-level exports are intentionally small:

- `AI_ENGINE_CLIENT_VERSION`
- `GOVERNED_MUTATION_REQUIRED_CAPABILITIES`
- `AI_ENGINE_CLIENT_CAPABILITIES`
- `LOGA_CONTRACT`
- `LOGA_INTERACTION_CONTRACT`
- `LOGA_NAVIGATION_CONTRACT`
- `LOGA_PROJECTION_WORKFLOW`
- `TASK_BOUND_SUBSTRATE_EXECUTION_POLICY`
- `AGENT_COMMUNICATION_CONTRACT_VERSION`
- `AGENT_COMMUNICATION_THREAD_TYPES`
- `AGENT_COMMUNICATION_MESSAGE_KINDS`
- `AGENT_COMMUNICATION_TRANSFER_KINDS`
- `AGENT_COMMUNICATION_TRANSFER_MODES`
- `AGENT_COMMUNICATION_TRANSFER_LIFECYCLE_STATES`
- `AGENT_COMMUNICATION_TRANSFER_RECEIPT_TYPES`
- `AGENT_COMMUNICATION_RECIPIENT_MODES`
- `AIEngineClient`
- `createAIEngineClient(options)`

This is good news for migration. The package can keep `src/index.js` as a stable export barrel and compatibility facade while moving implementation into modules behind it.

## Constructor Facades Already Present

The constructor currently builds several nested convenience namespaces. These are useful seams for module extraction:

| Facade | Method count | Current role |
|---|---:|---|
| `loga` | 8 | UX remediation and LOGA projection convenience methods |
| `executionTelemetry` | 4 | Current execution/process run telemetry |
| `scripts` | 4 | Script generation, rendering, artifact submission, evidence |
| `reports` | 1 | Report runner |
| `projections` | 8 | Projection rendering and transfer projections |
| `actions` | 1 | Action intent submission |
| `agentComms` | 63 | Agent communication, bundles, transfers, presence, ping-pong |
| `collaboration` | 37 | Collaboration-oriented aliases over communication methods |

The facades are currently just function pointers back into the same large class. Upstream should convert these into actual domain clients that share a common transport instance.

## Existing Section Inventory

The file already has section markers, but one section is too broad. In particular, `Data Access Gateway` spans line 651 through line 3882 and includes gateway APIs plus most communication/collaboration/governance/database/work APIs.

| Existing section | Line span | Method count | Observed concern |
|---|---:|---:|---|
| Constructor / compatibility facades | 406-581 | 2 | Setup, env loading, facade aliases |
| Health | 582-596 | 1 | Health plus workflow summary |
| Operator Status | 597-650 | 11 | Status, telemetry, usability, memory |
| Data Access Gateway | 651-3882 | 119 | Mixed gateway, comms, collaboration, database, governance, work, external project APIs |
| Retrieval Wrapper | 3883-3924 | 4 | Command card and code lookup wrappers |
| Repo Inventory | 3925-4051 | 21 | Repository, files, symbols, relationships, findings |
| Retrieval Management | 4052-4093 | 10 | Retrieval metrics, packet selection, prompt assembly validation |
| Workflows | 4094-4124 | 6 | Workflow CRUD/publish/clone |
| Workflow Governance | 4125-4160 | 8 | Governance decisions, simulations, bundles, approvals |
| Workflow Runs | 4161-4186 | 6 | Run lifecycle, artifacts, playback, resume |
| Workflow Inspector | 4187-4196 | 2 | Inspector run listing and inspection |
| Manual & Approval Tasks | 4197-4214 | 4 | Human/manual task completion and approval |
| Projects & Chartering | 4215-4570 | 36 | Project lifecycle, chartering, markdown downloads, LOGA projections, UX remediations, scripts |
| Roadmaps | 4571-4769 | 13 | Roadmaps, active items, packet materialization helpers |
| Implementation Tasks | 4770-4890 | 6 | Implementation task CRUD/assignment/completion |
| Governed Implementation | 4891-5236 | 19 | Packets, checks, evidence, verified mutation helpers |
| Skills | 5237-5285 | 9 | Skill registry and contracts |
| Skill Governance | 5286-5301 | 3 | Skill governance changes |
| Capabilities | 5302-5315 | 3 | Capability listing, creation, test |
| Tool Registry | 5316-5363 | 10 | Tool registry, history, governance, replay, gates |
| Context Assembly | 5364-5399 | 6 | Context contracts, fragments, reuse, prompt assemblies |
| Performance | 5400-5437 | 7 | Metrics, benchmark snapshots, dashboard |
| Portfolio | 5438-5463 | 6 | Portfolio status, summaries, exceptions, reports |
| Self-Learning | 5464-5512 | 6 | Learning records, promotion candidates/flows |
| Self-Optimization | 5513-5541 | 4 | Optimization dashboard, queue, backlog, handoffs |
| Design Intelligence | 5542-5591 | 12 | Decisions, variants, critique, lineage, patterns, recommendations |
| Script Discovery | 5592-5615 | 5 | Script scanning and workflow candidate promotion |
| Notes Lab | 5616-5629 | 3 | Config, submit, approve review |
| Search & Contacts | 5630-5643 | 3 | Search, organizations, contacts |
| Benchmarks | 5644-5653 | 2 | Recent benchmark runs |
| Commit Governance | 5654-5731 | 4 | Commit governance and ship readiness |
| Context Session Orientation | 5732-5824 | 7 | Orientation window, reminders, locking, gate status |
| Core HTTP | 5825-6026 | 7 | Auth, headers, JSON/text/binary requests |

## Hot Endpoint Areas

The largest endpoint clusters by direct request count are:

| Request count | Endpoint prefix |
|---:|---|
| 20 | `/api/agent-communications/transfer-channels` |
| 15 | `/api/operator/projections` |
| 15 | `/api/operator/projects` |
| 14 | `/api/operator/retrieval` |
| 13 | `/api/workflows/:id` |
| 9 | `/api/agent-communications/bundles` |
| 8 | `/api/governed-implementation/items` |
| 7 | `/api/agent-communications/messages` |
| 7 | `/api/operator/database` |
| 7 | `/api/operator/performance` |
| 6 | `/api/loga/ux-gate-remediations` |
| 6 | `/api/operator/portfolio` |
| 6 | `/api/operator/self-learning` |
| 5 | `/api/agent-communications/transfers` |
| 5 | `/api/governance/claims` |
| 5 | `/api/v1/projects` |
| 5 | `/api/operator/skills` |
| 5 | `/api/design-intelligence/decisions` |
| 5 | `/api/context-session/:id` |

This confirms the file should be split by backend bounded context, not just by arbitrary line ranges.

## Helper Function Clusters

Top-level helper functions currently sit beside domain exports. They should move into small utility modules:

| Lines | Helpers | Proposed module |
|---:|---|---|
| 8 | `readPackageVersion` | `version.js` |
| 79-153 | `normalizeEnum`, communication enum normalizers | `agent-communications/normalizers.js` |
| 157-177 | `trimTrailingSlash`, `appendQuery`, `readJson`, `parseContentDispositionFilename` | `transport/http-utils.js` |
| 185-190 | Header readers and LOGA projection metadata extraction | `projections/loga-metadata.js` |
| 225-239 | Body classifiers | `transport/body.js` |
| 245-299 | `cleanText`, version comparison, UUID check, list/object helpers | `utils/validation.js` |
| 268 | `countRoadmapProjectionLines` | `roadmaps/projection-metrics.js` |
| 303-341 | Task binding and registry helpers | `governance/task-binding.js` |
| 355-367 | Reminder and context session helpers | `context-sessions/helpers.js` |
| 377-399 | Expected-state matching and error builders | `governance/verification.js` |

## Long Methods That Need Extraction First

These are the highest-value first extractions because they contain orchestration logic, validation, fallback behavior, or post-condition checks:

| Lines | Method | Why it matters |
|---:|---|---|
| 407-567 | `constructor` | Builds all compatibility facades inline and hides domain boundaries |
| 1265-1427 | `startAgentConnection` | Multi-step collaboration/channel bootstrap workflow |
| 3447-3555 | `bindClaimedWorkItem` | Work claim binding logic with policy/metadata handling |
| 5011-5113 | `executeVerifiedMutation` | Reusable verified mutation orchestration should be a governance primitive |
| 930-1031 | `_resolveCoordinationChannelContext` | Communication context resolution and fallback behavior |
| 4614-4713 | `importImplementationPacketAndMaterializeRoadmap` | Cross-domain project/roadmap/workflow materialization |
| 4772-4861 | `createImplementationTask` | Task creation payload normalization and workflow binding concerns |
| 1174-1260 | `connectToTransferChannel` | Collaboration transfer workflow, validation, and response shaping |
| 2002-2082 | `transferWorkPacket` | Work transfer bundle/payload orchestration |
| 2310-2389 | `startCoordinationPingPong` | Coordination workflow with preflight and control lifecycle |
| 758-830 | `checkCoordinationPingPongPreflight` | Capability/version drift detection |
| 2390-2519 | `sendCoordinationPing`, `sendCoordinationPong` | Repeated ping/pong behavior and verification semantics |
| 4281-4343 | `closeProject` | Project close operation with explicit verification |
| 1482-1542 | `postAgentHeartbeat` | Channel heartbeat normalization and status reporting |
| 5178-5238 | `verifyImplementationItemArtifacts` | Artifact source-truth verification |
| 3598-3655 | `promoteClaimSurface` | Claim promotion governance |
| 5912-6026 | `_requestText`, `_requestBinary` | Duplicated request/error/timeout behavior across response types |

## Proposed Module Architecture

Keep `src/index.js` as the public entrypoint, but reduce it to exports and object composition.

```text
src/
  index.js
  client.js
  constants/
    capabilities.js
    contracts.js
    agent-communications.js
  transport/
    http-client.js
    headers.js
    body.js
    errors.js
  utils/
    text.js
    version.js
    validation.js
  domains/
    health.js
    operator-status.js
    gateway.js
    agent-communications/
      client.js
      channels.js
      messages.js
      bundles.js
      transfers.js
      presence.js
      ping-pong.js
      normalizers.js
    collaboration.js
    database.js
    governance/
      claims.js
      execution-eligibility.js
      verified-mutations.js
      workflow-tool-bindings.js
      turn-compliance.js
    work.js
    external-projects.js
    retrieval/
      wrappers.js
      repo-inventory.js
      management.js
    workflows/
      definitions.js
      governance.js
      runs.js
      inspector.js
      manual-tasks.js
    projects/
      chartering.js
      lifecycle.js
      reports.js
      projections.js
      ux-remediation.js
    roadmaps/
      client.js
      implementation-packet-materializer.js
    implementation/
      tasks.js
      packets.js
      artifacts.js
      acceptance-checks.js
    skills/
      registry.js
      governance.js
    capabilities.js
    tools/
      registry.js
      governance.js
    context-assembly.js
    performance.js
    portfolio.js
    learning.js
    optimization.js
    design-intelligence.js
    script-discovery.js
    notes-lab.js
    search-contacts.js
    benchmarks.js
    commit-governance.js
    context-sessions.js
```

## Recommended Client Composition Pattern

Use one shared transport plus domain clients:

```js
export class AIEngineClient {
  constructor(options = {}) {
    this.transport = createTransport(options);
    this.health = createHealthClient(this.transport);
    this.operatorStatus = createOperatorStatusClient(this.transport);
    this.gateway = createGatewayClient(this.transport);
    this.agentComms = createAgentCommunicationsClient(this.transport);
    this.collaboration = createCollaborationClient(this.agentComms);
    this.governance = createGovernanceClient(this.transport);
    this.projects = createProjectsClient(this.transport);
    this.roadmaps = createRoadmapsClient(this.transport, this.projects);
    this.implementation = createImplementationClient(this.transport, this.governance);

    attachBackwardCompatibleMethods(this);
    attachLegacyFacades(this);
  }
}
```

The key is not to break existing consumers. Existing methods like `client.createProjectCharter(...)` can remain as thin aliases:

```js
createProjectCharter(payload) {
  return this.projects.createCharter(payload);
}
```

## Proposed Domain Boundaries

### 1. Transport Core

Owns:

- Base URL trimming.
- Auth token resolution.
- API key/client ID fallback headers.
- Actor/session headers.
- SDK version and capability headers.
- Timeout/abort handling.
- JSON/text/binary response readers.
- Error shaping.

Move from current methods:

- `_resolveAccessToken`
- `_buildHeaders`
- `_request`
- `_requestText`
- `_requestLogaProjection`
- `_requestBinary`
- `appendQuery`
- `readJson`
- `parseContentDispositionFilename`
- `isJsonBody`
- `isFormDataBody`
- `isBinaryBody`

Why:

Transport is the substrate every domain needs. It should be stable, independently testable, and free of business semantics.

### 2. Agent Communications

Owns:

- Communication capabilities.
- Channels.
- Transfer channels.
- Agent channel open/accept/close.
- Heartbeats.
- Messages.
- Message watches.
- Bundles.
- Transfer receipts.
- Presence.
- Inbox.
- Direct participant/role sending.
- Ping-pong coordination.
- Handoffs.
- Friction taxonomy/events.

Move from current methods:

- `getCommunicationCapabilities`
- `getCollaborationCapabilities`
- `getDeploymentCapabilities`
- `checkCoordinationPingPongPreflight`
- `listCommunicationChannels`
- `getCommunicationChannelStatus`
- `getPresenceBoard`
- `markParticipantOnline`
- `markParticipantOffline`
- `connectToTransferChannel`
- `openAgentChannel`
- `startAgentConnection`
- `acceptAgentChannel`
- `postAgentHeartbeat`
- `postAgentMessage`
- `acknowledgeAgentMessage`
- `closeAgentChannel`
- `respondToMessageWatch`
- `bootstrapCommunication`
- `negotiateCommunicationTransfer`
- `transferWorkPacket`
- `openCommunicationThread`
- `sendCommunicationMessage`
- `createCommunicationBundle`
- `recordCommunicationTransferReceipt`
- `acceptCommunicationTransferPacket`
- `closeCommunicationTransferPacket`
- `createCommunicationHandoff`
- `startCoordinationPingPong`
- `sendCoordinationPing`
- `sendCoordinationPong`
- `stopCoordinationPingPong`

Submodules should be `channels`, `messages`, `bundles`, `transfers`, `presence`, and `coordination`.

### 3. Collaboration Facade

Owns:

- Human-friendly choreography aliases over agent communications.
- Proposal review/revise/blocker/begin/closure workflows.
- Backward-compatible `client.collaboration.*` names.

This should not own its own HTTP paths unless the backend has collaboration-specific endpoints. It can compose `agentComms`.

### 4. Data Gateway

Owns:

- Generic query gateway.
- Report definition execution.
- Projection rendering gateway.
- Action intent submission.

Move from current methods:

- `query`
- `runReportDefinition`
- `renderProjection`
- `submitActionIntent`

This should be small. The current `Data Access Gateway` section is overloaded because unrelated communication and governance methods are living under it.

### 5. Operator Status And Telemetry

Owns:

- Current workflow status.
- Architecture/security/codebase status.
- Execution telemetry current/process runs.
- Generated execution usability.
- Anti-pattern rules.
- Latest memory projection.

Move from current methods:

- `currentWorkflowStatus`
- `currentArchitectureIntegrityStatus`
- `currentSecurityGovernanceStatus`
- `getExecutionTelemetryCurrent`
- `listExecutionProcessRuns`
- `getExecutionProcessRun`
- `getGeneratedExecutionUsability`
- `getLogaGeneratedExecutionUsabilityProjection`
- `getAntiPatternRules`
- `currentCodebaseShapeStatus`
- `getLatestMemoryProjection`

### 6. Governance Core

Owns:

- Execution eligibility.
- Claims.
- Claim binding/promotion/signoff.
- Verified mutation helper.
- Verification errors.
- Task binding policy helpers.
- Workflow tool binding approval lanes.
- Turn compliance.
- Commit governance can either live here or remain a separate `commit-governance` domain.

Move from current methods:

- `startSessionGovernance`
- `startReviewGovernance`
- `startWork`
- `startClaimedWork`
- `claimWorkItem`
- `bindClaimedWorkItem`
- `getClaim`
- `getExecutionEligibility`
- `signoffClaim`
- `promoteClaimSurface`
- `createWorkflowToolBindingApprovalLane`
- `recordWorkflowToolBindingApprovalDecision`
- `executeWorkflowToolBindingApprovalBinding`
- `revalidateWorkflowToolBindingStartup`
- `completeTurn`
- `evaluateTurnCompliance`
- `blockIfNonCompliant`
- `executeVerifiedMutation`

### 7. Projects And Chartering

Owns:

- Project charter creation/execution.
- Project listing/get/close.
- Project workflow runs.
- Project reports and markdown downloads.
- Project bundles.
- LOGA project projections.

Move from current methods:

- `createProjectCharter`
- `runCharter`
- `runProjectCharter`
- `createProjectDelivery`
- `approveProjectCharterIntent`
- `listProjects`
- `getProject`
- `listProjectWorkflowRuns`
- `closeProject`
- `closeActiveProject`
- `getProjectCharterReport`
- `createProjectMarkdownDownload`
- `downloadProjectMarkdownReport`
- `downloadProjectCharterReportMarkdown`
- `getProjectBundle`
- `getLogaOperatorHomeProjection`
- `getLogaProjectCatalogProjection`
- `getLogaProjectPortfolioProjection`
- `getLogaProjectRoadmapProjection`
- `getLogaRoadmapItemProjection`
- `getLogaWorkflowRunProjection`
- `getLogaEvidencePacketProjection`

### 8. Roadmaps

Owns:

- Project roadmap list/get/summary/active item.
- Implementation roadmap reports.
- Task surface ensure.
- Implementation packet materialization into roadmaps.
- Project open tasks and project performance metrics.

Move from current methods:

- `listProjectRoadmaps`
- `getProjectRoadmap`
- `getProjectRoadmapSummary`
- `getProjectRoadmapActiveItem`
- `getProjectImplementationRoadmapReport`
- `downloadProjectImplementationRoadmapReportMarkdown`
- `ensureProjectRoadmapTaskSurface`
- `importImplementationPacketAndMaterializeRoadmap`
- `listProjectOpenTasks`
- `getProjectPerformanceMetrics`
- `_resolveImplementationPacketProjectReference`
- `_resolveImplementationPacketWorkflowReference`
- `_resolveImplementationPacketWorkflowId`

### 9. Governed Implementation

Owns:

- Implementation packets.
- Implementation tasks.
- Acceptance checks.
- Artifact manifests.
- Decision packets.
- Evidence/activity recording.
- Verified status changes.
- Workflow roadmap/resume context bindings.

Move from current methods:

- `createImplementationTask`
- `listImplementationTasks`
- `listImplementationSubtasks`
- `updateImplementationTask`
- `assignImplementationTask`
- `completeImplementationTask`
- `importImplementationPacket`
- `listImplementationPackets`
- `getImplementationPacket`
- `getImplementationItemAcceptanceChecks`
- `getArtifactManifest`
- `getDecisionPacket`
- `updateImplementationItemStatus`
- `addImplementationItemEvidence`
- `addImplementationItemActivity`
- `listImplementationItemActivity`
- `updateAcceptanceCheckStatus`
- `createImplementationPacketGateDecision`
- `bindImplementationPacketToWorkflow`
- `getWorkflowImplementationRoadmap`
- `getWorkflowResumeContext`
- `updateImplementationItemStatusVerified`
- `updateAcceptanceCheckStatusVerified`
- `verifyImplementationItemArtifacts`

### 10. Retrieval And Repo Intelligence

Owns:

- Retrieval wrapper APIs.
- Repository inventory.
- Code files.
- Symbols.
- Relationships.
- Codebase shape/object-flow findings.
- Change analysis.
- Refactor candidates.
- Retrieval packet generation/selection/feedback.

Move from current methods:

- `getCommandCard`
- `resolveOperatingProcedure`
- `getSymbolDefinition`
- `getRelatedCode`
- `listRepositories`
- `getRepository`
- `listCodeFiles`
- `getCodeFile`
- `getCodeFileContentWindow`
- `listCodeSymbolsByFile`
- `getCodeSymbol`
- `searchSymbols`
- `getSymbolRelationships`
- `listCodeRelationships`
- `listActionObservations`
- `listCodebaseShapeFindings`
- `listObjectFlowObservations`
- `getChangeAnalysis`
- `listRefactorCandidates`
- `analyzeRefactorCandidate`
- `getRepoRetrievalPacket`
- `getRepoRetrievalPacketFragments`
- `evaluateProposalScope`
- `getRetrievalStatus`
- `getRetrievalProfileMetrics`
- `getRetrievalFeedbackMetrics`
- `getRetrievalQuery`
- `getRetrievalPacket`
- `generateRetrievalCandidates`
- `selectRetrievalPacket`
- `recordRetrievalFeedback`
- `deriveRetrievalOptimizationCandidates`
- `validatePromptAssembly`

### 11. Workflow Runtime

Owns:

- Workflow definitions.
- Governance surfaces.
- Runs.
- Artifacts.
- Playback.
- Resume.
- Inspector.
- Manual and approval tasks.

Move from current methods:

- `listWorkflows`
- `createWorkflow`
- `getWorkflow`
- `replaceWorkflowSteps`
- `publishWorkflow`
- `cloneWorkflow`
- `evaluateWorkflowGovernance`
- `listWorkflowGovernanceDecisions`
- `getWorkflowGovernanceSimulation`
- `listWorkflowGovernanceBundles`
- `listWorkflowGovernanceApprovals`
- `listWorkflowGovernanceEvents`
- `getWorkflowGovernanceReview`
- `createWorkflowGovernanceReviewDecision`
- `createWorkflowRun`
- `getWorkflowRun`
- `listWorkflowArtifacts`
- `getWorkflowRunSubstrate`
- `getWorkflowPlayback`
- `resumeWorkflowRun`
- `listRecentInspectorRuns`
- `inspectWorkflowRun`
- `listManualTasks`
- `listApprovalTasks`
- `completeManualTask`
- `approveTask`

### 12. Projection And LOGA Runtime

Owns:

- Projection metadata extraction.
- LOGA operator/project/roadmap/workflow/evidence/transfer projections.
- Text/markdown projection request handling.
- Projection constants.

This can sit under `projects/projections.js` and `agent-communications/transfer-projections.js`, or become a shared `projections` domain if projection behavior is a platform feature.

### 13. Smaller Operator Domains

These are already naturally bounded and can each become small modules:

- `skills`
- `skill-governance`
- `capabilities`
- `tools`
- `context-assembly`
- `performance`
- `portfolio`
- `self-learning`
- `self-optimization`
- `design-intelligence`
- `script-discovery`
- `notes-lab`
- `search-contacts`
- `benchmarks`
- `context-sessions`
- `database`
- `external-projects`
- `scripts`
- `ux-remediation`

## Workflow Stitches To Preserve

The SDK contains higher-level workflows that are more valuable than raw endpoint wrappers. These should be kept, named explicitly, and tested as orchestration modules:

| Workflow | Current methods involved | Recommended home |
|---|---|---|
| Agent connection bootstrap | `connectToTransferChannel`, `startAgentConnection`, `openAgentChannel`, `acceptAgentChannel`, `respondToMessageWatch` | `agent-communications/connection-workflows.js` |
| Coordination ping-pong | `checkCoordinationPingPongPreflight`, `startCoordinationPingPong`, `sendCoordinationPing`, `sendCoordinationPong`, `getCoordinationPingPongStatus`, `stopCoordinationPingPong` | `agent-communications/ping-pong.js` |
| Work transfer packet delivery | `transferWorkPacket`, bundle methods, transfer receipt methods | `agent-communications/transfers.js` |
| Claimed work startup | `startWork`, `startClaimedWork`, `claimWorkItem`, `bindClaimedWorkItem` | `governance/work-claims.js` |
| Verified implementation mutation | `updateImplementationItemStatus`, `updateImplementationItemStatusVerified`, `updateAcceptanceCheckStatusVerified`, `executeVerifiedMutation` | `governance/verified-mutations.js` plus `implementation/verified-actions.js` |
| Project charter to roadmap | `createProjectCharter`, `runCharter`, `createProjectDelivery`, `importImplementationPacketAndMaterializeRoadmap` | `projects/chartering.js` and `roadmaps/materializer.js` |
| Context session orientation | `openContextSession`, `getOrientationWindow`, `acknowledgeReminder`, `completeOrientation`, `lockContextSessionClaim`, `conductOrientation` | `context-sessions.js` |

## Migration Strategy

### Phase 1: Stabilize Tests Around Existing Behavior

- Add smoke tests for constructor behavior and `fromEnv`.
- Add transport tests for JSON, text, binary, timeout, and non-JSON error bodies.
- Add alias tests proving `client.agentComms.*`, `client.collaboration.*`, and top-level `client.*` methods still point to equivalent behavior.
- Add snapshot-style request tests using a fake `fetchImpl` so endpoint paths/methods/bodies are locked down before extraction.

### Phase 2: Extract Transport And Utilities

- Move low-risk helpers first.
- Keep function signatures unchanged.
- Replace direct helper references from `index.js` with imports.
- Verify no public export changes.

### Phase 3: Extract Small Wrapper Domains

Start with domains whose methods are mostly one-line request wrappers:

- Health.
- Operator status.
- Gateway.
- Workflows.
- Workflow runs.
- Manual/approval tasks.
- Skills.
- Capabilities.
- Tools.
- Portfolio.
- Performance.
- Notes lab.
- Search/contacts.
- Benchmarks.

### Phase 4: Extract Orchestration Domains

Move the risky workflows after transport and simple wrappers are stable:

- Agent communications.
- Collaboration.
- Governance.
- Roadmaps.
- Governed implementation.
- Context sessions.

### Phase 5: Shrink `index.js`

The final `index.js` should:

- Export constants.
- Export `AIEngineClient`.
- Export `createAIEngineClient`.
- Compose domain clients.
- Attach backward-compatible aliases.
- Avoid containing endpoint implementation details.

## Backward Compatibility Contract

Do not break these consumer patterns:

```js
import { AIEngineClient, createAIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';

const client = createAIEngineClient({ baseUrl });
await client.ping();
await client.createProjectCharter(payload);
await client.agentComms.openThread(payload);
await client.collaboration.reviewProposal(payload);
await client.implementation?.getPacket?.(packetId);
```

Recommended compatibility rule:

- Top-level methods remain for at least one major version.
- New domain namespaces are introduced as the preferred API.
- Deprecated top-level methods log nothing and behave exactly as before.
- Documentation marks top-level methods as compatibility aliases after the domain modules exist.

## Suggested Domain Namespace Target

The eventual SDK should feel like this:

```js
client.health.ping();
client.operator.status.currentWorkflow();
client.gateway.query(...);
client.agentComms.channels.open(...);
client.agentComms.messages.send(...);
client.agentComms.bundles.create(...);
client.agentComms.transfers.accept(...);
client.collaboration.reviewProposal(...);
client.governance.claims.startWork(...);
client.governance.verifiedMutations.execute(...);
client.projects.charters.create(...);
client.projects.lifecycle.close(...);
client.roadmaps.getActiveItem(...);
client.implementation.tasks.create(...);
client.implementation.packets.import(...);
client.retrieval.repo.searchSymbols(...);
client.workflows.runs.resume(...);
client.contextSessions.conductOrientation(...);
```

## Risks If Left As-Is

- Every new API increases merge conflict risk in the same file.
- Transport changes are risky because they sit beside unrelated business workflows.
- Domain ownership is hard to assign to upstream agents.
- Discoverability is poor despite the large method surface.
- High-level workflows are hidden among raw endpoint wrappers.
- Tests will tend to be broad and brittle instead of domain-specific.
- The constructor will keep accumulating ad hoc facades and aliases.
- Refactoring one area, such as agent communication, can accidentally affect project delivery or governance.

## Recommended Upstream Remediation Ticket Shape

Title:

Refactor AI Engine SDK `src/index.js` into domain modules while preserving public API compatibility

Problem:

`src/index.js` has grown to roughly 6,000 lines and 364 class methods. It mixes transport, auth, normalization, governance verification, agent communications, project delivery, roadmaps, implementation packets, retrieval, workflow runtime, and operator intelligence surfaces in a single class. This creates high change risk and makes domain ownership unclear.

Acceptance criteria:

- `src/index.js` is reduced to exports, client composition, and compatibility alias wiring.
- Shared transport lives in `src/transport/*` and has focused tests for JSON/text/binary/timeout/error behavior.
- Helper functions move into focused utility/domain modules.
- Agent communications, governance, projects, roadmaps, implementation, retrieval, workflows, and operator domains each live in separate modules.
- Existing top-level method names remain backward-compatible.
- Existing constructor facades remain backward-compatible.
- Domain namespaces are documented as the preferred API.
- Request path/method/body behavior is covered by fake-fetch tests before and after extraction.
- Long orchestration methods are tested at the workflow level.

Suggested first PR:

- Extract transport helpers and request methods.
- Extract constants.
- Add fake-fetch request contract tests.
- Keep `AIEngineClient` behavior unchanged.

Suggested second PR:

- Extract simple request-wrapper domains.
- Add alias-preservation tests.

Suggested third PR:

- Extract agent communications and collaboration.
- Add workflow tests for connection bootstrap and ping-pong.

Suggested fourth PR:

- Extract governance, roadmaps, and governed implementation.
- Add verified mutation and materialization tests.

## Bottom Line

The SDK already contains meaningful domain seams. The right remediation is not a rewrite; it is a careful extraction that turns the current god class into a composed client.

The safest path is:

1. Freeze current behavior with fake-fetch tests.
2. Extract transport/utilities first.
3. Move one domain at a time.
4. Keep top-level method aliases.
5. Promote domain namespaces as the new mental model.

That gives the upstream AI Engine team a cleaner SDK without forcing downstream consumers to absorb a breaking API migration.
