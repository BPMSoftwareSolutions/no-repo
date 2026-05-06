# Experiment 1 Remediation Instruction

## Instruction

```text
Proceed with Experiment 1 remediation.

Do not add new endpoints.

Update only the operator.home LOGA projection markdown shape so the emitted text includes:
- ::focus
- ::evidence_drawer
- ::next_actions
- all five canonical question labels

Keep SQL as source truth and preserve the existing metadata:
- projection_type: operator.home
- contract: ai-engine-ui/v1
- source_truth: sql

Rerun the LOGA experiment harness after the change. The target is zero Experiment 1 quality gaps.
```

## Current Status

```text
Experiment 1 status:
Transport/governance: PASS
Correction payload propagation: PASS
UX contract shape: FAIL
Next step: remediate projection template, not API transport.
```

## Tighter Implementation Instruction

See [Experiment 1 Implementation Instruction](experiment-1-implementation-instruction.md).
