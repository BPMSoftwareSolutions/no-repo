# AI Engine — Product Opportunity Analysis

**Source:** [product-discovery-engine.md](product-discovery-engine.md) × [sdk-workflow-taxonomy.md](sdk-workflow-taxonomy.md)  
**Method:** WSJF — Weighted Shortest Job First (Business Value + Time Criticality + Risk Reduction) / Job Size  
**SDK version:** `@bpmsoftwaresolutions/ai-engine-client` v1.1.102  
**Date:** 2026-05-11

---

## The Core Thesis

The product discovery conversation converges on one insight:

> The governance gates are not friction — they are a fidelity compiler.  
> The warehouse is not storage — it is infinite content and product generation.  
> The SDK is not an API wrapper — it is a workflow composition and operational execution surface.

Every product and video listed below is a manifestation of the same architecture:

```text
intent
→ governed execution
→ evidence
→ fidelity-validated artifact
→ distributable product
```

The feedback loop that produces SDK versions in hours is the same loop that produces products and content. The question is only: which loop to close first?

---

## Taxonomy Mapping — Product Discovery → SDK Workflows

| Product Discovery Layer | Maps To | SDK Workflows Available |
|---|---|---|
| Content Engine | Media pipeline | `createExternalAudioRender`, LOGA projections, execution telemetry, Playwright capture |
| Tour Guide / Guided Lead Conversion | Warehouse intake + LOGA projection | Warehouse pipeline (Workflow 24), `resumeProjectWork`, all LOGA projections |
| Product Layer — SDK products | Workflow composition packaging | `importImplementationPacketAndMaterializeRoadmap`, `createProjectCharter`, `closeRoadmapItemWorkflow` |
| Product Layer — Workflow packs | Taxonomy composites | All Tier 1–4 composites from priority doc |
| Product Layer — Analysis packs | Code analysis + repo inventory | `listRefactorCandidates`, `analyzeRefactorCandidate`, `getChangeAnalysis`, `listCodebaseShapeFindings`, warehouse pipeline |
| Product Layer — Agent orchestration | Agent communication | `establishAgentCommunicationChannel`, `runInterAgentMessagingLoop`, `createCrossAgentRemediationTicket`, `transferRefactoringBundle` |
| Automation Media Pipeline | Audio render + telemetry + Playwright | `createExternalAudioRender`, LOGA projections, `getExecutionTelemetryCurrent`, `generateScript` |
| Enterprise Layer — Governance packs | Gate decisions + evidence | `decideModernizationGate`, `createImplementationPacketGateDecision`, `evaluateCommitGovernance`, `checkGitShipReadiness` |

**SDK coverage assessment:** 8 of 8 product discovery layers have direct SDK workflow coverage today. No new backend surfaces required for any of the top opportunities below.

---

## Top 5 Products — WSJF Ranked

### #1 — Modernization Audit Report Pack ⭐

**WSJF: 9/10** — Highest value, smallest job, already built.

**What it is:**  
A packaged, self-running audit that analyzes a repo or legacy codebase and delivers a governed markdown + audio report showing: inventory count, salvage opportunities, estimated value-recovery surface, architecture gaps, and a recommended modernization path. The report is SQL-backed and signed with evidence.

**Why first:**  
The entire pipeline already exists in the SDK. This is pure packaging, not new development. The output is the exact asset the Tour Guide needs for lead conversion. It answers the enterprise question: _"What is this thing actually worth?"_

**Automation pipeline:**
```text
client.listRefactorCandidates({ repositoryRoot })
→ client.analyzeRefactorCandidate({ filePath, refactorIntent })
→ client.workflowComposition.registerModernizationAsset({ ... })
→ client.workflowComposition.classifyModernizationAsset({ ... })
→ client.workflowComposition.discoverSalvageCandidates({ ... })
→ client.getLogaProjectPortfolioProjection()
→ client.createExternalAudioRender({ text: report.text, voice: 'alloy' })
→ downloadExternalAudioRender → .mp3 artifact
```

**Deliverable:** A governed markdown report + narrated MP3 + evidence packet. No human touch required once triggered.

**Revenue path:** Sell as a one-time audit. Upsell to the modernization workflow execution pack.

---

### #2 — Workflow Starter Kit (SDK Composition Pack) ⭐

**WSJF: 8.5/10** — Near-zero new build. The `no-repo` workspace IS this product.

**What it is:**  
A packaged set of pre-built, runnable workflow scripts covering the most common operations: project charter, roadmap closure, portfolio scan, agent channel establishment, remediation ticket creation, refactoring bundle transfer. Includes the taxonomy doc and priority doc as the reference guide.

**Why second:**  
This product is effectively done. The scripts, docs, and composites are all written. Packaging = wrapping them into a distributable bundle with examples, a README, and a quick-start guide. The `no-repo` workspace is the prototype.

**What's in the pack:**
- `closeRoadmapItemWorkflow` — one-call roadmap closure
- `getPortfolioClosureReadiness` — portfolio health in one call
- `establishAgentCommunicationChannel` — agent channel setup
- `runInterAgentMessagingLoop` — governed messaging
- `createCrossAgentRemediationTicket` — cross-agent ticket
- `transferRefactoringBundle` — governed bundle handoff
- All 7 warehouse pipeline methods
- Reference taxonomy and priority docs

**Revenue path:** Developer tools subscription. First 90 days free trial.

---

### #3 — Governed Video Demo Pipeline (Automation Media Pack) ⭐

**WSJF: 8/10** — Closes the content flywheel. One build, infinite output.

**What it is:**  
A governed, end-to-end automated video production pipeline that turns any real SDK workflow execution into a narrated, evidence-backed demo video. No human production required after the pipeline is wired.

**Architecture (from product discovery doc, validated against SDK):**
```text
workflow executes (any SDK composite)
→ evidence packet generated (SDK telemetry + LOGA projections)
→ storyboard assembled (markdown templates → structured scenes)
→ LOGA projection rendered in browser
→ Playwright captures UI walkthroughs (screenshot + screen recording)
→ narration script derived from execution summary
→ createExternalAudioRender({ text: narration }) → .mp3
→ video assembled (scenes + audio + captions)
→ human review gate (approve/reject before publish)
→ publish to YouTube / distribute
```

**SDK coverage:**
- Execution data: `getExecutionTelemetryCurrent`, `listExecutionProcessRuns`, `getLogaProjectRoadmapProjection`, LOGA projections
- Narration: `createExternalAudioRender`, `downloadExternalAudioRender`
- Storyboard input: `getWorkflowPlayback`, `inspectWorkflowRun`
- Gate: `submitUxGateRemediation` (for the video review step itself — governed approval)

**What still needs building:** Playwright integration script + video assembly layer. These are external to the SDK but well-defined. Job size: 2–3 weeks.

**Revenue path:** Internal content flywheel first. Then license the pipeline itself as a product.

---

### #4 — Cross-Agent Coordination Substrate (Agent Orchestration Pack) ⭐

**WSJF: 7.5/10** — The Tier 2 workflows are now all composites. Operationalization is the remaining step.

**What it is:**  
A packaged, deployable multi-agent coordination runtime that wires up the agent communication substrate for a team of specialized agents (upstream, downstream, analysis, execution). Agents can file remediation tickets, hand off refactoring bundles, run messaging loops, and coordinate without a human relay.

**Why fourth:**  
The SDK composites are all built (v1.1.101+). The remaining work is operationalizing — setting up the deployment, defining agent roles, wiring the channel heartbeat cadence, and establishing the governance rules for when a human gets paged.

**Automation pipeline:**
```text
agent-downstream discovers issue
→ createCrossAgentRemediationTicket({ assignedTo: 'agent-upstream', ... })
→ agent-upstream receives message watch notification
→ runInterAgentMessagingLoop({ replyBodyMarkdown: 'Acknowledged', ... })
→ transferRefactoringBundle({ sourceAgent, targetAgent, ... })
→ agent-upstream executes under governed claim
→ closeRoadmapItemWorkflow({ ... })
→ telemetry feeds evidence back to orchestration layer
```

**Revenue path:** Enterprise multi-agent deployment service. Per-agent seat licensing.

---

### #5 — Pattern Intelligence Report (Architecture Scan Pack)

**WSJF: 7/10** — Strong enterprise value, slightly larger job size than #1.

**What it is:**  
An on-demand governed architecture intelligence scan that produces: anti-pattern findings, codebase shape analysis, security governance posture, object flow observations, and design decision lineage — all as a structured LOGA-rendered report with evidence.

**SDK coverage:**
- `currentArchitectureIntegrityStatus()`
- `currentSecurityGovernanceStatus({ environment, topN })`
- `currentCodebaseShapeStatus()`
- `listCodebaseShapeFindings({ severity, status })`
- `getAntiPatternRules()`
- `getDesignIntelligenceDashboard()`
- `listDesignDecisions()` + `getDesignDecisionCritique(decisionId)`
- `getDesignIntelligenceMetrics()`

**Revenue path:** Sell as a one-time scan. Upsell to continuous governance monitoring subscription.

---

## Top 5 YouTube Videos — Fully Automatable

Each video below can be produced end-to-end by the governed media pipeline (Product #3) once the Playwright layer is wired. The videos are not fabricated marketing — they are operational truth rendered as media.

---

### Video #1 — "Watch a Legacy Codebase Get Modernized in 90 Seconds" 🎬

**WSJF: 10/10** — Shortest, punchiest, most shareable proof-of-concept.

**Series:** Technical Debt → Technical Asset  
**Hook:** A real repo. No slides. No demo environment. Watch the warehouse intake, classify, salvage, and package a legacy module in real time.

**Automation script:**
```text
1. registerModernizationAsset({ assetName, sourceRef })
2. classifyModernizationAsset({ classificationCategory: 'salvageable', reusePotential: 'high' })
3. discoverSalvageCandidates({ candidateSearchIntent, maxCandidates: 5 })
4. createModernizationWorkPacket({ packetTitle, problemStatement, acceptanceCriteria })
5. decideModernizationGate({ decisionMode: 'conservative' })
→ Playwright captures each LOGA projection step
→ Narration generated from classification + evidence summary
→ Audio: createExternalAudioRender({ text: narration })
→ Video: 90-second timelapse of the warehouse pipeline completing
```

**Why this video wins:** It shows, doesn't tell. The warehouse concept becomes tangible. Every enterprise watching it asks: _"Can it do this for our codebase?"_

---

### Video #2 — "Roadmap Closed. One Call. No Human Touch." 🎬

**WSJF: 9/10** — Demonstrates the governance compiler value prop in the most concrete possible way.

**Series:** Intent → Product in Minutes  
**Hook:** A project at 100% completion, stuck in limbo. Watch `closeRoadmapItemWorkflow` execute: validate the claim, verify acceptance checks, record the gate, advance to terminal status, close the project. One API call. Fully governed.

**Automation script:**
```text
1. getPortfolioClosureReadiness({ projectLimit: 10 })
   → identify projects at 100% that aren't closed
2. closeRoadmapItemWorkflow({ projectIdentifier, claimId, gateDecision: 'pass', closeProjectIfNoRemainingOpenItems: true })
3. getLogaProjectRoadmapProjection(projectId) — before/after comparison
→ Playwright captures roadmap projection before → execution → roadmap projection after
→ Narration: "From open to closed. Evidence-backed. Irreversible. One call."
→ Audio: createExternalAudioRender({ text: narration })
```

**Why this video wins:** It directly answers "what does the governance compiler actually do?" in 60 seconds. It's undeniably real.

---

### Video #3 — "Two AI Agents, One Conversation, Zero Human Relay" 🎬

**WSJF: 8.5/10** — Demonstrates the agent communication substrate that no competitor can show.

**Series:** Workflow Sovereignty  
**Hook:** Agent downstream discovers a blocking issue. Watch: channel establishment, remediation ticket filed, refactoring bundle transferred, agent upstream acknowledges and takes ownership. No human was the router.

**Automation script:**
```text
1. establishAgentCommunicationChannel({ projectIdentifier })
2. createCrossAgentRemediationTicket({ assignedTo: 'agent-upstream', blockerSummary })
3. runInterAgentMessagingLoop({ replyBodyMarkdown: 'Ticket received. Taking ownership.' })
4. transferRefactoringBundle({ sourceAgent, targetAgent, problemStatement, affectedFilesOrSymbols })
→ Playwright captures: presence board, message delivery receipts, ticket LOGA projection, bundle transfer state
→ Narration: the choreography explained as it happens
→ Audio: createExternalAudioRender
```

**Why this video wins:** No one else can show governed agent-to-agent coordination with receipts, evidence, and ownership transfer. This is the category-defining content.

---

### Video #4 — "From Document to Audio: The AI Engine Media Pipeline" 🎬

**WSJF: 8/10** — Closes the content flywheel narrative. Demonstrates that the pipeline itself is self-documenting.

**Series:** AI Engine Internals  
**Hook:** A LOGA governance report gets converted to narrated audio in real time. The same pipeline that produces the video is demonstrated inside the video.

**Automation script:**
```text
1. getLogaProjectRoadmapProjection(projectId) → markdown text
2. createExternalAudioRender({ text: projection.text, voice: 'alloy' })
3. getExternalAudioRender(audioRenderRunId) — poll status
4. downloadExternalAudioRender(audioRenderRunId) → .mp3
→ Playwright captures the API calls, telemetry, the audio waveform
→ The narration IS the LOGA projection being rendered in real time
→ Meta: the video is narrated by its own source document
```

**Why this video wins:** Self-referential demonstration. The video proves the pipeline exists by being produced by it.

---

### Video #5 — "Your Portfolio's Real Health: Live from SQL" 🎬

**WSJF: 7.5/10** — Enterprise-targeted. Shows operational truth instead of fabricated dashboards.

**Series:** AI Governance Compiler  
**Hook:** Pull live portfolio health from the SQL-backed engine. Not a slide. Not a mock. The actual governed state of your project portfolio: closure readiness, blocking items, telemetry, evidence chains.

**Automation script:**
```text
1. getPortfolioClosureReadiness({ projectLimit: 25, includeLogaPortfolioProjection: true, includeLogaRoadmapProjections: true })
2. getLogaProjectPortfolioProjection() — portfolio rollup
3. getLogaProjectRoadmapProjection(projectId) — drill into 2–3 projects
4. getExecutionTelemetryCurrent() — live telemetry overlay
→ Playwright captures: portfolio LOGA view → drill-down → telemetry → evidence
→ Narration: "This is not a dashboard. This is SQL. Every number is governed."
→ Audio: createExternalAudioRender
```

**Why this video wins:** Enterprises trust data they can trace. This video proves the SQL-backed governance architecture is real, observable, and not AI hallucination.

---

## WSJF Summary Table

| Opportunity | Type | Business Value | Time Criticality | Risk Reduction | Job Size | WSJF Score |
|---|---|---|---|---|---|---|
| #1 Modernization Audit Report | Product | 9 | 8 | 7 | 2 | **12.0** |
| #2 Workflow Starter Kit | Product | 8 | 9 | 6 | 1 | **23.0** |
| #3 Governed Video Demo Pipeline | Product | 9 | 8 | 8 | 4 | **6.3** |
| #4 Cross-Agent Coordination Pack | Product | 8 | 7 | 9 | 5 | **4.8** |
| #5 Pattern Intelligence Report | Product | 7 | 6 | 8 | 4 | **5.3** |
| Video #1 — Warehouse in 90s | Video | 9 | 9 | 8 | 2 | **13.0** |
| Video #2 — Roadmap Closure | Video | 8 | 8 | 7 | 2 | **11.5** |
| Video #3 — Agent Coordination | Video | 9 | 7 | 9 | 3 | **8.3** |
| Video #4 — Doc to Audio | Video | 7 | 7 | 6 | 2 | **10.0** |
| Video #5 — Portfolio Health | Video | 8 | 6 | 7 | 2 | **10.5** |

---

## Recommended Execution Sequence

```text
Week 1 — Zero-build products (packaging existing capability)
├── Ship: Workflow Starter Kit (Product #2) — it's the no-repo workspace
└── Produce: Video #2 — Roadmap Closure (fastest to wire, proves the compiler)

Week 2 — High-value pipeline wiring
├── Build: Playwright capture layer + narration template
├── Produce: Video #1 — Warehouse in 90 Seconds (use the Playwright layer)
└── Produce: Video #4 — Doc to Audio (self-referential, proves the pipeline)

Week 3 — Products that require the video pipeline
├── Build: Modernization Audit Report Pack (Product #1) — uses warehouse pipeline
├── Produce: Video #5 — Portfolio Health (SQL operational truth)
└── Produce: Video #3 — Agent Coordination (most differentiated content)

Week 4+ — Enterprise scale
├── Package: Pattern Intelligence Report (Product #5)
├── Operationalize: Cross-Agent Coordination Pack (Product #4)
└── License: Governed Video Demo Pipeline (Product #3) as its own product
```

---

## The Compounding Observation

The Workflow Starter Kit (Product #2) produces the Modernization Audit Report (Product #1).  
The Audit Report generates the storyboard for Video #1.  
Video #1 drives inbound leads to the Tour Guide.  
The Tour Guide runs the Warehouse Audit Report pipeline live.  
The live run produces evidence that becomes the next video.

The flywheel described in the product discovery conversation is not theoretical.  
Every component is an SDK call away.

> The analysis-to-operationalization loop is already running. The question is which output to close first.
