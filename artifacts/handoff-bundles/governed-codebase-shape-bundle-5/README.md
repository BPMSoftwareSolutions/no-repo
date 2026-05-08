# Governed Codebase Shape Bundle

This bundle contains contract-backed drafts for:

- `src/persistence/sql/codebase_shape/journal.py`
- `src/persistence/sql/codebase_shape_adapter.py`

Contents:
- `codebase_shape_journal.refactored.py`
- `codebase_shape_adapter.refactored.py`
- `codebase_shape_journal.contracts.json`
- `codebase_shape_journal.bindings.json`
- `codebase_shape_adapter.contracts.json`
- `codebase_shape_adapter.bindings.json`

Notes:
- The journal mixin is rewritten so the per-observation inserts move through runtime contracts instead of handwritten SQL.
- The adapter draft keeps the orchestration shape but routes repository sync policy lookup and report persistence through runtime contracts.
