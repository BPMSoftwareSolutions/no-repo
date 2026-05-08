# Governed Implementation Surface Bundle

This folder contains the hand-off bundle for three refactored ai-engine surfaces:

- `inspect_governed_implementation_candidate`
- `operator_cleanup_store`
- `codebase_shape/rows`

Each surface includes:

- a refactored Python draft
- a sibling runtime contract example file when the draft uses contract keys
- a sibling runtime binding registry file

Bundle contents:

- `inspect_governed_implementation_candidate.refactored.py`
- `inspect_governed_implementation_candidate.contracts.json`
- `inspect_governed_implementation_candidate.bindings.json`
- `operator_cleanup_store.refactored.py`
- `operator_cleanup_store.contracts.json`
- `operator_cleanup_store.bindings.json`
- `codebase_shape_rows.refactored.py`
- `codebase_shape_rows.contracts.json`
- `codebase_shape_rows.bindings.json`

The drafts are intentionally bundle-relative and do not depend on repository-local paths from the source checkout.
