# Governance Gates as Workflows — Alpha

**Status:** Alpha  
**Date:** 2026-05-11  
**Author:** Sidney Jones

---

## 1. Executive Summary

Governance gates today are synchronous single-pass evaluators. They collect evidence, run a sequence of checks, and return a binary `allow / block` decision. That model is correct for enforcement. It is incomplete for acceleration.

The thesis of this document is:

> **Every governance gate should be a workflow in its own right — with discoverable phases, durable state, structured telemetry, and the architectural capacity to learn from its own outcomes.**

When a gate becomes a workflow, it transitions from a compliance enforcer into a governance helper: a system that actively guides agents and operators toward policy compliance rather than simply detecting and blocking violations. Governance helpers produce acceleration. Governance blockers produce friction.

This alpha scopes the analysis, identifies the structural gap, and proposes the evolutionary architecture.

---

## 2. Current State Analysis

### 2.1 What Exists

The repo contains 13+ named gates distributed across the execution and orchestration layers:

| Gate | Layer | Decision Type | Phase Count |
|---|---|---|---|
| `commit_governance_gate` | execution | allow / block | 11 sequential checks |
| `context_session_orientation_gate` | execution | pass / fail | 4 checks |
| `intent_alignment_gate` | execution | pass / fail / partial | 3–5 checks |
| `workflow_governance` (multi-gate) | orchestration | pass / fail per gate | 13 gates in sequence |
| `ux_live_promotion_gate` | orchestration | issues[] | live health checks |
| `workflow_run_wrapper_gate_service` | orchestration | persisted / blocked | wrapper evidence |
| `workflow_promotion_review_runtime_gate` | orchestration | pass / fail | evidence readiness |
| `refactor_packet_intake_gate` | orchestration | accept / reject | structural validation |

Each gate is implemented as a standalone module. There is no shared base class, no shared lifecycle contract, and no shared telemetry schema.

### 2.2 What the Current Model Gets Right

- **Fail-closed posture.** Unknown or incomplete evidence defaults to block, not pass.
- **Violations are first-class data.** Every check produces structured `violation_code`, `severity`, `message`, and `detail`. This is stored in SQL.
- **Audit trail is complete.** `governance.commit_governance_evaluations`, `workflow_gate_bundles`, `workflow_gate_events`, and `workflow_gate_approvals` provide full replay capability.
- **Severity tiering exists.** `blocking` vs `advisory` violations — non-fatal advisories are recorded without halting execution.
- **Break-glass is available.** Manual exception requests with audit logging and time-bound expiry exist in `governance.manual_exception_requests`.
- **Remediation surfaces exist.** UX gate remediation tickets and session compliance gaps are spawnable from gate failures.

### 2.3 What the Current Model Is Missing

The structural gaps, ordered by impact:

**Gap 1 — Gates have no workflow identity.**  
A gate run is not a trackable, resumable entity. There is no gate run ID, no run status, no way to query "which gates are currently blocked waiting for evidence." Gates exist as function calls, not as workflow nodes.

**Gap 2 — Gates cannot differentiate between "not yet" and "never."**  
A gate that fails because evidence is missing looks identical to a gate that fails because evidence is present and wrong. The agent gets blocked either way. A governance helper would distinguish these and route accordingly.

**Gap 3 — Gates have no internal phase model.**  
The 11-check commit governance gate executes atomically. A check that fails in step 3 doesn't know what steps 4–11 would have said. A phase-aware gate could report partial progress, surface the full violation picture, and communicate which phases passed — reducing re-evaluation overhead after remediation.

**Gap 4 — Gates have no remediation contract.**  
When a gate blocks, it emits violations. It does not emit a remediation plan. The agent must infer what to do from the violation code. A governance helper attaches a structured remediation contract to each violation: what needs to change, how to trigger re-evaluation, and what the expected outcome is.

**Gap 5 — Gates have no learning loop.**  
Gate telemetry is stored but not fed back. There is no mechanism for a gate to observe patterns in its own violation history and propose policy refinements, threshold adjustments, or check reordering. Gates are static.

**Gap 6 — Gates cannot auto-approve based on accumulated policy.**  
The system supports human approval via `workflow_gate_approvals`. There is no policy-expression layer that allows a gate to auto-approve when a scored evidence bundle exceeds defined thresholds. Every approval is manual or blocked.

**Gap 7 — No cross-gate coordination.**  
Gates do not share state. The commit gate does not know what the orientation gate saw. The workflow governance multi-gate evaluator runs 13 gates sequentially but each gate re-discovers the same context. There is no shared evidence substrate across a gate execution session.

---

## 3. The Governance Helper Model

### 3.1 The Transformation

```
GATE (today)                         GOVERNANCE HELPER (target)
─────────────────────────────────    ─────────────────────────────────────────
Synchronous function call            Stateful mini-workflow with lifecycle
Single pass → decision               Phases: gather → evaluate → advise → resolve
Binary allow/block                   Graduated: pass / partial / advisory / block
Static policy                        Policy + accumulated learning
Silent about remediation             Emits structured remediation contract
No workflow identity                 Has gate_run_id, status, timeline
Isolated                             Shares evidence substrate across gates
```

### 3.2 The Gate Workflow Lifecycle

Each governance gate becomes a workflow with five phases:

```
Phase 1: EVIDENCE GATHERING (automated)
  → collect all inputs the gate requires
  → record what was found vs. what was expected
  → mark evidence as present / missing / stale

Phase 2: RULE EVALUATION (automated)
  → execute each check against available evidence
  → produce violation records with severity and detail
  → compute phase-level result: passed / failed / incomplete

Phase 3: ADVISORY OUTPUT (automated)
  → for each violation, generate a remediation contract
  → classify violations: missing-evidence, policy-mismatch, scope-violation, stale-claim
  → emit gate_run verdict with full finding manifest

Phase 4: ESCALATION / RESOLUTION (automated or human-in-loop)
  → if all blocking violations are remediable → emit remediation plan
  → if auto-approve policy is satisfied → auto-approve with audit record
  → if human review required → create gate review request with deadline
  → if exception requested → route to governance.manual_exception_requests

Phase 5: TELEMETRY RECORD (automated)
  → persist full gate_run record to SQL
  → update gate performance metrics (false positive rate, time-to-resolve, bypass rate)
  → emit structured telemetry event for downstream learning loop
```

### 3.3 Acceleration Contribution

Automation contribution is measurable at each phase:

| Phase | Manual Equivalent | Helper Contribution |
|---|---|---|
| Evidence gathering | Agent hunts for prerequisites manually | Gate tells agent exactly what is missing and where to get it |
| Rule evaluation | Agent discovers violations at commit time | Gate evaluates pre-commit with full violation picture |
| Advisory output | Developer reads violation codes and guesses fix | Gate emits a remediation contract with exact steps |
| Escalation | Agent blocked; waits for human | Policy-auto-approve clears low-risk gates immediately |
| Telemetry | Violations are logged but not analyzed | Learning loop surfaces recurring patterns and suggests policy refinements |

**The acceleration contribution formula:**

```
Gate Acceleration = (gates_auto_resolved / total_gate_evaluations)
                  × (mean_remediation_time_before - mean_remediation_time_after)
```

When this number is positive and growing, governance is an accelerator. When it is zero, governance is overhead.

---

## 4. Gate Workflow Architecture

### 4.1 Gate Run as a First-Class Entity

Introduce `governance.gate_runs` as the durable identity for every gate execution:

```sql
CREATE TABLE governance.gate_runs (
    gate_run_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_type           TEXT NOT NULL,         -- 'commit_governance', 'intent_alignment', etc.
    gate_version        TEXT NOT NULL,         -- semver of the gate definition
    workflow_run_id     UUID,                  -- parent workflow run if applicable
    claim_id            TEXT,
    context_session_id  UUID,
    initiated_by        TEXT NOT NULL,         -- agent_id or operator_id
    phase_status        JSONB NOT NULL DEFAULT '{}',  -- { gather: 'complete', evaluate: 'failed', ... }
    overall_status      TEXT NOT NULL DEFAULT 'running',  -- running | passed | failed | blocked | escalated | auto_approved
    violation_count     INT NOT NULL DEFAULT 0,
    blocking_count      INT NOT NULL DEFAULT 0,
    advisory_count      INT NOT NULL DEFAULT 0,
    finding_manifest    JSONB,                 -- full violation records
    remediation_contract JSONB,               -- structured remediation plan per violation
    resolution_method   TEXT,                 -- 'auto_approved' | 'human_approved' | 'exception' | 'remediated_and_retried'
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.2 Phase Records

Each phase of a gate run produces a phase record:

```sql
CREATE TABLE governance.gate_run_phases (
    phase_record_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_run_id         UUID NOT NULL REFERENCES governance.gate_runs(gate_run_id),
    phase_name          TEXT NOT NULL,         -- 'evidence_gathering' | 'rule_evaluation' | 'advisory_output' | 'escalation' | 'telemetry'
    phase_status        TEXT NOT NULL,         -- 'pending' | 'running' | 'complete' | 'failed' | 'skipped'
    phase_input         JSONB,
    phase_output        JSONB,
    duration_ms         INT,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ
);
```

### 4.3 Remediation Contracts

Each blocking violation emits a structured remediation contract rather than a bare error message:

```python
@dataclass
class ViolationRemediationContract:
    violation_code: str
    violation_category: str          # 'missing_evidence' | 'policy_mismatch' | 'scope_violation' | 'stale_claim'
    blocking: bool
    remediation_steps: list[str]     # ordered human-readable steps
    remediation_commands: list[str]  # executable commands (npm run ..., git ..., etc.)
    re_evaluation_trigger: str       # what must change for gate to re-evaluate
    estimated_resolution_time: str   # 'immediate' | '<5min' | '<30min' | 'requires_human'
    auto_resolvable: bool            # can the gate's own helper resolve this without agent action?
    escalation_path: str | None      # if not auto-resolvable, where does this go?
```

### 4.4 Policy-Auto-Approve Rules

Introduce a policy expression table that allows gates to auto-approve under defined conditions:

```sql
CREATE TABLE governance.gate_auto_approve_policies (
    policy_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_type           TEXT NOT NULL,
    policy_name         TEXT NOT NULL,
    policy_expression   JSONB NOT NULL,   -- structured rule: { conditions: [...], operator: 'AND' }
    approved_by         TEXT NOT NULL,    -- operator who approved this policy
    effective_from      TIMESTAMPTZ NOT NULL,
    effective_until     TIMESTAMPTZ,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    audit_note          TEXT
);
```

Example policy (JSON):
```json
{
  "conditions": [
    { "field": "violation_count", "op": "eq", "value": 0 },
    { "field": "advisory_count", "op": "lte", "value": 2 },
    { "field": "branch", "op": "not_in", "value": ["main", "release/*"] },
    { "field": "changed_file_count", "op": "lte", "value": 10 }
  ],
  "operator": "AND",
  "resolution_method": "auto_approved"
}
```

### 4.5 Gate Telemetry Events

Introduce structured telemetry events emitted at each gate phase transition:

```sql
CREATE TABLE governance.gate_telemetry_events (
    event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_run_id         UUID NOT NULL REFERENCES governance.gate_runs(gate_run_id),
    gate_type           TEXT NOT NULL,
    event_type          TEXT NOT NULL,   -- 'phase_started' | 'phase_completed' | 'violation_detected' | 'auto_approved' | 'escalated' | 'resolved'
    event_payload       JSONB NOT NULL,
    agent_id            TEXT,
    workflow_run_id     UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 5. The Learning Loop

### 5.1 Telemetry Signals Gates Should Emit

Every gate run produces the following learning signals:

| Signal | Purpose |
|---|---|
| `violation_code` frequency by `agent_id` | Identify agents with recurring compliance gaps → trigger proactive reminders |
| `time_to_resolution` by `violation_category` | Identify violations that take too long to resolve → candidate for auto-resolve |
| `bypass_rate` by `gate_type` | High bypass rate → gate is too strict or policy needs recalibration |
| `false_positive_rate` | Violations that resolve without any agent action → gate has stale rule |
| `escalation_rate` by `gate_type` | Gates that frequently escalate to human → candidate for policy auto-approve rules |
| `phase_duration_p99` | Gates with slow evidence-gathering → candidate for caching or pre-computation |

### 5.2 Learning Output

The learning loop produces three types of outputs, all surfaced in the operator console:

1. **Policy refinement proposals.** "The `orientation_not_complete` violation resolves within 30 seconds in 94% of cases. Consider reducing its severity to advisory during the first 60 seconds of a session."

2. **Auto-approve policy candidates.** "Commit gates with zero blocking violations on feature branches under 5 changed files have a 99.8% human-approve rate. Propose an auto-approve policy for this pattern."

3. **Remediation contract improvements.** "The `undeclared_files_changed` remediation contract has a 67% first-attempt success rate. Agents who see the current hint add wrong files 33% of the time. Propose revised hint language."

---

## 6. Implementation Roadmap

### Phase 1 — Gate Identity (foundation)
- Introduce `governance.gate_runs` table
- Update `commit_governance_gate` and `context_session_orientation_gate` to write gate run records
- Surface gate run status in agent startup output

### Phase 2 — Remediation Contracts
- Add `ViolationRemediationContract` dataclass
- Update all blocking violations in `commit_governance_gate` to emit remediation contracts
- Surface remediation steps in pre-commit hook output and startup memory load

### Phase 3 — Phase Records
- Introduce `governance.gate_run_phases` table
- Instrument each gate's check sequence as named phases
- Surface phase-level progress in live inspection console

### Phase 4 — Policy Auto-Approve
- Introduce `governance.gate_auto_approve_policies` table and evaluation engine
- Seed the first auto-approve policy for zero-violation feature branch commits
- Add policy evaluation to `commit_governance_gate` resolution step

### Phase 5 — Learning Loop
- Introduce `governance.gate_telemetry_events` table
- Build `npm run governance:learning-report` CLI command
- Surface learning proposals in operator console

---

## 7. What This Unlocks

Once governance gates are workflows with durable identity, phase records, remediation contracts, auto-approve policies, and a learning loop:

**For agents:** Pre-commit is no longer a surprise wall. Gates evaluate continuously, surface the exact remediation steps, and clear automatically when policy permits. Agents spend zero time debugging governance failures.

**For operators:** Gate performance is visible. False positives are measurable. Auto-approve policies are tunable. The system's governance posture improves with each cycle.

**For the platform:** Governance gates become the platform's proof of trustworthiness — not its bottleneck. Every automated gate resolution is an acceleration contribution. Every learning loop cycle is a compounding capability gain.

**The governing principle:** A governance gate that never teaches anything is a cost. A governance gate that teaches every agent what it needs to pass is infrastructure.

---

## 8. Open Questions

1. **Gate versioning.** When a gate's rules change, how do we handle in-flight gate runs? Should gate_version be pinned at run creation?

2. **Cross-gate evidence substrate.** Should all gates in a single commit/session share an evidence cache to avoid redundant lookups? What is the invalidation model?

3. **Remediation contract execution.** Should the platform be able to execute remediation steps on behalf of the agent (auto-heal), or should remediation always be agent-initiated?

4. **Learning loop authority.** Who approves a learning-loop-proposed policy change? Does this require the same governance gate review that any other policy change requires?

5. **Gate composition.** The workflow multi-gate evaluator runs 13 gates sequentially. Should this become a meta-gate with its own gate_run identity and phase model, or should it remain a coordinator of independent gate runs?

---

*Alpha — subject to revision. Scope, schema, and sequencing are preliminary and require governance review before any implementation commitment.*
