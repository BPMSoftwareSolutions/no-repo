# AI Engine SDK Projection Runtime Platformization - Task And Subtask Breakdown

## Purpose
Detailed execution guidance for backend-platform implementation based on the working declarative portfolio projection example.

## Phase 1 - Foundation

### Item: baseline-current-runtime-capabilities
Task 1: Build behavior parity matrix
Subtasks:
1. Catalog current behavior for each loops, nested tokens, fallback chains, dataMap, derive rules.
2. Capture edge-case examples from the working projection flow.
3. Define expected deterministic behavior for null, empty, and missing token values.

Task 2: Capture reference fixtures
Subtasks:
1. Extract representative input payloads for portfolio bundle API responses.
2. Save expected markdown outputs for baseline snapshots.
3. Record metadata/provenance expectations from current runtime responses.

### Item: define-sdk-runtime-contract
Task 1: Define runtime API surface
Subtasks:
1. Define module boundaries: template runtime, resolver, dataMap engine, derive engine.
2. Define input/output contracts per module.
3. Define error model for invalid templates and transform specs.

Task 2: Define compatibility guarantees
Subtasks:
1. Enumerate must-not-break behavior from existing scalar token substitution.
2. Define compatibility test criteria for existing consumers.
3. Define deprecation strategy for any future syntax changes.

### Item: define-transform-contract-schema
Task 1: Finalize transform schema
Subtasks:
1. Finalize `template`, `dataMap`, and `derive` sections.
2. Define filter operators and comparison semantics.
3. Define derive rule evaluation order and default behavior.

Task 2: Add schema validation contract
Subtasks:
1. Define required and optional properties.
2. Define field-level validation errors.
3. Add examples for valid and invalid transform declarations.

### Item: design-backward-compatibility-guardrails
Task 1: Rollout strategy design
Subtasks:
1. Define feature flags for runtime selection.
2. Define shadow mode verification path.
3. Define rollback path and triggers.

Task 2: Governance guardrails
Subtasks:
1. Define production promotion checks for runtime migration.
2. Define evidence requirements for parity signoff.
3. Define ownership and escalation paths for regressions.

## Phase 2 - Implementation

### Item: implement-sdk-token-resolver-core
Task 1: Implement nested token lookup
Subtasks:
1. Implement arbitrary-depth dot path resolution.
2. Add null-safe traversal behavior.
3. Add deterministic string conversion policy.

Task 2: Implement fallback chain semantics
Subtasks:
1. Parse fallback expressions split by `||`.
2. Resolve first non-empty candidate value.
3. Preserve final fallback behavior for unresolved chains.

### Item: implement-sdk-each-renderer
Task 1: Implement each block parser
Subtasks:
1. Parse each block boundaries and collection expression.
2. Render item-scoped body templates.
3. Preserve collection order and stable output.

Task 2: Implement nested substitution inside each
Subtasks:
1. Merge item tokens with shared token context.
2. Validate behavior for non-object collection entries.
3. Ensure recursion safety for nested template calls.

### Item: implement-sdk-datamap-filter-engine
Task 1: Implement data mapping primitives
Subtasks:
1. Map scalar source paths.
2. Map collection source paths.
3. Support optional path/source declaration variants.

Task 2: Implement filtering behavior
Subtasks:
1. Implement string value matching.
2. Implement array contains matching.
3. Implement numeric `gt` comparison handling.

### Item: implement-sdk-derive-engine
Task 1: Implement rule-chain derive evaluation
Subtasks:
1. Evaluate ordered derive rules.
2. Support default fallbacks.
3. Handle missing and malformed derive specs safely.

Task 2: Implement template-based derive values
Subtasks:
1. Implement interpolation `{field}` replacement.
2. Implement interpolation pipes including `|encode`.
3. Apply fallback values when derived output is empty.

### Item: implement-sdk-runtime-engine
Task 1: Compose shared runtime pipeline
Subtasks:
1. Sequence dataMap, derive injection, and template rendering.
2. Define common runtime entrypoint for projection transforms.
3. Add provenance hooks for contract execution tracing.

Task 2: Package and publish SDK module
Subtasks:
1. Export runtime through stable SDK surface.
2. Add versioned release notes for new runtime capability.
3. Publish usage examples for application integrators.

### Item: integrate-sdk-runtime-into-operator-projections
Task 1: Integrate portfolio projection path
Subtasks:
1. Replace app-local portfolio transform logic with shared runtime call.
2. Validate rendered output parity with baseline fixtures.
3. Confirm fallback behavior on missing API data.

Task 2: Integrate routing fallback strategy
Subtasks:
1. Keep legacy transform fallback for non-migrated surfaces.
2. Add logging that distinguishes shared runtime vs legacy runtime execution.
3. Add migration toggle controls for incremental rollout.

### Item: integrate-platform-transform-executor
Task 1: Backend execution endpoint integration
Subtasks:
1. Use shared runtime in backend projection execution path.
2. Return contract metadata and provenance fields consistently.
3. Ensure transform validation failures return actionable diagnostics.

Task 2: Error contract hardening
Subtasks:
1. Replace generic 500 responses with structured mutation errors.
2. Include contract path details in validation errors.
3. Add correlation IDs and troubleshooting hints.

### Item: harden-mutation-and-governance-paths
Task 1: Fix project bootstrap dependency
Subtasks:
1. Restore runtime query contract `project_bootstrap_task_by_key`.
2. Verify charter and project-delivery APIs succeed after restoration.
3. Add regression test for bootstrap task lookup path.

Task 2: Harden roadmap import path
Subtasks:
1. Validate item domain requirements (`originDomain`, `targetDomain`) end-to-end.
2. Ensure packet import errors are structured and actionable.
3. Add integration tests for packet import success and failure paths.

## Phase 3 - Validation And Adoption

### Item: build-runtime-unit-test-suite
Task 1: Add resolver and renderer test coverage
Subtasks:
1. Add unit tests for nested token resolution and fallback chains.
2. Add unit tests for each rendering behavior and context scoping.
3. Add unit tests for malformed expression handling.

Task 2: Add dataMap and derive test coverage
Subtasks:
1. Add tests for filter permutations including `gt`.
2. Add tests for derive rule priority and default handling.
3. Add tests for interpolation and encode pipe behavior.

### Item: establish-parity-verification-suite
Task 1: Build snapshot parity harness
Subtasks:
1. Capture baseline markdown outputs from current runtime.
2. Render same inputs through shared runtime.
3. Diff outputs and assert parity.

Task 2: Build metadata parity harness
Subtasks:
1. Verify required metadata fields are present.
2. Verify provenance/source-truth consistency.
3. Fail builds on metadata regressions.

### Item: validate-backend-provenance-contract
Task 1: Contract validation tests
Subtasks:
1. Validate transport metadata fields for projection responses.
2. Validate correlation and source version fields.
3. Validate behavior for contract mismatch scenarios.

Task 2: Runtime observability checks
Subtasks:
1. Add execution traces for transform contract path.
2. Ensure errors include correlation IDs.
3. Add dashboard/report for runtime adoption status.

### Item: publish-migration-guidance-and-onboard
Task 1: Publish migration playbook
Subtasks:
1. Create migration steps for legacy to shared runtime path.
2. Document fallback and rollback procedures.
3. Document validation checklist before production cutover.

Task 2: Onboard first two consumers
Subtasks:
1. Select two target applications.
2. Execute migration and parity checks in each app.
3. Capture post-migration evidence and lessons learned.
