# AI Engine SDK — Workflow Build Priority

**Context:** Modernization Warehouse platform, active project portfolio, multi-agent coordination substrate  
**Reference taxonomy:** [sdk-workflow-taxonomy.md](sdk-workflow-taxonomy.md)  
**Date:** 2026-05-10 — updated 2026-05-11 for SDK v1.1.102

---

## Framing

Prioritization is driven by three parallel realities:

1. **Existing project debt.** There are implementation roadmaps that are at or near 100% completion but have not been formally closed. That debt blocks new work from entering the portfolio cleanly and leaves projects in ambiguous states.

2. **Agent collaboration is live, not theoretical.** Agents are actively working on projects. They need to file remediation tickets, hand off refactoring bundles, and coordinate without a human acting as the relay. Every hour without reliable inter-agent communication workflows is coordination friction translated into human effort.

3. **The modernization warehouse is the destination.** The workflows built now must be the paved road that warehouse agents walk. Every workflow that is ad hoc today becomes a friction source in the warehouse at scale.

The priority ordering below reflects those three realities in order.

---

## Operating Model — Tight Feedback Loop

This document is not just a static reference. It is a live product input that feeds directly into backend development.

The loop works like this:

1. **Operator analysis** — gaps, missing composites, and priority ordering are identified here in `no-repo` through SDK inspection, workflow taxonomy, and real usage.
2. **Backend implementation** — the backend team reads the analysis and implements the prioritized workflows. New SDK methods, composites, and namespace refactors follow the gap list.
3. **SDK version bump** — a new npm version is published. The operator installs it and reads the updated README.
4. **Docs updated in real time** — both the taxonomy and this priority doc are updated immediately to reflect what shipped.
5. **New gaps identified** — the updated SDK exposes new surfaces, which reveal the next set of gaps.

The cycle completes in hours, not sprints. The operator communicates with AI in real time, the AI produces structured analysis, the backend team executes, and the SDK ships. **The analysis documents are the spec. The README is the receipt.**

---

---

## Priority Tiers

### Tier 1 — Ship Now (Unblocks Everything Downstream)

These workflows are blocking active work today. Nothing else flows until they are reliable.

---

#### 1.1 — Roadmap Closure Workflow

**Why first:** Roadmaps at 100% completion are not being processed to formal closure. That creates ambiguous portfolio state and prevents the portfolio visibility layer from being accurate.

**What this workflow does:**  
Takes a roadmap item that is 100% complete through the full closure sequence: verifies acceptance checks, records the gate decision, updates the item to a terminal status, and — when the final item closes — formally closes the project.

**SDK methods — canonical single-call path _(v1.1.71)_:**

```js
await client.closeRoadmapItemWorkflow({
  projectIdentifier: projectId,
  claimId: existingClaimId,          // optional — creates fresh claim if missing or inactive
  gateType: 'roadmap_closure',
  gateDecision: 'pass',
  closeProjectIfNoRemainingOpenItems: true,
});
```

`closeRoadmapItemWorkflow` internally executes: resume → active item → `claimIsValid` + claim fallback → acceptance check verification → artifact verification → gate decision → terminal status → evidence attachment → claim signoff → reload active item → project close. The 12-step manual sequence from v1.1.64 is now one call.

**Manual path (if step-level control is needed):**

| Step | Method | Purpose |
|------|--------|---------|
| 1 | `resumeProjectWork({ projectIdentifier })` | Load project, roadmap state, active claim context |
| 2 | `getProjectRoadmapActiveItem(projectId)` | Identify the item at 100% |
| 3 | `claimIsValid(claimId)` | _(v1.1.71)_ Verify prior claim is still active before writing |
| 4 | `startClaimedWork({ claimName, intentId, ... })` | Open fresh claim if `claimIsValid` returned false |
| 5 | `getImplementationItemAcceptanceChecks(implementationItemId)` | Confirm all checks are present |
| 6 | `updateAcceptanceCheckStatusVerified(implementationItemId, acceptanceCheckId, status, body)` | Mark each check verified |
| 7 | `verifyImplementationItemArtifacts(implementationItemId, { requiredArtifacts })` | Confirm all artifacts are attached |
| 8 | `createImplementationPacketGateDecision(packetId, body)` | Record gate decision |
| 9 | `updateImplementationItemStatusVerified(implementationItemId, status, body)` | Advance item to terminal status |
| 10 | `addImplementationItemEvidence(implementationItemId, body)` | Attach closure evidence |
| 11 | `signoffClaim(claimId, body)` | Close the claim |
| 12 | `closeActiveProject(projectId, { reason, runTerminalStatus })` | Close project when all items are done |

**Gap status:** Previously flagged gap (no claim validity check) is now **partially closed** by `claimIsValid(claimId)` in v1.1.71. Server-side `getActiveClaim(projectId)` still does not exist — the SDK uses `claimIsValid` + claim creation as the governed fallback.

---

#### 1.2 — Portfolio / Project Status Visibility

**Why second:** You cannot drive roadmaps to closure without a reliable read of which projects are in what state. The portfolio layer must be the source of truth before agents can self-organize around the work backlog.

**What this workflow does:**  
Produces a portfolio-wide view of all projects — their roadmap completion percentage, blocking items, and closure-readiness — so that agents and the operator can identify which projects need the closure workflow applied.

**SDK methods — canonical single-call path _(v1.1.71)_:**

```js
const readiness = await client.getPortfolioClosureReadiness({
  projectLimit: 25,
  includeInactive: false,
  includeLogaPortfolioProjection: true,
  includeLogaRoadmapProjections: true,
});
```

`getPortfolioClosureReadiness` composes: portfolio bundle + project list + per-project roadmap summaries + active items + open task counts → returns a conservative `closure_ready` flag per project. The multi-step read sequence below is still useful for deeper per-project inspection.

**Drill-down path (per-project detail):**

| Step | Method | Purpose |
|------|--------|---------|
| 1 | `getPortfolioBundle()` | Full portfolio status — status, summaries, exceptions |
| 2 | `listProjects({ processStatus, charterStatus, includeInactive: false })` | Active project list |
| 3 | `getProjectRoadmapSummary(projectId)` | Per-project completion state |
| 4 | `getProjectRoadmapActiveItem(projectId)` | What is currently blocking each project |
| 5 | `listProjectOpenTasks(projectId)` | Outstanding tasks per project |
| 6 | `getLogaProjectPortfolioProjection()` | LOGA runtime markdown — operator-readable portfolio rollup |
| 7 | `getLogaProjectRoadmapProjection(projectId)` | Per-project LOGA view when deeper inspection is needed |

**This workflow is read-only.** No claims required. It should run on a periodic basis and feed the operator dashboard.

---

### Tier 2 — Build Next (Enables Agent-to-Agent Collaboration)

These workflows are the backbone of multi-agent coordination. They must exist before agents can work together at scale.

---

#### 2.1 — Agent Communication Channel Establishment

**Why here:** This is the foundation. Every other agent collaboration workflow — remediation tickets, refactoring bundle transfers, collaboration proposals — requires an open, live channel. Channel establishment is the ramp.

**Known issues (from comms substrate docs):**  
- Role router (`sendToRole`) was flaky. Role resolution must use `resolveCommunicationTarget` first and validate before sending.
- Communication should never require a full `memory:load` or `project:resume`. Channel actions use channel primitives only.
- `postAgentHeartbeat` maintains liveness but does not update global presence. Presence is still manually managed (Gap 2 from taxonomy).

**SDK methods — canonical single-call path _(v1.1.101)_:**

```js
const channel = await client.agentComms.establishAgentCommunicationChannel({
  projectIdentifier: projectId,
});
// channel.channel_id, channel.transfer_packet_id
// channel.missing_surfaces[] — inspect before treating as fully established
```

`establishAgentCommunicationChannel` composes: `resumeProjectWork` → `transferWorkPacket` → `openTransferChannel` → `joinTransferChannel` / `resumeTransferChannel` → `postCollaborationHeartbeat` → `getTransferChannelProjection`. Always inspect `missing_surfaces[]` — the substrate may return a safe partial result if projection surfaces are absent.

**Manual path (if step-level control is needed):**

| Step | Method | Purpose |

| Step | Method | Purpose |
|------|--------|---------|
| 1 | `bootstrapCommunication()` | Initialize the communication subsystem |
| 2 | `getCommunicationCapabilities()` | Discover what this agent supports |
| 3 | `getCollaborationCapabilities()` | Discover collaboration posture |
| 4 | `whoIsOnline({ ... })` | Identify reachable agents before opening a channel |
| 5 | `resolveCommunicationTarget({ ... })` | Resolve role or agent identifier to a concrete session |
| 6 | `openAgentChannel(request)` | Open the channel |
| 7 | `startAgentConnection({ ... })` | Initiate handshake |
| 8 | `acceptAgentChannel({ ... })` | _(receiver)_ Accept the channel |
| 9 | `markParticipantOnline({ ... })` | Announce presence |
| 10 | `getCommunicationChannelStatus({ ... })` | Confirm channel is live |
| 11 | `getCommunicationChannelParticipants({ ... })` | Verify both parties are present |

**Operational rule to enforce:**  
After step 7, the initiating agent must post a heartbeat immediately via `postAgentHeartbeat`. From that point forward, heartbeats must be posted on every turn. If a heartbeat is missed, the channel should be considered stale.

**Gap affecting this workflow:**  
Presence TTL (Gap 2). If an agent crashes after step 9, it remains marked online. Until TTL-based presence exists, agents should call `markParticipantOffline` in any error or shutdown handler.

---

#### 2.2 — Inter-Agent Messaging Loop

**Why here:** Once a channel is established, agents need to send and receive messages reliably. The delivery verification model (`send → persisted → receipt → recipient visibility → watch acknowledgement`) must be the standard pattern.

**SDK methods — canonical single-call path _(v1.1.101)_:**

```js
const loop = await client.agentComms.runInterAgentMessagingLoop({
  channelId: channel.channel_id,
  workTransferPacketId: channel.transfer_packet_id,
  replyBodyMarkdown: 'Confirmed. Proceeding with the next step.',
  closeWhenAcknowledged: true,
});
// loop.missing_surfaces[] — inspect before assuming full delivery
```

`runInterAgentMessagingLoop` composes: `resumeTransferChannel` → `replyToTransferChannel` → `startMessageWatch` → `acknowledgeExpectedMessage` → `postCollaborationHeartbeat` → `closeTransferChannel` (when `closeWhenAcknowledged` is set and satisfied) → `getTransferChannelProjection`. Returns `missing_surfaces[]` — no message should be considered delivered until the watch acknowledgement completes.

**Manual path (if step-level control is needed):**

| Step | Method | Purpose |
|------|--------|---------|
| 1 | `openCommunicationThread({ type: 'task' | 'review' | 'handoff' | ... })` | Open a typed thread |
| 2 | `postAgentMessage(request)` | Post message to channel |
| 3 | `sendCommunicationMessage({ ... })` | Higher-level: post to thread with metadata |
| 4 | `postAgentHeartbeat({ ... })` | Maintain liveness every turn |
| 5 | `getMyInbox({ ... })` | Poll for incoming messages |
| 6 | `acknowledgeAgentMessage({ ... })` | Acknowledge receipt |
| 7 | `respondToCommunicationMessage({ ... })` | Post response |
| 8 | `verifyMessageSent({ ... })` | Confirm send was persisted |
| 9 | `verifyMessageReceived({ ... })` | Confirm receipt was recorded |
| 10 | `getMessageDeliveryReceipt({ ... })` | Read formal delivery receipt |

**Gap affecting this workflow:**  
All reads are pull-only (Gap 1). Agents must implement a polling loop. Poll interval should be short (2–5 seconds) during active coordination and longer (30+ seconds) when idle. There is no server guidance on expected message arrival time.

**Operational rule to enforce:**  
No message should be considered delivered until `verifyMessageReceived` returns confirmation. Do not proceed with work based on a sent message alone.

---

#### 2.3 — Remediation Ticket Creation (Cross-Agent)

**Why here:** Agents discovering issues need a standard workflow for filing remediation tickets that the correct upstream or downstream agent can immediately see and act on. This is the primary feedback loop in the warehouse.

**What this workflow does:**  
One agent discovers a gate failure, UX issue, or quality gap. It files a remediation ticket, notifies the responsible agent via the communication channel, and attaches the ticket to the message. The receiving agent can then inspect the ticket via LOGA projection and act.

**SDK methods — canonical single-call path _(v1.1.101)_:**

```js
const ticket = await client.communicationTickets.createCrossAgentRemediationTicket({
  channelId: channel.channel_id,
  workTransferPacketId: channel.transfer_packet_id,
  assignedTo: 'agent-upstream',
  requestedBy: 'agent-downstream',
  sourceRef: 'finding-42',
  blockerSummary: 'Gate failure — remediation ownership must move upstream.',
  expectedResponse: 'Assignee acknowledgement',
});
// ticket.remediation_ticket_id or ticket.blocker_id
// ticket.missing_surfaces[] — inspect before assuming full ticket establishment
```

`createCrossAgentRemediationTicket` composes: `resumeTransferChannel` → `transferWorkPacket` (when ownership must move) → `raiseCollaborationBlocker` → `reviewCollaborationProposal` (when a proposal id is supplied) → `startMessageWatch` → `postCollaborationHeartbeat` → `getTransferChannelProjection`. Returns `missing_surfaces[]` — callers see any absent governed surface rather than an invented success response.

**Manual path (for UX-gate-specific tickets or when step-level control is needed):**

| Step | Method | Purpose |
|------|--------|---------|
| 1 | `submitUxGateRemediation({ projectionType, ... })` | Open the remediation ticket |
| 2 | `getLogaUxGateRemediationProjection(remediationId)` | Get the LOGA view to attach to the notification |
| 3 | `openCommunicationThread({ type: 'review' })` | Open review thread on the active channel |
| 4 | `sendCommunicationMessage({ ... })` | Notify the responsible agent with the ticket reference |
| 5 | `attachCommunicationMessageEvidence({ ... })` | Attach ticket evidence to the message |
| 6 | `verifyMessageReceived({ ... })` | Confirm the receiving agent got the notification |
| — | — | _(Receiving agent side)_ |
| 7 | `getUxGateRemediation(remediationId)` | Read ticket state |
| 8 | `appendUxRemediationTicketNote(remediationId, body)` | Add downstream context or findings |
| 9 | `respondToCommunicationMessage({ ... })` | Acknowledge and respond on the channel |
| 10 | `promoteUxGateRemediationImplementationCandidate(remediationId, { promotedBy })` | Promote to implementation packet when ready |

---

#### 2.4 — Refactoring Bundle Transfer

**Why here:** Agents working on the modernization warehouse will produce refactoring analysis and bundles that need to be transferred to other agents for review or execution. This workflow gives that a governed, receipted path.

**What this workflow does:**  
One agent runs code analysis, packages a refactoring proposal into a bundle, and transfers it to the agent responsible for execution or review. The receiving agent inspects the bundle and begins implementation.

**SDK methods — canonical single-call path _(v1.1.101)_:**

```js
const bundle = await client.refactoringTransfers.transferRefactoringBundle({
  projectIdentifier: projectId,
  sourceAgent: 'agent-downstream',
  targetAgent: 'agent-upstream',
  sourceRef: 'refactor-42',
  problemStatement: 'Extract the transport orchestration into a shared helper.',
  affectedFilesOrSymbols: ['src/index.js', 'transferRefactoringBundle'],
  recommendedAction: 'Create a shared transfer orchestration helper.',
  acceptanceCriteria: ['bundle received', 'ownership assigned', 'acknowledgement posted'],
  evidenceRefs: ['commit:abc123'],
  riskLevel: 'medium',
  handoffNotes: 'Please review and wire the new helper into the bundle flow.',
});
// bundle.missing_surfaces[] — inspect before assuming full transfer
```

`transferRefactoringBundle` composes: `resumeProjectWork` / `startWork` → `transferWorkPacket` → `openTransferChannel` / `resumeTransferChannel` → `assignCollaborationOwnership` → `postCollaborationProposal` → `startMessageWatch` → `postCollaborationHeartbeat` → `getTransferChannelProjection`. Fails closed if no explicit `targetAgent` is supplied.

**Manual path (if step-level control is needed):**

| Step | Method | Purpose |
|------|--------|---------|
| 1 | `listRefactorCandidates({ repositoryRoot })` | Identify candidates |
| 2 | `analyzeRefactorCandidate({ filePath, refactorIntent, requestedBy })` | Build replayable refactor packet |
| 3 | `evaluateProposalScope({ filePath, changeType, refactorIntent })` | Evaluate governance scope |
| 4 | `createCommunicationBundle({ ... })` | Package the refactor packet as a transfer bundle |
| 5 | `addCommunicationBundleItem({ ... })` | Add the refactor analysis, packet, and evidence refs |
| 6 | `uploadCommunicationBundle({ ... })` | Upload the bundle |
| 7 | `negotiateCommunicationTransfer({ ... })` | Begin transfer negotiation with receiver |
| 8 | `transferWorkPacket({ ... })` | Initiate formal work transfer |
| 9 | `attachCommunicationBundleToMessage({ ... })` | Attach bundle to the notification message |
| — | — | _(Receiving agent side)_ |
| 10 | `acceptCommunicationTransferPacket({ ... })` | Accept the transfer |
| 11 | `recordCommunicationTransferReceipt({ ... })` | Record formal receipt |
| 12 | `getRepoRetrievalPacket(retrievalPacketId)` | Read retrieval fragments from the bundle |
| 13 | `closeCommunicationTransferPacket({ ... })` | Close after implementation begins |

---

### Tier 3 — Modernization Warehouse Core Workflows

These workflows build the warehouse execution model. They depend on Tier 1 and Tier 2 being stable.

---

#### 3.1 — Collaboration Proposal (Joint Work Agreement)

**Why here:** Before two agents begin joint modernization work, they need a structured way to agree on scope, ownership, and blockers. This prevents divergent work and ambiguous handoffs.

**SDK methods:** See [sdk-workflow-taxonomy.md — Workflow 12](sdk-workflow-taxonomy.md#12-collaboration-proposal).

**Key sequencing note:** The collaboration proposal workflow must run over an already-established channel (Workflow 2.1). Do not open a collaboration proposal without an active, heartbeat-confirmed channel.

---

#### 3.2 — Governed Work Execution for Warehouse Items

**Why here:** Warehouse modernization items (triage decisions, refactor runs, execution contracts) must be executed under the same claim lifecycle that governs all other implementation work. This is the inner loop of the warehouse execution runtime.

**SDK methods:** See [sdk-workflow-taxonomy.md — Workflows 4 and 5](sdk-workflow-taxonomy.md#4-governed-work-execution--claim-lifecycle).

**Warehouse-specific additions:**  
The `declaredScopeFiles` in `startClaimedWork` must align with the `warehouse.asset_execution_contract` scope for the item being worked. This binds the governed claim to the warehouse execution model.

---

#### 3.3 — Commit Governance & Ship Readiness

**Why here:** Every modernization output — refactored modules, packaged artifacts, productized assets — must pass commit governance before moving to the distribution stage. This workflow is the gate between the warehouse and distribution.

**SDK methods:** See [sdk-workflow-taxonomy.md — Workflow 6](sdk-workflow-taxonomy.md#6-commit-governance--ship-readiness).

---

#### 3.4 — Warehouse Asset Pipeline _(v1.1.101)_

**Why here:** The SDK now has a full native pipeline for the modernization warehouse — from intake registration through gate decision. This is no longer a future capability; it is a first-class SDK surface as of v1.1.101.

**What this workflow does:**  
Takes a legacy asset from intake all the way through the warehouse: registers it, classifies it, discovers salvage candidates, packages a governed work packet, requests wrapper execution, collects evidence, and records a gate decision — all through the SDK without external tooling.

**SDK methods — canonical pipeline _(v1.1.101)_:**

```js
// Step 1 — Intake
const intake = await client.workflowComposition.registerModernizationAsset({
  projectIdentifier: projectId,
  assetName: 'legacy-auth-module',
  assetType: 'module',
  sourceRef: 'src/auth/legacy.js',
  originSystem: 'monolith-v1',
  businessContext: 'Auth flows that predate OAuth2 adoption.',
  suspectedValue: 'high',
});

// Step 2 — Classify
const classification = await client.workflowComposition.classifyModernizationAsset({
  projectIdentifier: projectId,
  assetId: intake.asset_id,
  classificationCategory: 'salvageable',
  reusePotential: 'high',
  modernizationNeed: 'refactor',
});

// Step 3 — Discover salvage candidates
const candidates = await client.workflowComposition.discoverSalvageCandidates({
  projectIdentifier: projectId,
  assetId: intake.asset_id,
  candidateSearchIntent: 'Find reusable auth patterns',
  maxCandidates: 10,
});

// Step 4 — Create work packet
const packet = await client.workflowComposition.createModernizationWorkPacket({
  projectIdentifier: projectId,
  selectedCandidates: candidates.salvage_candidates,
  packetTitle: 'Auth module refactor',
  problemStatement: 'Extract and modernize the legacy auth patterns.',
  riskLevel: 'medium',
  targetAgent: 'agent-upstream',
});

// Step 5 — Request wrapper execution
const execution = await client.workflowComposition.requestModernizationWrapperExecution({
  projectIdentifier: projectId,
  modernizationPacketId: packet.modernization_packet_id,
  wrapperName: 'auth-refactor-wrapper',
  executionScope: ['src/auth/'],
  allowedBlastRadius: 'module',
  targetAgent: 'agent-upstream',
});

// Step 6 — Collect evidence
const evidence = await client.workflowComposition.getModernizationWrapperEvidence({
  projectIdentifier: projectId,
  modernizationPacketId: packet.modernization_packet_id,
  includeOperations: true,
  includeFileManifest: true,
  includeVerificationSummary: true,
});

// Step 7 — Gate decision
const gate = await client.workflowComposition.decideModernizationGate({
  projectIdentifier: projectId,
  modernizationPacketId: packet.modernization_packet_id,
  requiredEvidence: evidence,
  decisionMode: 'conservative',
  reviewer: 'operator:sid',
  recordDecision: true,
});
```

**Missing surfaces rule:** Every step returns `missing_surfaces[]`. Inspect it at each step before continuing. If a surface is absent, record the gap and decide whether to proceed or pause for server-side deployment.

**SDK reference:** See [sdk-workflow-taxonomy.md — Workflow 24](sdk-workflow-taxonomy.md#24-warehouse-modernization-pipeline).

---

### Tier 4 — Governance & Structural Workflows

These workflows are necessary for the warehouse at scale but are not blocking immediate progress.

---

#### 4.1 — Workflow Definition & Governance

Needed to formalize new warehouse workflows (intake, triage, modernization, productization) as governed workflow definitions with published steps and tool bindings.

**SDK methods:** See [sdk-workflow-taxonomy.md — Workflow 13](sdk-workflow-taxonomy.md#13-workflow-definition--governance).

---

#### 4.2 — Script Discovery → Workflow Promotion

The warehouse will discover latent scripts and tools inside legacy assets. Those that are valuable should be promoted to governed workflow candidates, not kept as ad hoc scripts.

**SDK methods:** See [sdk-workflow-taxonomy.md — Workflow 15](sdk-workflow-taxonomy.md#15-script-discovery--workflow-promotion).

---

#### 4.3 — Performance Benchmarking

As the warehouse processes assets at scale, performance baselines need to be tracked. Benchmarking must be in place before the warehouse is running at volume.

**SDK methods:** See [sdk-workflow-taxonomy.md — Workflow 18](sdk-workflow-taxonomy.md#18-performance-benchmarking).

---

## Gap Impact on Priority

_Updated for v1.1.101. Closed and partially-closed gaps are marked **✓**._

| Gap | Impacted Tier | Status | Current Workaround |
|-----|--------------|--------|-------------------|
| Claim validity check | Tier 1.1 (roadmap closure) | **✓ Partially closed** — `claimIsValid(claimId)` added in v1.1.71 | Server-side `getActiveClaim(projectId)` still missing; use `claimIsValid` + `startClaimedWork` fallback |
| Gap 1 — No push/subscribe (polling only) | Tier 2 (messaging) | **✓ Reduced** — `runInterAgentMessagingLoop` wraps the poll loop; underlying transport gap still open | Composite handles the loop internally; inspect `missing_surfaces[]` on return |
| Gap 2 — Presence has no auto-expiry | Tier 2 (channel establishment) | **✓ Reduced** — `establishAgentCommunicationChannel` handles channel ramp; presence TTL gap still open | Call `markParticipantOffline` in all error/shutdown handlers |
| Gap 5 — Workflow runs have no cancel/abort | Tier 3 (warehouse execution) | Open | Operator must intervene at data layer; document escalation path |
| Gap 6 — Approval tasks have no rejection path | Tier 3 (gate workflows) | Open | Use `appendUxRemediationTicketNote` to capture rejection rationale; re-open manually |
| Gap 8 — No rollback for verified mutations | Tier 2 (refactoring bundle execution) | Open | Treat all mutations as irreversible; require `evaluateProposalScope` gate before execution |
| Warehouse `missing_surfaces[]` (new in v1.1.101) | Tier 3.4 (warehouse pipeline) | Partial — by design | Server-side `warehouse.*` schemas are partially deployed; inspect `missing_surfaces[]` at every pipeline step |

The three known issues from the communication substrate docs — ping-pong state reconciliation noise, projection size explosion (~15MB), and role router reliability — are pre-existing and should be addressed as part of the Tier 2 channel establishment build, not deferred.

---

## Execution Sequence Summary

```text
Tier 1 — Ship Now
├── 1.1  Roadmap Closure Workflow          [single-call: closeRoadmapItemWorkflow]
└── 1.2  Portfolio / Project Status        [single-call: getPortfolioClosureReadiness]

Tier 2 — Build Next
├── 2.1  Agent Channel Establishment       [single-call: establishAgentCommunicationChannel ✓ v1.1.101]
├── 2.2  Inter-Agent Messaging Loop        [single-call: runInterAgentMessagingLoop ✓ v1.1.101]
├── 2.3  Cross-Agent Remediation Ticket    [single-call: createCrossAgentRemediationTicket ✓ v1.1.101]
└── 2.4  Refactoring Bundle Transfer       [single-call: transferRefactoringBundle ✓ v1.1.101]

Tier 3 — Modernization Warehouse Core
├── 3.1  Collaboration Proposal (Joint Work Agreement)
├── 3.2  Governed Work Execution for Warehouse Items
├── 3.3  Commit Governance & Ship Readiness
└── 3.4  Warehouse Asset Pipeline          [7-step: register → classify → discover → packet → execute → evidence → gate ✓ v1.1.101]

Tier 4 — Governance & Structural
├── 4.1  Workflow Definition & Governance
├── 4.2  Script Discovery → Workflow Promotion
└── 4.3  Performance Benchmarking
```

**North star:** Every workflow built here is a paved road inside the modernization warehouse. The goal is that agents can pick up work, coordinate with other agents, file issues, transfer packages, and close out projects without a human acting as the relay. The operator monitors, approves, and escalates. They do not route.
