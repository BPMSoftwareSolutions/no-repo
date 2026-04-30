# Operator Home Remediation Payload

## Status

```text
Harness: complete
Evidence propagation: complete
Regression findings: complete
Implementation instruction: complete
AI Engine emitter: pending
```

## Request

Submit updated LOGA experiment payload upstream for `operator.home`.

### Summary

The live `operator.home` projection passes the required LOGA primitives, but it still fails the UX gate because it does not cover all five canonical question labels.

### Required remediation

Update only the `operator.home` LOGA markdown projection shape so the emitted text includes:

* `::focus`
* `::evidence_drawer`
* `::next_actions`
* all five canonical question labels

Do not change endpoint behavior, source truth, SQL projection logic, or API transport. This is a markdown projection-shape fix only.

## Failing Projection Evidence

Fetched through `npm run loga:experiment`.

```json
{
  "projection_type": "operator.home",
  "loga_contract": "ai-engine-ui/v1",
  "interaction_contract": "loga-choreography/v1",
  "source_truth": "sql",
  "content_type": "text/markdown; charset=utf-8",
  "text_char_count": 3064,
  "primitive_results": [
    {
      "primitive": "::focus",
      "present": true
    },
    {
      "primitive": "::panel",
      "present": true
    },
    {
      "primitive": "::metric_row",
      "present": true
    },
    {
      "primitive": "::nav",
      "present": true
    },
    {
      "primitive": "::evidence_drawer",
      "present": true
    },
    {
      "primitive": "::next_actions",
      "present": true
    }
  ],
  "canonical_questions": [
    {
      "question": "What is happening?",
      "present": true
    },
    {
      "question": "What should I care about right now?",
      "present": false
    },
    {
      "question": "What do I need to decide?",
      "present": false
    },
    {
      "question": "Why should I trust this?",
      "present": false
    },
    {
      "question": "What should I do next?",
      "present": false
    }
  ]
}
```

## Blocking Finding

```json
{
  "finding_type": "ux_contract_violation",
  "violation_type": "missing_canonical_questions",
  "severity": "block",
  "surface": "operator_home_dashboard",
  "expected": [
    "What should I care about right now?",
    "What do I need to decide?",
    "Why should I trust this?",
    "What should I do next?"
  ],
  "observed": [],
  "remediation_instruction": "Proceed with Experiment 1 remediation. Do not add new endpoints. Update only the operator.home LOGA projection markdown shape so the emitted text includes ::focus, ::evidence_drawer, ::next_actions, and all five canonical question labels. Keep SQL as source truth and preserve the existing metadata: projection_type: operator.home, contract: ai-engine-ui/v1, source_truth: sql. Rerun the LOGA experiment harness after the change. The target is zero Experiment 1 quality gaps."
}
```

## Upstream Payload

```json
{
  "feedback_type": "ux_projection_contract_remediation",
  "target_surface": "operator.home",
  "severity": "block",
  "instruction": "Update only the operator.home LOGA projection markdown shape so the emitted text includes ::focus, ::evidence_drawer, ::next_actions, and all five canonical question labels. Do not change endpoint behavior, source truth, SQL projection logic, or API transport.",
  "contract_version": "loga-experiment-set-2/v1",
  "source_truth_required": "sql",
  "evidence": {
    "projection_type": "operator.home",
    "loga_contract": "ai-engine-ui/v1",
    "interaction_contract": "loga-choreography/v1",
    "source_truth": "sql",
    "content_type": "text/markdown; charset=utf-8",
    "text_char_count": 3064
  },
  "blocked_questions": [
    "What should I care about right now?",
    "What do I need to decide?",
    "Why should I trust this?",
    "What should I do next?"
  ]
}
```

## Readout

```text
LOGA is acting as the UX gate, not just a renderer.
The evidence loop is complete; only the actual AI Engine projection emitter remains unfixed.
```
