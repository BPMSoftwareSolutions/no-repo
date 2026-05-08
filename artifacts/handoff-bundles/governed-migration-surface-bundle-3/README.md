# Governed Migration Surface Bundle

This bundle contains a contract-backed draft for `src/persistence/sql/apply_migrations.py`.

Contents:
- `apply_migrations.refactored.py`
- `apply_migrations.contracts.json`
- `apply_migrations.bindings.json`

Notes:
- The draft removes the migration-history read/write SQL from the file and routes those operations through runtime contracts.
- The batch execution of migration `.sql` files remains direct, since that is the purpose of the migration runner itself.
- The refactor keeps the batch-splitting helpers and CLI entrypoint, but makes the database history layer contract-driven.
