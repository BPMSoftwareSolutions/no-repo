# AI Engine — Governed Multi-Agent Communication & Coordination Summary

## Core Goal

We evolved the system from:

```text
single-agent prompt/response
```

into:

```text
governed multi-agent coordination substrate
```

with:

* upstream/downstream agents
* governed transfer packets
* governed bidirectional channels
* typed choreography
* SQL-backed state
* operator visibility
* message watches
* continuity runners
* ping-pong liveness loops
* receipts/evidence/closure
* presence board visibility

---

# Major Architecture Principles Established

## 1. SQL Is Source of Truth

Everything important must be:

```text
SQL-backed
→ projected
→ observable
→ verifiable
```

No hand-authored markdown as authority.

Markdown/docs become projections only.

---

## 2. Agents Coordinate Through the Substrate

Not through humans relaying messages.

Goal:

```text
agent
↕
governed substrate
↕
agent
```

Human becomes:

```text
monitor
→ approver
→ escalation point
```

not switchboard.

---

## 3. Communication Must Be Paved-Road

Every repeated communication workflow should become:

* SDK primitive
* npm command
* SQL-backed projection
* one-step workflow

No:

* repo spelunking
* route probing
* ad hoc Python snippets
* memory universe bootstraps
* manual heartbeat choreography

---

# What Was Built

---

# Governed Transfer Substrate

Implemented:

* governed transfer packets
* negotiated transfer modes
* semantic routing
* evidence packets
* transfer receipts
* closure semantics
* friction telemetry
* SQL-backed lifecycle

Key primitives:

```text
transferWorkPacket(...)
openTransferChannel(...)
replyToTransferChannel(...)
closeTransferChannel(...)
```

---

# Governed Bidirectional Channels

Built:

* persistent channels
* typed messages
* waiting-side semantics
* typed receipts
* state transitions
* evidence exchange
* closure review

Key rule:

```text
No free-floating chat.
Everything tied to governed work.
```

---

# LOGA Operator Projections

Built projections for:

```text
operator.transfer_home
operator.transfer_inbox
operator.transfer_packet
operator.transfer_channel_thread
operator.transfer_channel_collaboration
operator.transfer_receipts
operator.transfer_closure_review
operator.transfer_friction_lane
```

Operator can now see:

* who owns work
* who is waiting
* expected message
* blockers
* heartbeats
* continuity state
* receipts
* closure readiness

---

# Collaboration Agreement Layer

Built:

* participant hydration
* proposal/agreement ledger
* ownership assignments
* blockers
* active-work telemetry
* heartbeats

Primitives:

```text
joinTransferChannel(...)
resumeTransferChannel(...)
postCollaborationProposal(...)
acceptCollaborationProposal(...)
assignCollaborationOwnership(...)
postCollaborationHeartbeat(...)
```

---

# Choreography Runtime

Major transition:

```text
manual sequencing
→ workflow-native choreography
```

Built workflow primitives:

```text
reviewProposal(...)
reviseProposal(...)
raiseBlocker(...)
beginImplementation(...)
requestClosure(...)
```

Runtime owns:

* waiting-side updates
* receipts
* heartbeats
* projection refresh
* state transitions
* evidence linkage

---

# Presence Board / Online State

Built SQL-backed online visibility.

Presence board now shows:

* upstream/downstream online state
* heartbeat freshness
* active channel
* waiting side
* expected message
* operator nudge
* next action

Important principle:

```text
“I’m online” is not evidence.
Heartbeat + projection is evidence.
```

---

# Message Bus Watches

Huge coordination upgrade.

System now tracks:

```text
who is waiting
for what message
from whom
how stale it is
what nudge should be sent
```

Built:

```text
startMessageWatch(...)
acknowledgeExpectedMessage(...)
expireMessageWatch(...)
```

Projection shows:

* expected message
* stale timer
* watch state
* operator nudge

---

# Message Watch Automation

Built:

* stale detection
* automatic nudges
* escalation
* automation events

Goal:

```text
routine coordination pressure handled automatically
```

before human intervention.

---

# Delivery Verification

Defined delivery verification model:

```text
send
→ persisted
→ receipt
→ recipient visibility
→ watch acknowledgement
```

Need SDK methods:

```text
verifyMessageSent(...)
verifyMessageReceived(...)
```

---

# Communication Presence & Diagnostics

Established need for:

## npm commands (repo-aware)

```bash
npm run communication:participant
npm run communication:presence
npm run communication:channels
npm run communication:messages
npm run communication:watches
npm run communication:status
```

## SDK methods (repo-less)

```text
whoIsOnline(...)
listOpenCommunicationChannels(...)
sendToRole(...)
sendToParticipant(...)
getPresenceBoard(...)
```

Key principle:

```text
repo-aware upstream
repo-less downstream
same governed substrate
```

---

# One-Step Communication Primitive

Critical realization:

```text
opening communication should be one command
```

Designed:

```text
connectToTransferChannel(...)
```

Must own:

* join/resume
* heartbeat
* message watch
* projection refresh
* presence visibility
* continuity runner

---

# Continuity Runner

Need:

```text
persistent channel continuity
```

not:

```text
chat-session continuity
```

Continuity runner tracks:

* retries
* stop reasons
* stale detection
* active work
* heartbeat freshness
* retry step
* next action

---

# Ping-Pong Hardening Loop

Built concept:

```text
coordination_ping
coordination_pong
```

Purpose:

continuous liveness validation.

Validates:

* routing
* receipts
* watches
* freshness
* escalation
* visibility
* continuity

Current state:

* primitive works
* live loop attached
* state reconciliation still noisy/conflicting

---

# Key Friction Lessons

## Biggest issue discovered

Agents were:

```text
loading entire repo context
```

when they should have been:

```text
acting as communication participants
```

Fix:

minimal context packet + SDK/API only.

---

## Another key lesson

```text
designed primitive ≠ deployed primitive
```

Must always:

* check installed SDK version
* run capability discovery
* run preflight

before assuming a feature exists.

---

# Current Remaining Problems

## 1. Ping-Pong State Reconciliation

Current projections show conflicting waits:

* waiting_on_upstream
* waiting_for_downstream
* coordination_ping outstanding

Need:

```text
one authoritative active wait
```

---

## 2. Projection Size Explosion

Current collaboration projection became massive (~15MB).

Need:

* compact operator surface
* heartbeat summarization
* rolling windows
* separation of historical vs active state

---

## 3. Role Router Reliability

`sendToRole(...)` was flaky.

Need:

* deterministic role routing
* active participant resolution
* no participant-id spelunking

---

## 4. Communication Must Never Require Repo Bootstraps

Still seeing:

```text
memory:load
project:resume
```

for simple channel actions.

Need strict rule:

```text
channel actions use channel primitives only
```

---

# Final Operational Model

## Human

Monitors:

* presence board
* watches
* ping/pong health
* escalation
* blockers

Not relay messages.

---

## Upstream

Repo-aware implementation participant.

Uses:

* npm commands
* SDK
* governed communication

---

## Downstream

Repo-less communication participant.

Uses:

* SDK/API only
* no repo tooling
* no direct SQL

---

# Final North Star

```text
database
+
governed substrate
+
two agents
+
operator visibility
```

Everything else becomes implementation detail.
