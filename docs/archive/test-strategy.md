# Test Strategy

## Purpose

Run the repo-less operator experiment from `Experiment Test Plan.md` using only the AI Engine npm client and governed API surfaces.

The current harness is a governed execution simulation. It emits contract, execution record, operation log, and gate-ready evidence shapes, but it is not yet wrapper-produced evidence accepted by AI Engine gates.

## Test Flow

1. Confirm client connectivity with `npm run ping`.
2. Run the executable experiment with `npm run experiment`.
3. Review the JSON report printed by the experiment script, especially `contract`, `wrapper_execution_record`, `operation_log`, and `gate_ready_evidence_payload`.
4. Shape a dry-run gate-ready payload with `npm run evidence:shape`.
5. Run LOGA projection experiments with `npm run loga:experiment`.
6. Shape LOGA evidence without service calls with `npm run loga:evidence:shape`.
7. Submit evidence only through a governed AI Engine endpoint when an implementation item or session contract exists.

## Required Environment

```powershell
$env:AI_ENGINE_API_KEY = "your-api-key"
$env:AI_ENGINE_BASE_URL = "https://your-ai-engine-host"
```

Optional experiment inputs:

```powershell
$env:AI_ENGINE_TEST_SYMBOL = "src.orchestration.agent_substrate_service.AgentSubstrateService"
$env:AI_ENGINE_TEST_DISCOVERY_INTENT = "Find the symbol responsible for retrieval wrapper service behavior without prior symbol knowledge."
$env:AI_ENGINE_TEST_RELATED_INTENT = "retrieval wrapper service"
$env:AI_ENGINE_TEST_RELATIONSHIP_TYPE = "calls"
```

Note: the current npm client `getRelatedCode()` method is symbol-oriented, not free-text search-oriented. `AI_ENGINE_TEST_RELATED_INTENT` is recorded as experiment metadata until a governed intent-search endpoint is available.

## Pass Criteria

- Connectivity returns health and memory projection data.
- Code intelligence routes return bounded code, relevant metadata, or explicit unsupported/not-found results.
- Generated local artifacts remain evidence, not source of truth.
- Missing capabilities are logged as first-class findings.
- Symbol discovery without prior symbol knowledge is recorded as an unsupported operation, not a script failure.
- The output includes plan vs actual, success/failure, execution record, and operation log sections.
- No target repository clone or raw target file access is introduced.

## Guardrails

Authority remains:

```text
SQL truth -> governed retrieval -> local experiment -> submitted evidence -> wrapper mutation -> gate decision
```

Local scripts may inspect API responses and shape artifacts, but they must not become mutation authority.

## Current Findings To Preserve

- `getSymbolDefinition()` supports known symbol lookup.
- `getRelatedCode()` supports symbol-addressed graph traversal.
- Intent-based search is missing from the current SDK boundary.
- Repo-less discovery remains constrained without symbol foreknowledge.
- Governed execution submission is not connected by this harness yet.

## LOGA Projection Findings To Preserve

- `getLogaOperatorHomeProjection()` gives Experiment 1 a real governed projection read surface.
- Project, workflow, and evidence projections require scoped identifiers before they can be inspected.
- Approval review, diagnostic failure, live monitor, comparison, human workspace, and polished demo projections are not exposed as direct SDK surfaces yet.
- Prompt-to-LOGA markdown contract generation is missing as a governed endpoint.
- Experiment 1 is ready for upstream implementation: patch the AI Engine `operator.home` projection emitter, then rerun `npm test` and `npm run loga:experiment` here.

Expected missing-surface finding:

```json
{
  "finding_type": "missing_surface",
  "surface": "intent_code_search",
  "impact": "repo_less_operator_requires_prior_symbol_knowledge"
}
```
