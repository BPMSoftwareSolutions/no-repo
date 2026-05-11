# AI Engine SDK `index.js` Domain Split Analysis

Date: 2026-05-11

Package analyzed: `@bpmsoftwaresolutions/ai-engine-client@1.1.71`

File analyzed: `node_modules/@bpmsoftwaresolutions/ai-engine-client/src/index.js`

## Executive Summary

The current AI Engine SDK package is still published as a single source file:

- `src/index.js` is the only file under the package `src/` directory.
- The file has approximately 6,456 physical lines.
- It exports one client class, `AIEngineClient`.
- It exports one factory, `createAIEngineClient(options)`.
- It exports 15 public constants.
- It contains 34 top-level helper functions.
- It contains 369 class methods.
- It contains 331 direct request calls.
- It creates 8 constructor facades.

This is an updated analysis after the latest upstream workflow additions. The biggest change from the prior analysis is that the SDK now contains higher-level project and portfolio closure workflows in addition to the previous endpoint-wrapper surface.

The file should be split by domain modules, but the public API should remain stable. The right upstream implementation is a composed client where `index.js` exports constants, constructs domain clients, and preserves top-level compatibility aliases.

## What Changed Since The Prior Pass

Prior analysis was against `@bpmsoftwaresolutions/ai-engine-client@1.1.64`.

Current analysis is against `@bpmsoftwaresolutions/ai-engine-client@1.1.71`.

Notable changes:

- Class method count increased from 364 to 369.
- Request call count increased from 330 to 331.
- Top-level helper count increased from 33 to 34.
- The package source layout is again a single `src/index.js`.
- New or newly important workflow methods are now present:
  - `claimIsValid(claimId)`
  - `resumeProjectWork(...)`
  - `closeRoadmapItemWorkflow(...)`
  - `getPortfolioClosureReadiness(...)`

The new methods are not just thin endpoint wrappers. They stitch together governance, claims, roadmaps, implementation checks, artifact verification, gate decisions, evidence recording, claim signoff, project close behavior, and portfolio readiness evaluation.

## Current Public Surface

The top-level export surface remains compact:

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

This means the upstream refactor can keep `src/index.js` as the public barrel and move implementation behind that API without a breaking package-level change.

## Constructor Facades

The constructor still builds facades by assigning function pointers back to methods on the same class.

| Facade | Method count | Current role |
|---|---:|---|
| `loga` | 8 | UX remediation and LOGA projection convenience methods |
| `executionTelemetry` | 4 | Current execution and process run telemetry |
| `scripts` | 4 | Script generation, rendering, artifact submission, evidence |
| `reports` | 1 | Report runner |
| `projections` | 8 | Projection rendering and transfer projection helpers |
| `actions` | 1 | Action intent submission |
| `agentComms` | 63 | Agent communication, channels, bundles, transfers, presence, ping-pong |
| `collaboration` | 37 | Collaboration-oriented aliases over agent communication methods |

These facades are good migration anchors. They should become actual domain client objects that share one transport instance.

## Section Inventory

| Current section | Line span | Methods | Refactor interpretation |
|---|---:|---:|---|
| Constructor / compatibility facades | 406-581 | 2 | Client construction, env factory, facade wiring |
| Health | 582-596 | 1 | Health domain |
| Operator Status | 597-650 | 11 | Operator status and telemetry domain |
| Data Access Gateway | 651-3887 | 120 | Overloaded: gateway, agent comms, collaboration, database, governance, work, external project APIs |
| Retrieval Wrapper | 3888-3929 | 4 | Retrieval wrapper domain |
| Repo Inventory | 3930-4056 | 21 | Repository intelligence domain |
| Retrieval Management | 4057-4098 | 10 | Retrieval optimization domain |
| Workflows | 4099-4129 | 6 | Workflow definitions domain |
| Workflow Governance | 4130-4165 | 8 | Workflow governance domain |
| Workflow Runs | 4166-4191 | 6 | Workflow run lifecycle domain |
| Workflow Inspector | 4192-4201 | 2 | Workflow inspection domain |
| Manual & Approval Tasks | 4202-4219 | 4 | Human task domain |
| Projects & Chartering | 4220-4876 | 38 | Project lifecycle, chartering, LOGA, UX remediation, new closure workflow |
| Roadmaps | 4877-5075 | 13 | Roadmap read/materialization helpers |
| Implementation Tasks | 5076-5196 | 6 | Implementation task domain |
| Governed Implementation | 5197-5542 | 19 | Packets, checks, artifacts, verified mutations |
| Skills | 5543-5591 | 9 | Skill registry and contract domain |
| Skill Governance | 5592-5607 | 3 | Skill governance changes |
| Capabilities | 5608-5621 | 3 | Capability registry domain |
| Tool Registry | 5622-5669 | 10 | Tool registry and governance domain |
| Context Assembly | 5670-5705 | 6 | Context assembly domain |
| Performance | 5706-5743 | 7 | Performance and benchmark metrics |
| Portfolio | 5744-5893 | 7 | Portfolio domain plus new closure readiness workflow |
| Self-Learning | 5894-5942 | 6 | Learning records and promotion candidates |
| Self-Optimization | 5943-5971 | 4 | Optimization queue and handoffs |
| Design Intelligence | 5972-6021 | 12 | Design decision intelligence |
| Script Discovery | 6022-6045 | 5 | Script discovery and workflow candidate promotion |
| Notes Lab | 6046-6059 | 3 | Notes review workflow |
| Search & Contacts | 6060-6073 | 3 | Search and CRM-like lookup |
| Benchmarks | 6074-6083 | 2 | Benchmark run lookup |
| Commit Governance | 6084-6161 | 4 | Commit review and ship readiness |
| Context Session Orientation | 6162-6254 | 7 | Context-session orientation workflow |
| Core HTTP | 6255-6456 | 7 | Transport, auth, headers, timeout, response parsing |

The biggest structural issue remains the `Data Access Gateway` section. It is named as one thing but contains most of the agent communication, collaboration, governance, work, database, project-delivery, and external project surfaces.

## Endpoint Hot Spots

Top request clusters:

| Request count | Endpoint prefix |
|---:|---|
| 20 | `/api/agent-communications/transfer-channels` |
| 16 | `/api/operator/projects` |
| 15 | `/api/operator/projections` |
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

These clusters confirm that the SDK should be split by backend bounded context rather than by current comment blocks alone.

## New Workflow Areas To Preserve

The newer methods are valuable because they encode user-level workflows, not just HTTP calls.

### `resumeProjectWork(...)`

Current location: Projects & Chartering

Purpose:

- Load a project resume context.
- Support actor mode, execution intent, claim requirements, and workflow run limits.

Recommended home:

- `domains/projects/resume.js`
- Or `domains/project-work/resume.js` if project-work becomes a first-class workflow domain.

### `closeRoadmapItemWorkflow(...)`

Current location: Projects & Chartering

Purpose:

- Resume project work.
- Load the active roadmap item.
- Validate or create a governance claim.
- Verify acceptance checks.
- Verify required artifacts.
- Create a packet gate decision.
- Update implementation item status through verified mutation.
- Add closure evidence.
- Sign off the claim.
- Reload roadmap/project state.
- Optionally close the project if no open work remains.

Recommended home:

- `domains/project-closure/close-roadmap-item-workflow.js`

This should not stay in a generic projects module. It coordinates projects, roadmaps, governance, implementation packets, evidence, and project close behavior.

### `getPortfolioClosureReadiness(...)`

Current location: Portfolio

Purpose:

- Load portfolio bundle.
- List active projects.
- Read roadmap summaries and active items.
- Read open project tasks.
- Optionally include LOGA portfolio and roadmap projections.
- Produce closure readiness and blocking reasons.

Recommended home:

- `domains/portfolio/closure-readiness.js`

This should become a portfolio workflow module that composes project and roadmap domain clients.

### `claimIsValid(claimId)`

Current location: Data Access Gateway / governance cluster

Purpose:

- Lightweight claim validity check used by closure workflows.

Recommended home:

- `domains/governance/claims.js`

## Long Methods That Should Move First

| Lines | Method | Why it should move |
|---:|---|---|
| 4398-4678 | `closeRoadmapItemWorkflow` | Largest workflow, crosses governance, roadmaps, implementation, evidence, project close |
| 1265-1427 | `startAgentConnection` | Agent connection bootstrap orchestration |
| 407-567 | `constructor` | Builds facades inline and hides domain boundaries |
| 5770-5895 | `getPortfolioClosureReadiness` | Portfolio closure workflow, repeated project/roadmap/task reads |
| 3447-3555 | `bindClaimedWorkItem` | Claim binding policy and metadata workflow |
| 5317-5419 | `executeVerifiedMutation` | Governance primitive used by verified implementation mutations |
| 930-1031 | `_resolveCoordinationChannelContext` | Agent communication context resolution |
| 4920-5019 | `importImplementationPacketAndMaterializeRoadmap` | Implementation packet to roadmap materialization |
| 5078-5167 | `createImplementationTask` | Task creation with claim and workflow binding behavior |
| 1174-1260 | `connectToTransferChannel` | Transfer-channel connection workflow |
| 2002-2082 | `transferWorkPacket` | Work packet delivery workflow |
| 2310-2389 | `startCoordinationPingPong` | Coordination lifecycle workflow |
| 758-830 | `checkCoordinationPingPongPreflight` | Capability and deployment drift check |
| 4286-4348 | `closeProject` | Project cleanup with workflow/run resolution |
| 5484-5544 | `verifyImplementationItemArtifacts` | Artifact source-of-truth verification |
| 6210-6256 | `conductOrientation` | Context session orientation orchestration |

These should be extracted as workflow modules with tests or at least request-contract fixtures upstream.

## Proposed Target Layout

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
    roadmap-projection.js
  domains/
    health.js
    operator-status.js
    gateway.js
    database.js
    dashboard.js
    agent-communications/
      capabilities.js
      channels.js
      presence.js
      messages.js
      bundles.js
      transfers.js
      ping-pong.js
      handoffs.js
      friction.js
      connection-workflows.js
      normalizers.js
    collaboration/
      proposals.js
      closure.js
      aliases.js
    governance/
      claims.js
      execution-eligibility.js
      verified-mutations.js
      workflow-tool-bindings.js
      turn-compliance.js
    projects/
      chartering.js
      lifecycle.js
      reports.js
      resume.js
      projections.js
      ux-remediation.js
    project-closure/
      close-roadmap-item-workflow.js
    roadmaps/
      reads.js
      reports.js
      task-surface.js
      implementation-packet-materializer.js
    implementation/
      tasks.js
      packets.js
      acceptance-checks.js
      artifacts.js
      evidence.js
      gates.js
      verified-actions.js
    retrieval/
      wrapper.js
      repo-inventory.js
      management.js
    workflows/
      definitions.js
      governance.js
      runs.js
      inspector.js
      human-tasks.js
    portfolio/
      reads.js
      closure-readiness.js
    skills/
      registry.js
      governance.js
    tools/
      registry.js
      governance.js
    context-assembly.js
    performance.js
    self-learning.js
    self-optimization.js
    design-intelligence.js
    script-discovery.js
    notes-lab.js
    search-contacts.js
    benchmarks.js
    commit-governance.js
    context-sessions.js
    external-projects.js
    audio-renders.js
    scripts.js
```

## Transformation Taxonomy

This table is the working taxonomy for splitting `index.js`. Each row names a target module file or module family, the category it belongs to, and the current methods that should move there.

| Category | Target module | Current methods / exports | Notes |
|---|---|---|---|
| Public composition | `src/index.js` | Public exports, `createAIEngineClient` | Keep as export barrel and compatibility entrypoint |
| Public composition | `src/client.js` | `AIEngineClient`, `constructor`, `fromEnv` | Own construction and domain wiring only |
| Public composition | `src/compat/aliases.js` | Top-level method aliases, constructor facade aliases | Keeps existing call sites working while preferred domain namespaces mature |
| Constants | `src/constants/capabilities.js` | `GOVERNED_MUTATION_REQUIRED_CAPABILITIES`, `AI_ENGINE_CLIENT_CAPABILITIES` | Capability headers and SDK advertised features |
| Constants | `src/constants/contracts.js` | `LOGA_CONTRACT`, `LOGA_INTERACTION_CONTRACT`, `LOGA_NAVIGATION_CONTRACT`, `LOGA_PROJECTION_WORKFLOW`, `TASK_BOUND_SUBSTRATE_EXECUTION_POLICY` | Contract identifiers |
| Constants | `src/constants/agent-communications.js` | `AGENT_COMMUNICATION_*` constants | Thread/message/transfer enums |
| Transport | `src/transport/http-client.js` | `_request`, `_requestText`, `_requestBinary`, `_requestLogaProjection` | Shared request implementation |
| Transport | `src/transport/auth.js` | `_resolveAccessToken`, `_buildHeaders` | Token resolution, API key fallback, client headers |
| Transport | `src/transport/body.js` | `isFormDataBody`, `isBinaryBody`, `isJsonBody` | Body classification |
| Transport | `src/transport/response.js` | `readJson`, `parseContentDispositionFilename`, `readResponseHeader`, `extractLogaProjectionMetadata` | Response parsing and projection metadata |
| Utilities | `src/utils/version.js` | `readPackageVersion`, `AI_ENGINE_CLIENT_VERSION` | Package version read |
| Utilities | `src/utils/text.js` | `cleanText`, `cleanList`, `isPlainObject`, `looksLikeUuid`, `compareSemanticVersions` | Common normalization |
| Utilities | `src/utils/roadmap-projection.js` | `countRoadmapProjectionLines` | Markdown roadmap summary helper |
| Utilities | `src/utils/task-binding.js` | `normalizeTaskBindingPolicy`, `normalizeMetadataTaskBinding`, `isActiveBinding`, `activeToolKeysFromRegistry` | Claim/tool binding policy helpers |
| Utilities | `src/utils/context-session.js` | `reminderTokens`, `contextSessionIdFromInput` | Orientation workflow helpers |
| Utilities | `src/utils/verification.js` | `matchesExpectedState`, `buildVerificationError`, `buildEligibilityError` | Post-condition and eligibility errors |
| Gateway | `src/domains/gateway.js` | `query`, `runReportDefinition`, `renderProjection`, `submitActionIntent` | Generic gateway/report/projection/action APIs |
| Health | `src/domains/health.js` | `ping` | Health plus workflow status summary |
| Operator status | `src/domains/operator-status.js` | `currentWorkflowStatus`, `currentArchitectureIntegrityStatus`, `currentSecurityGovernanceStatus`, `getExecutionTelemetryCurrent`, `listExecutionProcessRuns`, `getExecutionProcessRun`, `getGeneratedExecutionUsability`, `getLogaGeneratedExecutionUsabilityProjection`, `getAntiPatternRules`, `currentCodebaseShapeStatus`, `getLatestMemoryProjection` | Operator status and telemetry |
| Agent communications | `src/domains/agent-communications/capabilities.js` | `getCommunicationCapabilities`, `getCollaborationCapabilities`, `getDeploymentCapabilities`, `checkCoordinationPingPongPreflight` | Capability discovery and readiness |
| Agent communications | `src/domains/agent-communications/channels.js` | `listCommunicationChannels`, `listOpenCommunicationChannels`, `getCommunicationChannelStatus`, `getCommunicationChannelParticipants`, `_resolveCoordinationChannelContext` | Transfer channel lookup and disambiguation |
| Agent communications | `src/domains/agent-communications/presence.js` | `getPresenceBoard`, `getChannelPresence`, `markParticipantOnline`, `markParticipantOffline`, `whoIsOnline`, `findOnlineParticipant` | Presence board and participant status |
| Agent communications | `src/domains/agent-communications/messages.js` | `_resolveMessageWatchId`, `postAgentMessage`, `acknowledgeAgentMessage`, `respondToMessageWatch`, `verifyMessageSent`, `verifyMessageReceived`, `getMessageDeliveryReceipt`, `_sendAgentCommsMessage`, `sendCommunicationMessage`, `acceptCommunicationMessage`, `respondToCommunicationMessage`, `attachCommunicationMessageEvidence` | Message send/ack/watch/evidence behavior |
| Agent communications | `src/domains/agent-communications/bundles.js` | `createCommunicationBundle`, `getCommunicationBundle`, `listCommunicationBundles`, `addCommunicationBundleItem`, `uploadCommunicationBundle`, `attachCommunicationBundleToMessage`, `recordCommunicationBundleReceipt`, `recordCommunicationBundleCleanupEvent`, `claimCommunicationBundle` | Bundle lifecycle |
| Agent communications | `src/domains/agent-communications/transfers.js` | `bootstrapCommunication`, `negotiateCommunicationTransfer`, `resolveCommunicationTarget`, `createCommunicationEvidencePacket`, `transferWorkPacket`, `recordCommunicationTransferReceipt`, `acceptCommunicationTransferPacket`, `closeCommunicationTransferPacket`, `getCommunicationTransferHealth` | Transfer packet and receipt lifecycle |
| Agent communications | `src/domains/agent-communications/handoffs.js` | `createCommunicationHandoff`, `acceptCommunicationHandoff` | Handoff lifecycle |
| Agent communications | `src/domains/agent-communications/threads.js` | `openCommunicationThread`, `getCommunicationThread`, `listCommunicationInbox`, `getMyInbox` | Threads and inboxes |
| Agent communications | `src/domains/agent-communications/ping-pong.js` | `startCoordinationPingPong`, `sendCoordinationPing`, `sendCoordinationPong`, `getCoordinationPingPongStatus`, `stopCoordinationPingPong` | Coordination heartbeat workflow |
| Agent communications | `src/domains/agent-communications/connection-workflows.js` | `connectToTransferChannel`, `openAgentChannel`, `startAgentConnection`, `acceptAgentChannel`, `postAgentHeartbeat`, `closeAgentChannel` | Agent channel bootstrap and lifecycle |
| Agent communications | `src/domains/agent-communications/friction.js` | `listCommunicationFrictionTaxonomy`, `recordCommunicationFrictionEvent` | Friction taxonomy/event recording |
| Collaboration | `src/domains/collaboration/proposals.js` | `reviewCollaborationProposal`, `reviseCollaborationProposal`, `raiseCollaborationBlocker`, `beginCollaborationImplementation`, `requestCollaborationClosure` | Collaboration proposal choreography |
| Collaboration | `src/domains/collaboration/facade.js` | `collaboration` constructor facade | Friendly aliases over agent communication and proposal modules |
| Operations | `src/domains/operator/current-project.js` | `currentProjectStatus`, `getDashboard` | Operator dashboard state |
| Operations | `src/domains/database/backups.js` | `createDatabaseBackup`, `listDatabaseBackups`, `getDatabaseBackup`, `listDatabaseBackupOperations`, `runAzureSqlBacpacBackup`, `listAzureSqlBacpacBackups`, `listAzureSqlBacpacBackupOperations` | Database and Azure SQL backup surfaces |
| Governance | `src/domains/governance/session.js` | `startSessionGovernance`, `startReviewGovernance`, `completeTurn`, `evaluateTurnCompliance`, `blockIfNonCompliant` | Session/review/turn governance |
| Governance | `src/domains/governance/claims.js` | `startWork`, `startClaimedWork`, `claimWorkItem`, `bindClaimedWorkItem`, `getClaim`, `claimIsValid`, `signoffClaim`, `promoteClaimSurface` | Work claims and signoff |
| Governance | `src/domains/governance/execution-eligibility.js` | `getExecutionEligibility`, `_assertExecutionEligibility` | Mutation gate eligibility |
| Governance | `src/domains/governance/tool-binding-approvals.js` | `createWorkflowToolBindingApprovalLane`, `recordWorkflowToolBindingApprovalDecision`, `executeWorkflowToolBindingApprovalBinding`, `revalidateWorkflowToolBindingStartup` | Tool binding approval workflow |
| Governance | `src/domains/governance/verified-mutations.js` | `executeVerifiedMutation` | Generic post-condition verification primitive |
| Project delivery | `src/domains/project-delivery/charter.js` | `runCharter`, `createProjectDelivery`, `approveProjectCharterIntent`, `approveImplementationRoadmap`, `runProjectCharter`, `beginImplementationRoadmap`, `routeImplementationItem` | Delivery facade and charter/roadmap approvals |
| Project delivery | `src/domains/project-delivery/assistant-turns.js` | `persistAssistantTurn` | Assistant turn persistence |
| External execution | `src/domains/external-projects/status.js` | `getExternalProjectStatus`, `getExternalProjectRoadmapSummary`, `getExternalProjectRoadmapActiveItem`, `listExternalProjectOpenTasks`, `getExternalProjectStatusBundle` | External project reads |
| External execution | `src/domains/external-projects/audio-renders.js` | `createExternalAudioRender`, `getExternalAudioRender`, `downloadExternalAudioRender` | Audio render lifecycle |
| External execution | `src/domains/external-projects/artifacts.js` | `listExternalWorkflowRunArtifacts`, `downloadExternalWorkflowRunArtifact` | External workflow artifacts |
| Retrieval | `src/domains/retrieval/wrapper.js` | `getCommandCard`, `resolveOperatingProcedure`, `getSymbolDefinition`, `getRelatedCode` | Retrieval wrapper endpoints |
| Retrieval | `src/domains/retrieval/repo-inventory.js` | `listRepositories`, `getRepository`, `listProjects`, `getProject`, `listCodeFiles`, `getCodeFile`, `getCodeFileContentWindow`, `listCodeSymbolsByFile`, `getCodeSymbol`, `searchSymbols`, `getSymbolRelationships`, `listCodeRelationships`, `listActionObservations`, `listCodebaseShapeFindings`, `listObjectFlowObservations`, `getChangeAnalysis`, `listRefactorCandidates`, `analyzeRefactorCandidate`, `getRepoRetrievalPacket`, `getRepoRetrievalPacketFragments`, `evaluateProposalScope` | Repository intelligence |
| Retrieval | `src/domains/retrieval/management.js` | `getRetrievalStatus`, `getRetrievalProfileMetrics`, `getRetrievalFeedbackMetrics`, `getRetrievalQuery`, `getRetrievalPacket`, `generateRetrievalCandidates`, `selectRetrievalPacket`, `recordRetrievalFeedback`, `deriveRetrievalOptimizationCandidates`, `validatePromptAssembly` | Retrieval lifecycle and feedback |
| Workflows | `src/domains/workflows/definitions.js` | `listWorkflows`, `createWorkflow`, `getWorkflow`, `replaceWorkflowSteps`, `publishWorkflow`, `cloneWorkflow` | Workflow definition lifecycle |
| Workflows | `src/domains/workflows/governance.js` | `evaluateWorkflowGovernance`, `listWorkflowGovernanceDecisions`, `getWorkflowGovernanceSimulation`, `listWorkflowGovernanceBundles`, `listWorkflowGovernanceApprovals`, `listWorkflowGovernanceEvents`, `getWorkflowGovernanceReview`, `createWorkflowGovernanceReviewDecision` | Workflow governance reads/writes |
| Workflows | `src/domains/workflows/runs.js` | `createWorkflowRun`, `getWorkflowRun`, `listWorkflowArtifacts`, `getWorkflowRunSubstrate`, `getWorkflowPlayback`, `resumeWorkflowRun` | Workflow run lifecycle |
| Workflows | `src/domains/workflows/inspector.js` | `listRecentInspectorRuns`, `inspectWorkflowRun` | Run inspection |
| Workflows | `src/domains/workflows/human-tasks.js` | `listManualTasks`, `listApprovalTasks`, `completeManualTask`, `approveTask` | Human task completion |
| Projects | `src/domains/projects/chartering.js` | `createProjectCharter` | Project charter creation |
| Projects | `src/domains/projects/lifecycle.js` | `listProjects`, `getProject`, `listProjectWorkflowRuns`, `closeProject`, `closeActiveProject`, `getProjectBundle` | Project reads and close behavior |
| Projects | `src/domains/projects/reports.js` | `getProjectCharterReport`, `createProjectMarkdownDownload`, `downloadProjectMarkdownReport`, `downloadProjectCharterReportMarkdown` | Project reports/downloads |
| Projects | `src/domains/projects/resume.js` | `resumeProjectWork` | Project resume context |
| Project workflows | `src/domains/project-closure/close-roadmap-item-workflow.js` | `closeRoadmapItemWorkflow` | Cross-domain closure workflow; depends on projects, roadmaps, governance, implementation |
| LOGA projections | `src/domains/projections/loga-projects.js` | `getLogaOperatorHomeProjection`, `getLogaProjectCatalogProjection`, `getLogaProjectPortfolioProjection`, `getLogaProjectRoadmapProjection`, `getLogaRoadmapItemProjection`, `getLogaWorkflowRunProjection`, `getLogaEvidencePacketProjection` | Project/operator LOGA projections |
| LOGA projections | `src/domains/projections/loga-transfers.js` | `getLogaTransferHomeProjection`, `getLogaTransferInboxProjection`, `getLogaTransferPacketProjection`, `getLogaTransferNegotiationEventsProjection`, `getLogaTransferFrictionLaneProjection`, `getLogaTransferReceiptsProjection`, `getLogaTransferClosureReviewProjection` | Transfer LOGA projections |
| UX remediation | `src/domains/loga/ux-remediation.js` | `submitUxGateRemediation`, `listUxGateRemediations`, `getUxGateRemediation`, `appendUxRemediationTicketNote`, `listUxRemediationTicketNotes`, `promoteUxGateRemediationImplementationCandidate`, `getLogaUxGateRemediationProjection` | UX gate remediation workflow |
| Scripts | `src/domains/scripts/generated-scripts.js` | `generateScript`, `renderScript`, `submitScriptArtifact`, `getScriptRunEvidence` | Script generation and evidence |
| Roadmaps | `src/domains/roadmaps/reads.js` | `listProjectRoadmaps`, `getProjectRoadmap`, `getProjectRoadmapSummary`, `getProjectRoadmapActiveItem`, `listProjectOpenTasks`, `getProjectPerformanceMetrics` | Roadmap/task/project metrics reads |
| Roadmaps | `src/domains/roadmaps/reports.js` | `getProjectImplementationRoadmapReport`, `downloadProjectImplementationRoadmapReportMarkdown` | Roadmap report downloads |
| Roadmaps | `src/domains/roadmaps/task-surface.js` | `ensureProjectRoadmapTaskSurface` | Task surface materialization |
| Roadmaps | `src/domains/roadmaps/implementation-packet-materializer.js` | `importImplementationPacketAndMaterializeRoadmap`, `_resolveImplementationPacketProjectReference`, `_resolveImplementationPacketWorkflowReference`, `_resolveImplementationPacketWorkflowId` | Packet import plus roadmap/workflow binding |
| Implementation | `src/domains/implementation/tasks.js` | `createImplementationTask`, `listImplementationTasks`, `listImplementationSubtasks`, `updateImplementationTask`, `assignImplementationTask`, `completeImplementationTask` | Implementation item task lifecycle |
| Implementation | `src/domains/implementation/packets.js` | `importImplementationPacket`, `listImplementationPackets`, `getImplementationPacket`, `createImplementationPacketGateDecision`, `bindImplementationPacketToWorkflow`, `getWorkflowImplementationRoadmap`, `getWorkflowResumeContext` | Packets, gates, workflow binding |
| Implementation | `src/domains/implementation/checks.js` | `getImplementationItemAcceptanceChecks`, `updateAcceptanceCheckStatus`, `updateAcceptanceCheckStatusVerified` | Acceptance checks and verified updates |
| Implementation | `src/domains/implementation/artifacts.js` | `getArtifactManifest`, `getDecisionPacket`, `verifyImplementationItemArtifacts` | Artifact reads and verification |
| Implementation | `src/domains/implementation/items.js` | `updateImplementationItemStatus`, `updateImplementationItemStatusVerified`, `addImplementationItemEvidence`, `addImplementationItemActivity`, `listImplementationItemActivity` | Item status, evidence, activity |
| Skills | `src/domains/skills/registry.js` | `currentSkillRegistryStatus`, `getSkillContract`, `getSkillGovernance`, `createSkillContractDraft`, `recordSkillPatternReview`, `approveSkillContract`, `createWorkflowSkillContract`, `listWorkflowSkillBindings`, `seedFrequentOperationSkills` | Skill registry and workflow skill contracts |
| Skills | `src/domains/skills/governance.js` | `createSkillGovernanceChange`, `listSkillGovernanceChanges`, `getSkillGovernanceChange` | Skill governance changes |
| Capabilities | `src/domains/capabilities.js` | `listCapabilities`, `createCapability`, `testCapability` | Capability registry |
| Tools | `src/domains/tools/registry.js` | `currentToolRegistryStatus`, `getWorkflowToolRegistry`, `currentAssistantToolContext`, `getTool`, `getToolHistory`, `getToolInvocations`, `getToolEventReplayBundle` | Tool registry reads |
| Tools | `src/domains/tools/governance.js` | `getToolGovernance`, `createToolReviewDecision`, `createToolGateDecision` | Tool governance decisions |
| Context | `src/domains/context-assembly.js` | `getContextAssemblyContract`, `getContextAssemblyStatus`, `getOperatorContext`, `getContextFragments`, `getContextReuse`, `listPromptAssemblies` | Context assembly |
| Performance | `src/domains/performance.js` | `getSessionPerformanceMetrics`, `captureBenchmarkSnapshot`, `listBenchmarks`, `getBenchmarkMetrics`, `getBenchmarkDelta`, `getBenchmarkTrend`, `getPerformanceDashboard` | Metrics and benchmark snapshots |
| Portfolio | `src/domains/portfolio/reads.js` | `getPortfolioStatus`, `getPortfolioSummary`, `getPortfolioExceptions`, `getPortfolioProject`, `getPortfolioReport`, `getPortfolioBundle` | Portfolio reads |
| Portfolio | `src/domains/portfolio/closure-readiness.js` | `getPortfolioClosureReadiness` | Cross-domain portfolio closure readiness workflow |
| Learning | `src/domains/self-learning.js` | `getSelfLearningPosture`, `listLearningRecords`, `getLearningRecord`, `listPromotionCandidates`, `getPromotionCandidate`, `listPromotionFlows` | Learning and promotion flow reads |
| Optimization | `src/domains/self-optimization.js` | `getSelfOptimizationDashboard`, `getSelfOptimizationCandidateQueue`, `getSelfOptimizationBacklogPosture`, `getSelfOptimizationPendingHandoffs` | Optimization backlog and handoffs |
| Design | `src/domains/design-intelligence.js` | `getDesignIntelligenceDashboard`, `listDesignDecisions`, `getDesignDecision`, `getDesignDecisionVariants`, `getDesignDecisionCritique`, `getDesignDecisionLineage`, `listDesignPatterns`, `getDecisionLabCanvas`, `getDesignRecommendations`, `getDesignPromotions`, `previewDesignPromotion`, `getDesignIntelligenceMetrics` | Design intelligence |
| Discovery | `src/domains/script-discovery.js` | `scanScripts`, `listDiscoveredScriptAssets`, `listDiscoveredCapabilities`, `listWorkflowCandidates`, `promoteWorkflowCandidate` | Script and workflow discovery |
| Notes | `src/domains/notes-lab.js` | `getNotesLabConfig`, `submitNote`, `approveNoteReview` | Notes review |
| Search | `src/domains/search-contacts.js` | `search`, `getOrganization`, `getContact` | Search and contact lookup |
| Benchmarks | `src/domains/benchmarks.js` | `listRecentBenchmarkRuns`, `getBenchmarkRun` | Benchmark runs |
| Commit governance | `src/domains/commit-governance.js` | `evaluateCommitGovernance`, `checkGitShipReadiness`, `getCommitGovernanceEvaluation`, `listCommitGovernanceEvaluationsByClaim` | Commit readiness workflow |
| Context sessions | `src/domains/context-sessions.js` | `openContextSession`, `getOrientationWindow`, `acknowledgeReminder`, `completeOrientation`, `lockContextSessionClaim`, `getContextSessionGateStatus`, `conductOrientation` | Orientation and context-session gates |

## Slice Strategy

The transformation should move in dependency order. Early slices create shared infrastructure, middle slices move thin endpoint groups, and late slices move cross-domain workflows that depend on the extracted modules.

| Slice | Theme | Modules | Why this order works |
|---:|---|---|---|
| 0 | Fixtures and compatibility harness | Request fixtures for `ping`, `query`, `startAgentConnection`, `startClaimedWork`, `resumeProjectWork`, `closeRoadmapItemWorkflow`, `getPortfolioClosureReadiness`, `conductOrientation`; `src/compat/aliases.js` scaffold | Establishes behavior guardrails and a place for aliases before moving code |
| 1 | Core substrate | `constants/*`, `transport/*`, `utils/*`, `client.js`, `index.js` barrel | Every later module depends on constants, transport, and helpers |
| 2 | Small endpoint domains | `health.js`, `operator-status.js`, `gateway.js`, `operator/current-project.js`, `database/backups.js`, `capabilities.js`, `benchmarks.js`, `search-contacts.js`, `notes-lab.js` | Low orchestration risk; proves the module pattern quickly |
| 3 | Retrieval and workflow reads | `retrieval/*`, `workflows/definitions.js`, `workflows/governance.js`, `workflows/runs.js`, `workflows/inspector.js`, `workflows/human-tasks.js` | Mostly request wrappers with clear endpoint ownership |
| 4 | Agent communications base | `agent-communications/capabilities.js`, `channels.js`, `presence.js`, `threads.js`, `messages.js`, `bundles.js`, `friction.js`, `handoffs.js` | Splits the largest current cluster into testable communication primitives |
| 5 | Agent communication workflows | `agent-communications/transfers.js`, `ping-pong.js`, `connection-workflows.js`, `collaboration/*` | Builds on the communication primitives from Slice 4 |
| 6 | Governance substrate | `governance/session.js`, `claims.js`, `execution-eligibility.js`, `tool-binding-approvals.js`, `verified-mutations.js` | Must exist before implementation and closure workflows move |
| 7 | Projects and project delivery | `project-delivery/*`, `external-projects/*`, `projects/chartering.js`, `projects/lifecycle.js`, `projects/reports.js`, `projects/resume.js` | Separates project APIs from LOGA, roadmaps, and closure orchestration |
| 8 | Projections and script surfaces | `projections/*`, `loga/ux-remediation.js`, `scripts/generated-scripts.js`, `script-discovery.js` | Pulls rendering/script surfaces out of the project section |
| 9 | Roadmaps and implementation | `roadmaps/*`, `implementation/*` | Creates the dependencies needed by roadmap closure workflows |
| 10 | Registry and intelligence domains | `skills/*`, `tools/*`, `context-assembly.js`, `performance.js`, `self-learning.js`, `self-optimization.js`, `design-intelligence.js` | Medium-sized but mostly independent operator domains |
| 11 | Cross-domain workflows | `project-closure/close-roadmap-item-workflow.js`, `portfolio/closure-readiness.js`, `commit-governance.js`, `context-sessions.js` | These compose many earlier domains and should move after their dependencies exist |
| 12 | Final cleanup | Remove moved code from `index.js`, tighten barrel exports, update README examples | Leaves `index.js` as composition root and compatibility layer |

## Slice Workload Grouping

For the acceleration engine, the slices can be batched by risk profile:

| Batch | Contains slices | Approximate module count | Risk profile |
|---|---|---:|---|
| Batch A | 0-2 | 20-25 | Low; infrastructure and small wrappers |
| Batch B | 3-5 | 20-25 | Medium; retrieval, workflow wrappers, communication workflows |
| Batch C | 6-9 | 25-35 | High; governance, projects, roadmaps, implementation |
| Batch D | 10-12 | 20-25 | Medium-high; intelligence domains plus cross-domain workflows and cleanup |

Recommended operating mode:

- Use Batch A as the pilot.
- Run Batches B and C only after alias preservation and request fixtures are working.
- Keep Batch D last because it contains workflows that should compose already-extracted modules.

## Module Ownership Rules

Use these rules when a method could belong to more than one module:

- Endpoint wrappers belong to the module named after the backend resource path.
- Methods that coordinate three or more domains belong to a workflow module.
- Methods that only normalize inputs for a resource stay with that resource module.
- Methods that enforce mutation eligibility or post-condition verification belong to governance.
- LOGA projection methods belong to projections unless they mutate remediation state.
- Constructor facade methods are aliases, not ownership boundaries.
- Private helpers move with their owning workflow unless more than one module needs them.
- `index.js` should not import individual endpoint functions directly once a domain client exists; it should compose domain clients and attach aliases.

## Composition Pattern

The public `AIEngineClient` should become a composition root:

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
    this.roadmaps = createRoadmapsClient(this.transport);
    this.implementation = createImplementationClient(this.transport, this.governance);
    this.projectClosure = createProjectClosureWorkflows({
      projects: this.projects,
      roadmaps: this.roadmaps,
      governance: this.governance,
      implementation: this.implementation,
    });
    this.portfolio = createPortfolioClient(this.transport, {
      projects: this.projects,
      roadmaps: this.roadmaps,
      projections: this.projections,
    });

    attachBackwardCompatibleAliases(this);
  }
}
```

Existing top-level methods should remain as aliases for at least one major version:

```js
closeRoadmapItemWorkflow(input) {
  return this.projectClosure.closeRoadmapItemWorkflow(input);
}

getPortfolioClosureReadiness(input) {
  return this.portfolio.getClosureReadiness(input);
}
```

## Recommended Extraction Flow

### Phase 1: Transport, Constants, And Helpers

Extract:

- Version/package reading.
- Constants.
- Text/list/object helpers.
- Communication enum normalizers.
- Task binding helpers.
- Roadmap projection line counting.
- Verification and eligibility error builders.
- JSON/text/binary request functions.
- Header construction and auth token resolution.

Outcome:

- `index.js` no longer owns utility code.
- Every domain can share one transport.

### Phase 2: Thin Endpoint Domains

Extract mostly one-call wrappers:

- Health.
- Operator status.
- Gateway.
- Database.
- Retrieval wrapper.
- Repo inventory.
- Retrieval management.
- Workflow definitions.
- Workflow governance.
- Workflow runs.
- Workflow inspector.
- Manual and approval tasks.
- Skills.
- Capabilities.
- Tools.
- Context assembly.
- Performance.
- Self-learning.
- Self-optimization.
- Design intelligence.
- Script discovery.
- Notes lab.
- Search and contacts.
- Benchmarks.

Outcome:

- The file shrinks quickly.
- Request paths become owned by clear domains.

### Phase 3: Agent Communication And Collaboration

Extract:

- Capabilities.
- Channels.
- Presence.
- Transfer channels.
- Messages.
- Message watches.
- Bundles.
- Transfer receipts.
- Handoffs.
- Friction events.
- Ping-pong coordination.
- Connection bootstrap workflows.
- Collaboration proposal/revision/blocker/closure workflows.

Outcome:

- The overloaded `Data Access Gateway` section loses its largest cluster.
- `agentComms` and `collaboration` become real clients, not constructor alias bags.

### Phase 4: Governance And Verified Mutations

Extract:

- Session governance.
- Review governance.
- Work start.
- Claims.
- Claim validity.
- Claimed work binding.
- Execution eligibility.
- Signoff.
- Claim surface promotion.
- Workflow tool binding approvals.
- Turn compliance.
- `executeVerifiedMutation`.

Outcome:

- Verified mutation behavior becomes reusable by implementation and closure workflows.

### Phase 5: Projects, Roadmaps, And Implementation

Extract:

- Project chartering and delivery.
- Project lifecycle and reports.
- Project resume context.
- Roadmap reads/reports.
- Roadmap task surface.
- Implementation packet materialization.
- Implementation tasks.
- Implementation packets.
- Acceptance checks.
- Artifacts.
- Evidence.
- Gate decisions.
- Verified implementation actions.

Outcome:

- Project delivery and roadmap implementation workflows become composable modules.

### Phase 6: Cross-Domain Workflows

Extract these last, after their dependencies are real modules:

- `closeRoadmapItemWorkflow(...)`
- `getPortfolioClosureReadiness(...)`
- `conductOrientation(...)`
- `checkGitShipReadiness(...)`

Outcome:

- Workflow modules compose domain clients instead of calling dozens of sibling methods on one large class.

## Backward Compatibility Contract

Preserve all current call styles:

```js
const client = createAIEngineClient({ baseUrl });

await client.ping();
await client.createProjectCharter(payload);
await client.resumeProjectWork({ projectIdentifier });
await client.closeRoadmapItemWorkflow({ projectIdentifier });
await client.getPortfolioClosureReadiness();
await client.agentComms.openThread(payload);
await client.collaboration.reviewProposal(payload);
```

Recommended rule:

- Existing top-level methods stay as aliases.
- Existing constructor facades stay available.
- New domain namespaces become the preferred documented API.
- No endpoint path, HTTP method, body shape, or return shape should change during extraction.

## Request Contract Fixtures To Generate Upstream

Before implementation, upstream agents should generate fake-fetch request fixtures for:

- `ping`
- `query`
- `startAgentConnection`
- `connectToTransferChannel`
- `startCoordinationPingPong`
- `transferWorkPacket`
- `startClaimedWork`
- `bindClaimedWorkItem`
- `claimIsValid`
- `resumeProjectWork`
- `closeProject`
- `closeRoadmapItemWorkflow`
- `importImplementationPacketAndMaterializeRoadmap`
- `updateImplementationItemStatusVerified`
- `verifyImplementationItemArtifacts`
- `getPortfolioClosureReadiness`
- `conductOrientation`

These fixtures are the guardrails for making the split without changing behavior.

## Upstream Remediation Ticket Draft

Title:

Refactor AI Engine SDK `src/index.js` into composed domain modules while preserving compatibility

Problem:

`@bpmsoftwaresolutions/ai-engine-client@1.1.71` publishes a single `src/index.js` file with roughly 6,456 lines, 369 class methods, 34 top-level helpers, and 331 request calls. The file mixes transport, constants, normalization, agent communications, collaboration, governance, projects, roadmaps, implementation packets, portfolio readiness, retrieval, workflows, and context-session orchestration.

Recent workflow additions such as `closeRoadmapItemWorkflow(...)` and `getPortfolioClosureReadiness(...)` are valuable, but they make the single-file structure harder to maintain because they coordinate multiple backend domains from inside one class.

Acceptance criteria:

- `src/index.js` becomes a public export barrel and compatibility composition root.
- Constants move into dedicated constant modules.
- HTTP behavior moves into `src/transport/*`.
- Helper functions move into focused utility modules.
- Agent communications, collaboration, governance, projects, roadmaps, implementation, retrieval, workflows, portfolio, context sessions, and operator intelligence live in separate domain modules.
- `closeRoadmapItemWorkflow(...)` moves into a project closure workflow module.
- `getPortfolioClosureReadiness(...)` moves into a portfolio closure readiness workflow module.
- All existing top-level client methods remain callable.
- Existing constructor facades remain callable.
- Request contract fixtures prove endpoint paths, methods, query params, bodies, and response handling did not change.

Suggested PR order:

1. Extract constants, helpers, and transport.
2. Extract thin endpoint domains.
3. Extract agent communications and collaboration.
4. Extract governance and verified mutations.
5. Extract projects, roadmaps, and implementation.
6. Extract cross-domain workflows.

## Bottom Line

The current SDK has evolved beyond an endpoint wrapper. It now contains real AI Engine workflows. That is useful and worth preserving, but those workflows need to live as composed modules with explicit dependencies.

The upstream agents should not rewrite behavior. They should first freeze request behavior with fixtures, then move implementation behind the same public API one domain at a time.
