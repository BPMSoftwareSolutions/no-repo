# Experiment 1 Correction Payload

## Readout

Experiment 1 is now a clean boundary test.

```text
Transport/governance passed.
UX contract shape failed.
```

## Payload

```text
Experiment 1 failed the LOGA UX contract gate.

Keep:
- endpoint: getLogaOperatorHomeProjection()
- projection_type: operator.home
- loga_contract: ai-engine-ui/v1
- source_truth: sql
- operation status: pass

Fix:
The markdown body must include the required human-friendly LOGA contract blocks:

1. ::focus
Primary question:
"What should I care about right now?"

2. Explicit canonical question sections:
- What is happening?
- What should I care about?
- What do I decide?
- Why trust this?
- What next?

3. ::evidence_drawer
Move raw IDs, source versions, SQL provenance, evidence result, and gate-review details into this drawer.

4. ::next_actions
Include clear operator actions:
- Review gate evidence
- Open active project
- Refresh projection
- Open workflow details

Acceptance:
The projection is not passing Experiment 1 until the markdown text contains:
- ::focus
- ::evidence_drawer
- all five canonical question labels
- ::next_actions

Do not change the endpoint or source truth. This is a markdown projection-shape fix, not an API rewrite.
```
