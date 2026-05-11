# AI Engine SDK — Workflow Taxonomy

**SDK:** `@bpmsoftwaresolutions/ai-engine-client` v1.1.102  
**Methods inventoried:** 370+ public | 70 domain namespaces | 87 source files  
**Analysis date:** 2026-05-10 — updated 2026-05-11

---

## Purpose

This document classifies every method in the AI Engine SDK into named, executable workflows. A workflow is an ordered sequence of SDK calls that collectively accomplish a meaningful outcome. Methods are not documented in isolation — they are shown in the context of what they collectively enable.

Where the workflow model has gaps — missing steps, one-way lanes, or pull-only patterns that should be push — those gaps are called out explicitly.

---

## How to Read This Document

- `→` means "feeds into" or "must precede"
- Methods marked `*` are **composite helpers** that internally wrap multiple steps
- **Gaps** at the end of each workflow flag broken or missing links in the chain
- Steps labeled _(receiver)_ are called by the other party in a two-agent exchange
- **Namespace paths** _(v1.1.101)_: every top-level method is also accessible as `client.domain.method()`. The SDK was refactored from a flat class into 70 typed domain namespaces (87 source files). The flat `client.method()` style is preserved as a backward-compatible alias. New code should use namespace paths. See the domain surface map in each workflow where applicable.

---

## Table of Contents

1. [Agent Session Startup](#1-agent-session-startup)
2. [Project Chartering](#2-project-chartering)
3. [Implementation Planning](#3-implementation-planning)
4. [Governed Work Execution — Claim Lifecycle](#4-governed-work-execution--claim-lifecycle)
5. [Roadmap Item Execution](#5-roadmap-item-execution)
6. [Commit Governance & Ship Readiness](#6-commit-governance--ship-readiness)
7. [UX Gate Remediation](#7-ux-gate-remediation)
8. [Agent Communication — Channel Establishment](#8-agent-communication--channel-establishment)
9. [Agent Communication — Messaging Loop](#9-agent-communication--messaging-loop)
10. [Agent Coordination Ping-Pong](#10-agent-coordination-ping-pong)
11. [Work Transfer & Handoff](#11-work-transfer--handoff)
12. [Collaboration Proposal](#12-collaboration-proposal)
13. [Workflow Definition & Governance](#13-workflow-definition--governance)
14. [Script Lifecycle](#14-script-lifecycle)
15. [Script Discovery → Workflow Promotion](#15-script-discovery--workflow-promotion)
16. [Code Analysis & Refactoring](#16-code-analysis--refactoring)
17. [Retrieval-Augmented Prompt Assembly](#17-retrieval-augmented-prompt-assembly)
18. [Performance Benchmarking](#18-performance-benchmarking)
19. [Database Backup](#19-database-backup)
20. [Audio Artifact Rendering](#20-audio-artifact-rendering)
21. [Self-Learning Pipeline](#21-self-learning-pipeline)
22. [Design Intelligence](#22-design-intelligence)
23. [Manual & Approval Tasks](#23-manual--approval-tasks)
24. [Warehouse Modernization Pipeline](#24-warehouse-modernization-pipeline)
25. [Gap Analysis Summary](#25-gap-analysis-summary)
26. [Coverage Summary Table](#26-coverage-summary-table)

---

## 1. Agent Session Startup

Every agent session begins here. This is the canonical ramp-up sequence before any work is performed.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `AIEngineClient.fromEnv()` | Instantiate client from environment variables |
| 2 | `ping()` | Confirm service health and get live workflow status |
| 3 | `getLatestMemoryProjection()` | Hydrate SQL memory state — startup context |
| 4 | `resumeProjectWork({ projectIdentifier, actorMode, executionIntent })` | Resolve project, roadmap state, workflow context, tool bindings, and continuation brief |

**Composite:** `resumeProjectWork` wraps steps 3–4 for agent continuation scenarios. It is the canonical single-call startup.

**External API variant:** `getExternalProjectResumeContext(projectId, { actorMode, executionIntent })` — equivalent bootstrap over API-key auth, no bearer token required.

---

## 2. Project Chartering

Define what gets built, by whom, and under what constraints.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `createProjectCharter({ projectName, objective, businessContext, successCriteria, priority, ... })` | Write charter to SQL memory |
| 2 | `getProjectCharterReport(projectId)` | Read back the SQL-backed charter payload |
| 3 | `approveProjectCharterIntent(projectId, body)` | Gate: operator approves the charter intent |
| 4 | `runProjectCharter(projectId, body)` | Execute the charter, triggering downstream workflow |
| 5 | `downloadProjectCharterReportMarkdown(projectId)` | Download charter as human-readable markdown |

**Status reads (any point):**
- `getProject(projectId)` — project detail
- `currentProjectStatus({ projectId })` — live status
- `getProjectBundle(projectId)` — charter + status + roadmap in one call

---

## 3. Implementation Planning

Turn an approved charter into a structured roadmap with executable tasks.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `listImplementationPackets({ status, packetType })` | Find available packets |
| 2 | `getImplementationPacket(packetId)` | Inspect packet before binding |
| 3 | `importImplementationPacketAndMaterializeRoadmap(packetPayload, { importedBy, assignedTo, ... })` | Import → bind → materialize → return roadmap |
| 4 | `getProjectRoadmap(projectId)` | Read full roadmap |
| 5 | `getProjectRoadmapActiveItem(projectId)` | Identify the current active roadmap item |
| 6 | `ensureProjectRoadmapTaskSurface(projectId, { requestedBy, assignedTo, createAcceptanceSubtasks })` | Materialize task tree for the active item |

**Composite:** Step 3 (`importImplementationPacketAndMaterializeRoadmap`) wraps steps 3–6 into a single call.

**Reports:**
- `getProjectImplementationRoadmapReport(projectId)`
- `downloadProjectImplementationRoadmapReportMarkdown(projectId)`

---

## 4. Governed Work Execution — Claim Lifecycle

The governance envelope around any agent doing actual work. Claims are the atomic unit of accountability. Every status update, acceptance check, and mutation requires an active claim.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `getExecutionEligibility(body)` | Verify the actor is eligible to proceed _(call before opening a session)_ |
| 2 | `openContextSession({ agentId, runtimeSessionId, intentId, executionPurpose })` | Open an oriented context session |
| 3 | `getOrientationWindow(contextSessionId)` | Read orientation data — guidelines and reminders |
| 4 | `acknowledgeReminder(contextSessionId, { reminderId, agentSignature, understandingSummary })` | Acknowledge each reminder |
| 5 | `completeOrientation(contextSessionId)` | Signal orientation complete |
| 6 | `lockContextSessionClaim(input)` | Lock the session to a claim |
| 7 | `claimWorkItem(body)` | Bind the claim-locked context to a specific work item |
| — | — | _or use the composite below_ |
| 1–7* | `startClaimedWork({ claimName, actorId, intentId, declaredScopeFiles, allowedMutationSurfaces, ... })` | Open context + governance + declare scope + return claim envelope |
| 8 | `persistAssistantTurn({ project_id, session_key, user_request, assistant_summary, changed_files })` | Persist each turn to SQL memory _(call after every assistant response)_ |
| 9 | `evaluateTurnCompliance(sessionId)` | Evaluate compliance of the completed turn |
| 10 | `blockIfNonCompliant(sessionId)` | Block progression if turn is non-compliant |
| 11 | `signoffClaim(claimId, body)` | Close the claim and sign off |

**Claim preflight _(v1.1.71)_:** `claimIsValid(claimId)` — call before any governed write when the claim was opened in a prior session. Returns a boolean. If `false`, start a fresh claim via `startClaimedWork` before proceeding. The backend does not expose `getActiveClaim(projectId)` yet; this is the governed fallback path.

---

## 5. Roadmap Item Execution

The innermost execution loop: working through one item on the roadmap under an active claim.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `getProjectRoadmapActiveItem(projectId)` | Identify the current item |
| 2 | `getLogaRoadmapItemProjection(projectId, itemKey)` | Get full LOGA runtime view — navigation, evidence, and available actions |
| 3 | `listImplementationTasks(implementationItemId)` | List all tasks on this item |
| 4 | `createImplementationTask(implementationItemId, { title, ... })` | Create tasks as needed |
| 5 | `assignImplementationTask(taskId, { assignedTo, assignedBy })` | Assign task to an actor |
| 6 | `updateImplementationItemStatus(implementationItemId, body)` | Advance item status _(requires active claim)_ |
| 7 | `executeVerifiedMutation({ ... })` | Perform a governed mutation with post-condition verification |
| 8 | `getImplementationItemAcceptanceChecks(implementationItemId)` | Read acceptance check definitions |
| 9 | `updateAcceptanceCheckStatus(implementationItemId, acceptanceCheckId, body)` | Mark each acceptance check _(requires active claim)_ |
| 10 | `addImplementationItemEvidence(implementationItemId, body)` | Attach evidence links |
| 11 | `verifyImplementationItemArtifacts(implementationItemId, { requiredArtifacts })` | Confirm all required artifacts are present |
| 12 | `completeImplementationTask(taskId, { completedBy })` | Close each task |

**Decision gate (optional between steps 11–12):** `createImplementationPacketGateDecision(packetId, body)` — required when a gate review must be recorded before closure.

**Item activity log:** `addImplementationItemActivity` / `listImplementationItemActivity` — append and read freeform activity at any step.

**Full closure composite _(v1.1.71)_:** `closeRoadmapItemWorkflow({ projectIdentifier, claimId, gateType, gateDecision, closeProjectIfNoRemainingOpenItems, ... })` — wraps steps 1–12 and project closure into a single governed call. Internally it: resumes the project, loads the active item, validates or creates the claim via `claimIsValid`, verifies acceptance checks and artifacts, records the gate decision, advances to terminal status, attaches evidence, signs off the claim, reloads the active item, and closes the project when no open items remain. Use this instead of the manual sequence wherever the full closure path is needed.

---

## 6. Commit Governance & Ship Readiness

Governs what code actually gets committed and promoted. Runs after implementation work is complete, before signoff.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `listCommitGovernanceEvaluationsByClaim(claimId, { limit })` | Review prior evaluations for this claim |
| 2 | `evaluateCommitGovernance({ ... })` | Evaluate the proposed commit against governance rules |
| 3 | `getCommitGovernanceEvaluation(evaluationId)` | Inspect the evaluation result |
| 4 | `checkGitShipReadiness({ ... })` | Final ship-readiness check |
| 5 | `promoteClaimSurface({ ... })` | Promote the claim surface to the next tier |

---

## 7. UX Gate Remediation

When a LOGA projection fails a UX gate, this is the structured remediation loop.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `submitUxGateRemediation({ ... })` | Open a SQL-backed remediation ticket |
| 2 | `listUxRemediationTicketNotes(remediationId)` | Read any existing notes |
| 3 | `appendUxRemediationTicketNote(remediationId, body)` | Append downstream-facing context |
| 4 | `getUxGateRemediation(remediationId)` | Read current ticket state |
| 5 | `getLogaUxGateRemediationProjection(remediationId)` | Get LOGA runtime view of the ticket |
| 6 | `promoteUxGateRemediationImplementationCandidate(remediationId, { promotedBy })` | Promote ticket to an implementation packet candidate |

**Listing:** `listUxGateRemediations({ projectionType, status })` — filter across all open remediations.

**Namespace access _(v1.1.101)_:** All UX gate remediation methods are also accessible as `client.loga.*`:
```js
await client.loga.submitUxGateRemediation(body);
await client.loga.getUxGateRemediationProjection(remediationId);
await client.loga.promoteUxGateRemediationImplementationCandidate(remediationId, { promotedBy });
```

---

## 8. Agent Communication — Channel Establishment

The ramp-up sequence for multi-agent communication. All steps are required before message exchange is possible.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `bootstrapCommunication()` | Initialize the communication subsystem |
| 2 | `getCommunicationCapabilities()` | Discover what this agent can do |
| 3 | `getCollaborationCapabilities()` | Discover collaboration posture |
| 4 | `getDeploymentCapabilities()` | Discover deployment posture |
| 5 | `whoIsOnline({ ... })` | Check which agents are currently reachable |
| 6 | `resolveCommunicationTarget({ ... })` | Resolve the target agent or role to a concrete session |
| 7 | `openAgentChannel(request)` | Open the communication channel _(alias: `connectToTransferChannel`)_ |
| 8 | `startAgentConnection({ ... })` | Initiate the connection with handshake |
| 9 | `acceptAgentChannel({ ... })` | _(receiver)_ Accept the inbound channel |
| 10 | `markParticipantOnline({ ... })` | Announce presence on the channel |
| 11 | `getCommunicationChannelStatus({ ... })` | Verify the channel is live |
| 12 | `getCommunicationChannelParticipants({ ... })` | Confirm both parties are present |

**Presence views:** `getPresenceBoard({ ... })` / `getChannelPresence({ ... })` — LOGA projections of current presence state.

**Full channel establishment composite _(v1.1.101)_:** `establishAgentCommunicationChannel({ projectIdentifier })` — wraps steps 1–12 into a single governed call via `client.agentComms.*`. Internally composes: `resumeProjectWork` → `transferWorkPacket` → `openTransferChannel` → `joinTransferChannel` / `resumeTransferChannel` → `postCollaborationHeartbeat` → `getTransferChannelProjection`. Returns `missing_surfaces[]` for any absent surface so callers can safely degrade rather than fail.

> **Gap:** See [Gap 2 — Presence Has No Auto-Expiry](#gap-2--presence-has-no-auto-expiry).

---

## 9. Agent Communication — Messaging Loop

Ongoing message exchange once a channel is established and both parties are present.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `openCommunicationThread({ ... })` | Open a typed thread — `request`, `review`, `handoff`, `coordination`, `task`, `escalation` |
| 2 | `sendCommunicationMessage({ ... })` | Post a message to the thread |
| 3 | `postAgentMessage(request)` | Lower-level: post a message directly to the channel |
| 4 | `postAgentHeartbeat({ ... })` | Maintain channel liveness |
| 5 | `getMyInbox({ ... })` | Poll inbox for incoming messages |
| 6 | `listCommunicationInbox({ ... })` | Broader inbox view across channels |
| 7 | `acknowledgeAgentMessage({ ... })` | Acknowledge a received message |
| 8 | `respondToCommunicationMessage({ ... })` | Post a response |
| 9 | `verifyMessageSent({ ... })` | Confirm the send was recorded |
| 10 | `verifyMessageReceived({ ... })` | Confirm receipt was recorded |
| 11 | `getMessageDeliveryReceipt({ ... })` | Read the formal delivery receipt |

**Evidence attachment:** `attachCommunicationMessageEvidence({ ... })` — attach evidence to any message at any step.

**Messaging loop composite _(v1.1.101)_:** `runInterAgentMessagingLoop({ channelId, workTransferPacketId, replyBodyMarkdown, closeWhenAcknowledged })` — wraps steps 1–11 via `client.agentComms.*`. Internally composes: `resumeTransferChannel` → `replyToTransferChannel` → `startMessageWatch` → `acknowledgeExpectedMessage` → `postCollaborationHeartbeat` → `closeTransferChannel` (when closure criteria are explicit) → `getTransferChannelProjection`. Returns `missing_surfaces[]`.

> **Gap:** See [Gap 1 — No Push/Subscribe Mechanism](#gap-1--no-pushsubscribe-mechanism).

---

## 10. Agent Coordination Ping-Pong

Liveness verification between agents — a structured round-trip heartbeat protocol confirming both sides are responsive before committing to coordinated work.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `checkCoordinationPingPongPreflight({ ... })` | Verify both sides support the ping-pong protocol |
| 2 | `startCoordinationPingPong({ ... })` | Open the ping-pong session |
| 3 | `sendCoordinationPing({ ... })` | Initiator sends ping |
| 4 | `sendCoordinationPong({ ... })` | _(receiver)_ Respond with pong |
| 5 | `getCoordinationPingPongStatus({ ... })` | Poll round-trip state |
| 6 | `stopCoordinationPingPong({ ... })` | Terminate the ping-pong session |

---

## 11. Work Transfer & Handoff

Moving a work packet from one agent to another with negotiated acceptance and formal receipts.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `negotiateCommunicationTransfer({ ... })` | Begin negotiation with the receiving agent |
| 2 | `createCommunicationBundle({ ... })` | Package artifacts into a transfer bundle |
| 3 | `addCommunicationBundleItem({ ... })` | Add items to the bundle |
| 4 | `uploadCommunicationBundle({ ... })` | Upload the bundle |
| 5 | `transferWorkPacket({ ... })` | Initiate formal work transfer |
| 6 | `attachCommunicationBundleToMessage({ ... })` | Attach bundle to the notification message |
| 7 | `acceptCommunicationTransferPacket({ ... })` | _(receiver)_ Accept the transfer |
| 8 | `recordCommunicationTransferReceipt({ ... })` | Record formal receipt |
| 9 | `closeCommunicationTransferPacket({ ... })` | Close the transfer |

**High-level handoff path (alternative to steps 5–9):**

| Step | Method | What it does |
|------|--------|--------------|
| 5* | `createCommunicationHandoff({ ... })` | Create a formal handoff record |
| 6* | `acceptCommunicationHandoff(handoffId)` | _(receiver)_ Accept the handoff |

**Inspection projections (any point):**
- `getLogaTransferPacketProjection(workTransferPacketId)`
- `getLogaTransferNegotiationEventsProjection({ workTransferPacketId, workflowRunId })`
- `getLogaTransferReceiptsProjection({ workTransferPacketId, workflowRunId })`
- `getLogaTransferClosureReviewProjection(workTransferPacketId)`

**Refactoring bundle transfer composite _(v1.1.101)_:** `transferRefactoringBundle({ projectIdentifier, sourceAgent, targetAgent, sourceRef, problemStatement, affectedFilesOrSymbols, recommendedAction, acceptanceCriteria, evidenceRefs, riskLevel, handoffNotes })` — wraps the full bundle packaging and transfer sequence via `client.refactoringTransfers.*`. Internally composes: `resumeProjectWork` / `startWork` → `transferWorkPacket` → `openTransferChannel` / `resumeTransferChannel` → `assignCollaborationOwnership` → `postCollaborationProposal` → `startMessageWatch` → `postCollaborationHeartbeat` → `getTransferChannelProjection`. Fails closed if no explicit `targetAgent` is supplied. Returns `missing_surfaces[]`.

---

## 12. Collaboration Proposal

Structured negotiation between agents before beginning joint work. Used when the scope or terms of collaboration need agreement before implementation starts.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `reviewCollaborationProposal({ ... })` | Initiating agent proposes collaboration terms |
| 2 | `reviseCollaborationProposal({ ... })` | Receiving agent suggests revisions |
| 3 | `raiseCollaborationBlocker({ ... })` | Either side raises a blocker |
| 4 | `beginCollaborationImplementation({ ... })` | Both agree — begin joint work |
| 5 | `requestCollaborationClosure({ ... })` | Request formal close of the collaboration |

**Cross-agent remediation ticket composite _(v1.1.101)_:** `createCrossAgentRemediationTicket({ channelId, workTransferPacketId, assignedTo, requestedBy, sourceRef, blockerSummary, expectedResponse })` — wraps the full ticket creation and notification sequence via `client.communicationTickets.*`. Internally composes: `resumeTransferChannel` → `transferWorkPacket` (when ownership must move) → `raiseCollaborationBlocker` → `reviewCollaborationProposal` (when a proposal id is supplied) → `startMessageWatch` → `postCollaborationHeartbeat` → `getTransferChannelProjection`. Returns `remediation_ticket_id` or `blocker_id` plus `missing_surfaces[]`.

---

## 13. Workflow Definition & Governance

Creating, publishing, and governing a workflow definition including tool and skill binding.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `createWorkflow({ name, slug, description, steps, governanceProfile })` | Create a workflow draft |
| 2 | `replaceWorkflowSteps(workflowId, steps)` | Define or replace step definitions |
| 3 | `evaluateWorkflowGovernance(workflowId)` | Run governance evaluation |
| 4 | `getWorkflowGovernanceSimulation(workflowId)` | Simulate gate outcomes |
| 5 | `createWorkflowGovernanceReviewDecision(workflowId, body)` | Record the review decision |
| 6 | `publishWorkflow(workflowId)` | Publish to the active registry |

**Skill binding sub-workflow:**

| Step | Method | What it does |
|------|--------|--------------|
| a | `createWorkflowSkillContract(body)` | Bind a skill contract to the workflow |
| b | `listWorkflowSkillBindings(workflowId)` | Verify bindings |

**Tool binding sub-workflow:**

| Step | Method | What it does |
|------|--------|--------------|
| a | `createWorkflowToolBindingApprovalLane({ ... })` | Open an approval lane for tool binding |
| b | `recordWorkflowToolBindingApprovalDecision(approvalRequestId, { ... })` | Record the approval decision |
| c | `executeWorkflowToolBindingApprovalBinding(approvalRequestId, { ... })` | Execute the binding |
| d | `revalidateWorkflowToolBindingStartup(approvalRequestId, { ... })` | Revalidate on startup |

**Workflow runs:**
- `createWorkflowRun(body)` — start a run
- `resumeWorkflowRun(workflowRunId, body)` — resume a paused run
- `getWorkflowRun(workflowRunId)` / `inspectWorkflowRun(workflowRunId)` — inspect run state
- `getWorkflowPlayback(workflowRunId)` — timeline playback

> **Gap:** See [Gap 5 — Workflow Run Has No Cancel/Abort](#gap-5--workflow-run-has-no-cancelabort) and [Gap 7 — No Scheduled Workflow Trigger](#gap-7--no-scheduled-workflow-trigger).

---

## 14. Script Lifecycle

Generate, render, execute, and evidence a governed diagnostic or operational script.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `generateScript(body)` | Create a governed script definition |
| 2 | `renderScript(scriptId)` | Render the script with SQL provenance |
| 3 | `submitScriptArtifact(scriptId, body)` | Submit execution evidence and a workflow artifact |
| 4 | `getScriptRunEvidence({ workflowRunId, scriptId })` | Read SQL-backed run history |

**Namespace access _(v1.1.101)_:** All script lifecycle methods are also accessible as `client.scripts.*`:
```js
await client.scripts.generate(body);
await client.scripts.render(scriptId);
await client.scripts.submitArtifact(scriptId, body);
await client.scripts.getRunEvidence({ workflowRunId, scriptId });
```

---

## 15. Script Discovery → Workflow Promotion

Discover latent scripts in the codebase and promote them to governed workflow definitions.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `scanScripts(body)` | Scan the codebase for discoverable scripts |
| 2 | `listDiscoveredScriptAssets({ limit })` | List discovered assets |
| 3 | `listDiscoveredCapabilities({ limit })` | Review capabilities derived from discovery |
| 4 | `listWorkflowCandidates({ limit })` | See candidates eligible for promotion |
| 5 | `promoteWorkflowCandidate(workflowCandidateId, body)` | Promote candidate to a governed workflow definition |

---

## 16. Code Analysis & Refactoring

Navigate the repo inventory, understand change impact, and produce governed refactor packets.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `listRepositories()` / `listProjects()` | Orient to repo and project inventory |
| 2 | `listCodeFiles({ language, pathPrefix, page, pageSize })` | Page through inventoried files |
| 3 | `searchSymbols({ query, projectScope, maxResults })` | Find symbols by name or intent |
| 4 | `getSymbolRelationships(symbolId, { relationshipType, depth })` | Traverse symbol dependency graph |
| 5 | `getChangeAnalysis({ fileId, symbolId })` | Aggregate relationships, findings, and observations |
| 6 | `listCodebaseShapeFindings({ severity, status })` | Surface quality and shape findings |
| 7 | `listRefactorCandidates({ repositoryRoot })` | List governed refactor candidates |
| 8 | `evaluateProposalScope({ filePath, changeType, refactorIntent })` | Evaluate governance scope before committing |
| 9 | `analyzeRefactorCandidate({ filePath, requestedBy, refactorIntent })` | Build replayable refactor packet preview |

---

## 17. Retrieval-Augmented Prompt Assembly

Structured retrieval, selection, and validation before generating a prompt. Feeds the self-optimization loop via feedback.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `getRetrievalStatus()` | Check retrieval system health and profile metrics |
| 2 | `generateRetrievalCandidates(body)` | Generate candidate packets from a query |
| 3 | `selectRetrievalPacket(body)` | Choose the winning packet |
| 4 | `getRetrievalPacket(retrievalPacketId)` | Read packet content |
| 5 | `validatePromptAssembly(body)` | Validate assembly before use |
| 6 | `recordRetrievalFeedback(body)` | Signal result quality |
| 7 | `deriveRetrievalOptimizationCandidates(body)` | Feed the retrieval optimization loop |

---

## 18. Performance Benchmarking

Capture, compare, and trend performance across runs to measure regression or improvement.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `captureBenchmarkSnapshot(body)` | Capture current state as a baseline or run |
| 2 | `listBenchmarks({ benchmarkScope })` | List available benchmarks |
| 3 | `getBenchmarkMetrics(benchmarkName)` | Read current metrics |
| 4 | `getBenchmarkDelta({ baseline, current })` | Compare two snapshots |
| 5 | `getBenchmarkTrend({ metricKey, dimensionValue, limit })` | Trend a single metric over time |
| 6 | `getPerformanceDashboard({ workflowRunId })` | Full dashboard view |

---

## 19. Database Backup

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `createDatabaseBackup({ databaseName, outputName, noWait })` | Initiate a backup |
| 2 | `listDatabaseBackupOperations({ databaseName, operationFilter })` | Poll operation status |
| 3 | `listDatabaseBackups({ prefix, limit })` | List completed backups |
| 4 | `getDatabaseBackup({ backupId })` | Retrieve the backup artifact descriptor |

---

## 20. Audio Artifact Rendering

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `createExternalAudioRender({ text, voice, model, speed })` | Submit a render job |
| 2 | `getExternalAudioRender(audioRenderRunId)` | Poll render status |
| 3 | `downloadExternalAudioRender(audioRenderRunId)` | Download the MP3 artifact |

> **Gap:** See [Gap 9 — Audio and Artifact Rendering Are Poll-Only](#gap-9--audio-and-artifact-rendering-are-poll-only).

---

## 21. Self-Learning Pipeline

Observe learning records produced by the system and track their progression toward promotion. Currently read-only from the SDK.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `getSelfLearningPosture({ workflowRunId })` | Get current self-learning posture |
| 2 | `listLearningRecords({ learningCategory, promotionReadiness })` | Browse learning records |
| 3 | `getLearningRecord(learningRecordId)` | Read a specific record |
| 4 | `listPromotionCandidates({ workflowRunId, learningCategory })` | Identify records ready for promotion |
| 5 | `getPromotionCandidate(candidateKey)` | Inspect a candidate |
| 6 | `listPromotionFlows({ flowStatus, targetType })` | Track active promotion flows |

**Self-optimization (read-only):**
- `getSelfOptimizationDashboard()`
- `getSelfOptimizationCandidateQueue({ objectiveCategory, impactPosture })`
- `getSelfOptimizationBacklogPosture({ snapshotKey })`
- `getSelfOptimizationPendingHandoffs({ downstreamLane })`

> **Gap:** See [Gap 3 — Self-Learning Has No Write Surface](#gap-3--self-learning-has-no-write-surface).

---

## 22. Design Intelligence

Inspect design decisions, view lineage and critique, and preview (but not execute) design promotions.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `getDesignIntelligenceDashboard()` | Full dashboard view |
| 2 | `listDesignDecisions()` | Browse all design decisions |
| 3 | `getDesignDecision(decisionId)` | Inspect a specific decision |
| 4 | `getDesignDecisionVariants(decisionId)` | Compare decision variants |
| 5 | `getDesignDecisionCritique(decisionId)` | Read the critique |
| 6 | `getDesignDecisionLineage(decisionId)` | Trace decision lineage |
| 7 | `getDesignRecommendations()` | Read current design recommendations |
| 8 | `previewDesignPromotion(body)` | Preview what a promotion would do |

**Supporting reads:**
- `listDesignPatterns()` — available design patterns
- `getDecisionLabCanvas()` — decision lab canvas
- `getDesignPromotions()` — promotions already in flight
- `getDesignIntelligenceMetrics()` — metrics

> **Gap:** See [Gap 4 — Design Intelligence Has No Execute Path](#gap-4--design-intelligence-has-no-execute-path).

---

## 23. Manual & Approval Tasks

Human-in-the-loop steps where workflow execution pauses for manual completion or approval.

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `listManualTasks()` | List tasks awaiting manual completion |
| 2 | `listApprovalTasks()` | List tasks awaiting approval |
| 3 | `completeManualTask(stepRunId, body)` | Complete a manual step |
| 4 | `approveTask(stepRunId, body)` | Approve a step |

> **Gap:** See [Gap 6 — Manual Task Approval Lacks Rejection](#gap-6--manual-task-approval-lacks-rejection).

---

## 24. Warehouse Modernization Pipeline _(v1.1.101)_

The complete SDK-native pipeline for modernizing legacy assets — from intake registration through classification, candidate discovery, work packet creation, wrapper execution, evidence collection, and gate decision. All methods live on `client.warehouse.*` or `client.workflowComposition.*` (same surface; `warehouse` is the compatibility alias).

| Step | Method | What it does |
|------|--------|--------------|
| 1 | `registerModernizationAsset({ projectIdentifier, assetName, assetType, sourceRef, originSystem, businessContext, suspectedValue, knownRisks, assignedClassifier, ... })` | Register an asset intake record; attach governed intake evidence when available; optionally hand off classification to another agent through the transfer substrate |
| 2 | `classifyModernizationAsset({ projectIdentifier, assetId, classificationCategory, domainArea, reusePotential, modernizationNeed, knownRisks, recommendedNextStep, classificationConfidence, ... })` | Classify a registered asset into warehouse categories using caller-supplied evidence only; record missing classification surfaces in `missing_surfaces[]`; can hand the review to another agent |
| 3 | `discoverSalvageCandidates({ projectIdentifier, assetId, classificationCategory, candidateSearchIntent, candidateSearchQuery, maxCandidates, relatedSymbols, relatedFilePaths, ... })` | Identify salvage candidates from a classified asset via governed inventory and retrieval surfaces; record missing discovery surfaces in `missing_surfaces[]` |
| 4 | `createModernizationWorkPacket({ projectIdentifier, selectedCandidates, packetTitle, problemStatement, recommendedModernization, affectedFilesOrSymbols, acceptanceCriteria, riskLevel, targetAgent, collaborationRequired, ... })` | Convert selected salvage candidates into a governed modernization work packet; falls back to `transferWorkPacket` when the dedicated packet surface is absent |
| 5 | `requestModernizationWrapperExecution({ projectIdentifier, modernizationPacketId, wrapperName, wrapperContractRef, executionScope, allowedBlastRadius, requiredEvidence, acceptanceCriteria, riskLevel, targetAgent, ... })` | Turn a work packet into a governed wrapper execution request; falls back to `transferWorkPacket` when the wrapper-request surface is absent |
| 6 | `getModernizationWrapperEvidence({ projectIdentifier, modernizationPacketId, wrapperExecutionId, includeOperations, includeFileManifest, includeVerificationSummary, includeProjection })` | Read wrapper evidence — operations log, file manifest, verification summary — without inventing evidence; record missing evidence surfaces in `missing_surfaces[]` |
| 7 | `decideModernizationGate({ projectIdentifier, modernizationPacketId, requiredEvidence, acceptanceCriteria, decisionMode, decisionBand, reviewer, rationale, recordDecision, ... })` | Convert wrapper evidence into a gate recommendation or recorded gate decision; requires complete evidence before it can recommend a pass |

**Missing surfaces model:** Every step returns `missing_surfaces[]` — an array of governed surfaces absent on the server at call time. Callers must inspect this before treating a step as complete. The pipeline is designed to degrade gracefully when warehouse schema surfaces are partially deployed.

**Namespace access:**
```js
// Preferred namespace path
await client.workflowComposition.registerModernizationAsset({ ... });
await client.workflowComposition.decideModernizationGate({ ... });

// Compatibility alias — identical methods
await client.warehouse.createModernizationWorkPacket({ ... });
```

> **Gap:** The pipeline depends on server-side `warehouse.*` schema surfaces that are partially deployed. All callers must treat `missing_surfaces[]` as authoritative. Generated markdown projections are display metadata only — not authority.

---

## 25. Gap Analysis

> **v1.1.71 update:** Gap re: claim validity check is now **partially closed**. `claimIsValid(claimId)` was added and provides a boolean preflight before governed writes. The backend still does not expose a project-scoped `getActiveClaim(projectId)` — that remains a server-side gap. See the note in Workflow 4.

> **v1.1.101 update:** Four agent communication composites were added — `establishAgentCommunicationChannel`, `runInterAgentMessagingLoop`, `createCrossAgentRemediationTicket`, and `transferRefactoringBundle` — each returning `missing_surfaces[]` for graceful degradation. These composites partially address the manual orchestration burden in Workflows 8, 9, 11, and 12, but the underlying push/subscribe (Gap 1) and presence TTL (Gap 2) gaps remain open at the transport layer.

---

### Gap 1 — No Push/Subscribe Mechanism

**Location:** Workflows 8, 9  
**Symptom:** All inbox and message reads are pull-only — `getMyInbox`, `listCommunicationInbox`. There is no webhook registration, server-sent event stream, or subscription method.  
**Impact:** Coordination latency is bounded by poll interval. High-frequency agent coordination (beyond ping-pong) is expensive and requires agents to implement their own polling loops.  
**What would close it:** A `subscribeToInbox()` or `watchCommunicationChannel()` method returning a stream handle or webhook registration endpoint.

---

### Gap 2 — Presence Has No Auto-Expiry

**Location:** Workflow 8  
**Symptom:** `markParticipantOnline` and `markParticipantOffline` are entirely manual. There is no heartbeat-based TTL — if an agent crashes without calling `markParticipantOffline`, it remains marked online indefinitely. `postAgentHeartbeat` maintains channel liveness but does not feed back into global presence state.  
**Impact:** `whoIsOnline` and presence boards are unreliable after any unclean agent shutdown.  
**What would close it:** A `heartbeatInterval` parameter on `markParticipantOnline` (server-side TTL), or a `refreshPresence()` method that renews a TTL on each call.

---

### Gap 3 — Self-Learning Has No Write Surface

**Location:** Workflow 21  
**Symptom:** `listLearningRecords`, `getLearningRecord`, `listPromotionCandidates`, and `listPromotionFlows` all exist. There is no method to create a learning record directly or to execute a promotion flow.  
**Impact:** Agents can observe the self-learning pipeline but cannot feed it. Learning events can only be produced implicitly by the engine, not explicitly by an agent that recognized a pattern worth recording.  
**What would close it:** `createLearningRecord(body)` and `executePromotionFlow(candidateKey, body)`.

---

### Gap 4 — Design Intelligence Has No Execute Path

**Location:** Workflow 22  
**Symptom:** `previewDesignPromotion(body)` shows what a design promotion would do. There is no `executeDesignPromotion` or `applyDesignDecision` method.  
**Impact:** Design promotions must be executed outside the SDK. The preview surface is complete; the mutation surface is absent.  
**What would close it:** `executeDesignPromotion(body)` or `applyDesignDecision(decisionId, body)`.

---

### Gap 5 — Workflow Run Has No Cancel/Abort

**Location:** Workflow 13  
**Symptom:** `createWorkflowRun`, `resumeWorkflowRun`, `getWorkflowRun`, and `inspectWorkflowRun` all exist. There is no `cancelWorkflowRun` or `abortWorkflowRun`.  
**Impact:** A stuck, diverged, or undesired run can be observed but not stopped from the SDK. Operators must intervene outside the SDK.  
**What would close it:** `cancelWorkflowRun(workflowRunId, { reason })`.

---

### Gap 6 — Manual Task Approval Lacks Rejection

**Location:** Workflow 23  
**Symptom:** `approveTask(stepRunId, body)` and `completeManualTask(stepRunId, body)` exist. There is no `rejectTask` or `sendBackForRevision`.  
**Impact:** The approval lane is one-way. A human reviewer who determines that a task does not meet criteria has no SDK path to reject it — they must intervene at the data layer or accept and re-open work manually.  
**What would close it:** `rejectApprovalTask(stepRunId, { reason, returnTo })`.

---

### Gap 7 — No Scheduled Workflow Trigger

**Location:** Workflow 13  
**Symptom:** `createWorkflowRun(body)` starts a run immediately. There is no method to schedule a future or recurring run.  
**Impact:** Scheduled workflow execution must be managed entirely outside the SDK (cron, external scheduler). There is no SDK-native way to bind a schedule to a workflow definition.  
**What would close it:** `scheduleWorkflowRun(workflowId, { startAt, cronExpression })` or `createWorkflowTrigger(workflowId, { type: 'cron', expression })`.

---

### Gap 8 — No Rollback for Verified Mutations

**Location:** Workflow 5  
**Symptom:** `executeVerifiedMutation` runs a mutation and then verifies post-conditions. If verification fails, the mutation has already occurred. There is no `rollbackMutation` or dry-run mode.  
**Impact:** Failed post-condition verification results in a permanently applied mutation with no SDK-level recovery path.  
**What would close it:** `rollbackVerifiedMutation(mutationId, { reason })` or a `dryRun: true` flag on `executeVerifiedMutation`.

---

### Gap 9 — Audio and Artifact Rendering Are Poll-Only

**Location:** Workflow 20  
**Symptom:** `createExternalAudioRender` submits a job and returns an ID. Status must be checked by polling `getExternalAudioRender`. There is no callback, webhook, or streaming completion signal.  
**Impact:** Agents must implement polling loops and decide on poll intervals with no server guidance on expected completion time.  
**What would close it:** A `webhookUrl` parameter on `createExternalAudioRender`, or a `waitForAudioRender(audioRenderRunId, { timeoutMs })` long-poll convenience method.

---

## 26. Coverage Summary Table

_Updated for v1.1.101. New composites marked **†**._

| Workflow | Steps | Composite Helpers | Gaps |
|----------|-------|-------------------|------|
| 1. Agent Session Startup | 4 | `resumeProjectWork`, `getExternalProjectResumeContext` | None |
| 2. Project Chartering | 5 | `getProjectBundle`, `runCharter` | None |
| 3. Implementation Planning | 6 | `importImplementationPacketAndMaterializeRoadmap` | None |
| 4. Governed Work — Claim Lifecycle | 11 | `startClaimedWork`, `claimIsValid` **†** | Partial (no server-side `getActiveClaim`) |
| 5. Roadmap Item Execution | 12 | `closeRoadmapItemWorkflow` **†** | Gap 8 (no rollback) |
| 6. Commit Governance & Ship Readiness | 5 | — | None |
| 7. UX Gate Remediation | 6 | — | None |
| 8. Agent Communication — Channel Establishment | 12 | `establishAgentCommunicationChannel` **†** | Gap 2 (presence TTL) |
| 9. Agent Communication — Messaging Loop | 11 | `runInterAgentMessagingLoop` **†** | Gap 1 (no push) |
| 10. Agent Coordination Ping-Pong | 6 | — | None |
| 11. Work Transfer & Handoff | 9 + 2* | `createCommunicationHandoff`, `transferRefactoringBundle` **†** | None |
| 12. Collaboration Proposal | 5 | `createCrossAgentRemediationTicket` **†** | None |
| 13. Workflow Definition & Governance | 6 + sub-workflows | — | Gap 5 (no cancel), Gap 7 (no schedule) |
| 14. Script Lifecycle | 4 | — | None |
| 15. Script Discovery → Workflow Promotion | 5 | — | None |
| 16. Code Analysis & Refactoring | 9 | — | None |
| 17. Retrieval-Augmented Prompt Assembly | 7 | — | None |
| 18. Performance Benchmarking | 6 | — | None |
| 19. Database Backup | 4 | — | None |
| 20. Audio Artifact Rendering | 3 | — | Gap 9 (poll-only) |
| 21. Self-Learning Pipeline | 6 | — | Gap 3 (no write surface) |
| 22. Design Intelligence | 8 | — | Gap 4 (no execute path) |
| 23. Manual & Approval Tasks | 4 | — | Gap 6 (no rejection path) |
| 24. Warehouse Modernization Pipeline **†** | 7 | `registerModernizationAsset`, `classifyModernizationAsset`, `discoverSalvageCandidates`, `createModernizationWorkPacket`, `requestModernizationWrapperExecution`, `getModernizationWrapperEvidence`, `decideModernizationGate` | Partial (missing_surfaces model) |

**Total identified gaps: 9** (1 partially closed in v1.1.71; composites added in v1.1.101 reduce orchestration burden for Gaps 1 & 2 but do not close them)  
**Workflows fully covered (no gaps): 14 of 24**  
**New composite helpers added in v1.1.71:** `closeRoadmapItemWorkflow`, `claimIsValid`, `getPortfolioClosureReadiness`  
**New composite helpers added in v1.1.101:** `establishAgentCommunicationChannel`, `runInterAgentMessagingLoop`, `createCrossAgentRemediationTicket`, `transferRefactoringBundle` — plus 7 warehouse pipeline methods and domain namespace refactoring across 70 namespaces
