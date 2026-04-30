# Experiment 2 Upstream Implementation Request

## Status

```text
Harness: complete (enforcing UX contract compliance)
Evidence propagation: complete
Regression findings: complete
Implementation instruction: complete
AI Engine emitter: pending
```

## Request

Submit updated LOGA experiment payload upstream.

**Summary:**
The experiment harness now enforces UX contract compliance as a blocking gate. Operator Home currently fails strict UX governance because it omits required primitives and canonical question coverage.

**Required remediation:**
Update only the `operator.home` LOGA markdown projection shape to include:
- `::focus`
- `::evidence_drawer`
- `::next_actions`
- all five canonical question labels

Do not change endpoint behavior, source truth, SQL projection logic, or API transport. This is a markdown projection-shape fix only.

## Failing Projection Evidence

```json
{
  "finding_type": "ux_contract_violation",
  "violation_type": "missing_required_primitives",
  "severity": "block",
  "surface": "operator_home_dashboard",
  "expected": [
    "::focus",
    "::evidence_drawer"
  ],
  "observed": []
}
```

```json
{
  "finding_type": "ux_contract_violation",
  "violation_type": "missing_canonical_questions",
  "severity": "block",
  "surface": "operator_home_dashboard",
  "expected": [
    "What is happening?",
    "What should I care about?",
    "What do I decide?",
    "Why trust this?",
    "What next?"
  ],
  "observed": []
}
```

## Readout

LOGA is acting as the UX gate, not just a renderer. The evidence loop is complete; only the actual AI Engine projection emitter remains unfixed.
