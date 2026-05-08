from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from orchestration.data_access_runtime.executor import execute_runtime_query
from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation
from persistence.sql.file_organizer_store import PgConnectionSettings

try:
    import psycopg2
    import psycopg2.extensions
except Exception:  # pragma: no cover - optional until PostgreSQL lane is enabled
    psycopg2 = None


@dataclass(frozen=True, slots=True)
class MigrationStatusRecord:
    migration_name: str
    status: str


@dataclass(frozen=True, slots=True)
class ApplyMigrationsRuntimeContracts:
    history_ensure: str = 'apply_migrations_history_ensure'
    history_lookup: str = 'apply_migrations_history_lookup'
    history_record_applied: str = 'apply_migrations_history_record_applied'


@dataclass(slots=True)
class ApplyMigrationsRuntimeStore:
    contracts: ApplyMigrationsRuntimeContracts = field(default_factory=ApplyMigrationsRuntimeContracts)

    def ensure_history(self) -> None:
        execute_runtime_mutation(self.contracts.history_ensure, {})

    def get_existing_status(self, migration_name: str) -> str | None:
        row = _first_row(
            execute_runtime_query(
                self.contracts.history_lookup,
                {'migration_name': migration_name},
            )
        )
        if not row:
            return None
        return 'already_applied'

    def record_applied(self, migration_name: str) -> dict[str, Any]:
        row = _first_row(
            execute_runtime_mutation(
                self.contracts.history_record_applied,
                {'migration_name': migration_name},
            )
        )
        return row


class MigrationApplicationError(RuntimeError):
    def __init__(self, migration_name: str, original_error: Exception) -> None:
        self.migration_name = migration_name
        self.original_error = original_error
        super().__init__(f"Migration failed and was not recorded: {migration_name}: {original_error}")


def _normalize_rows(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if isinstance(value, list):
        rows: list[dict[str, Any]] = []
        for item in value:
            if isinstance(item, dict):
                rows.append(item)
            else:
                rows.append({'value': item})
        return rows
    if isinstance(value, dict):
        rows = value.get('rows')
        if isinstance(rows, list):
            normalized: list[dict[str, Any]] = []
            for item in rows:
                if isinstance(item, dict):
                    normalized.append(item)
                else:
                    normalized.append({'value': item})
            return normalized
        return [value]
    return [{'value': value}]


def _first_row(value: Any) -> dict[str, Any]:
    rows = _normalize_rows(value)
    return rows[0] if rows else {}


def _row_value(row: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in row and row[key] is not None:
            return row[key]
    return None


def apply_all_migrations(settings: PgConnectionSettings | None = None) -> list[str]:
    return [record.migration_name for record in inspect_and_apply_migrations(settings) if record.status == 'applied_now']


def inspect_and_apply_migrations(
    settings: PgConnectionSettings | None = None,
    migration_dir: Path | None = None,
) -> list[MigrationStatusRecord]:
    return _inspect_and_apply_postgres_migrations(settings=settings, migration_dir=migration_dir)


def _inspect_and_apply_postgres_migrations(
    settings: PgConnectionSettings | None = None,
    migration_dir: Path | None = None,
) -> list[MigrationStatusRecord]:
    if psycopg2 is None:
        raise RuntimeError(
            'PostgreSQL migration mode requires psycopg2 to be installed. '
            'Add psycopg2-binary to the environment before running migrations.'
        )

    pg_settings = settings or PgConnectionSettings.from_env()
    resolved_migration_dir = migration_dir or (Path(__file__).resolve().parent / 'migrations')
    statuses: list[MigrationStatusRecord] = []
    runtime_store = ApplyMigrationsRuntimeStore()

    connection = psycopg2.connect(
        host=pg_settings.host,
        port=pg_settings.port,
        dbname=pg_settings.database,
        user=pg_settings.user,
        password=pg_settings.password,
        sslmode=pg_settings.sslmode,
    )
    connection.autocommit = False
    try:
        runtime_store.ensure_history()
        with connection.cursor() as cursor:
            for migration_path in sorted(resolved_migration_dir.glob('*.sql')):
                existing_status = runtime_store.get_existing_status(migration_path.name)
                if existing_status is not None:
                    statuses.append(MigrationStatusRecord(migration_path.name, existing_status))
                    continue

                _apply_pg_migration(cursor, connection, runtime_store, migration_path)
                statuses.append(MigrationStatusRecord(migration_path.name, 'applied_now'))
    finally:
        connection.close()

    return statuses


def _apply_pg_migration(
    cursor: Any,
    connection: Any,
    runtime_store: ApplyMigrationsRuntimeStore,
    migration_path: Path,
) -> None:
    sql_text = migration_path.read_text(encoding='utf-8')
    try:
        for batch in _split_batches(sql_text):
            if batch.strip() and not _is_effectively_empty_batch(batch):
                cursor.execute(batch)
        runtime_store.record_applied(migration_path.name)
        connection.commit()
    except Exception as exc:
        connection.rollback()
        raise MigrationApplicationError(migration_path.name, exc) from exc


def _split_batches(sql_text: str) -> list[str]:
    """
    Split a PostgreSQL migration file into executable batches.
    Dollar-quoted function bodies ($$ ... $$) are kept intact.
    Statements are split on semicolons outside dollar-quoted blocks.
    GO batch separators (T-SQL artefacts) are stripped.
    """
    sql_text = re.sub(r'^\s*GO\s*$', '', sql_text, flags=re.MULTILINE | re.IGNORECASE)

    batches: list[str] = []
    current: list[str] = []
    in_dollar_quote = False

    for line in sql_text.split('\n'):
        stripped = line.strip()
        dollar_count = stripped.count('$$')
        if dollar_count % 2 == 1:
            in_dollar_quote = not in_dollar_quote
        current.append(line)
        if not in_dollar_quote and stripped.endswith(';'):
            batch = '\n'.join(current).strip().rstrip(';').strip()
            if batch:
                batches.append(batch + ';')
            current = []

    remainder = '\n'.join(current).strip()
    if remainder:
        batches.append(remainder)

    return batches


def _is_effectively_empty_batch(batch: str) -> bool:
    in_block_comment = False
    for raw_line in batch.splitlines():
        line = raw_line

        while True:
            if in_block_comment:
                end_idx = line.find('*/')
                if end_idx == -1:
                    line = ''
                    break
                line = line[end_idx + 2:]
                in_block_comment = False

            start_idx = line.find('/*')
            if start_idx == -1:
                break

            end_idx = line.find('*/', start_idx + 2)
            if end_idx == -1:
                line = line[:start_idx]
                in_block_comment = True
                break

            line = line[:start_idx] + line[end_idx + 2:]

        line = line.split('--', 1)[0]
        if line.strip():
            return False

    return True


def main() -> None:
    statuses = inspect_and_apply_migrations()
    print('Migration status:')
    for record in statuses:
        print(f' - {record.migration_name} [{record.status}]')

    already_applied_count = sum(1 for record in statuses if record.status == 'already_applied')
    applied_now_count = sum(1 for record in statuses if record.status == 'applied_now')
    failed_count = sum(1 for record in statuses if record.status == 'failed')
    print(
        'Summary: '
        f"{len(statuses)} migration file(s) inspected; "
        f"{already_applied_count} already recorded; "
        f"{applied_now_count} applied now; "
        f"{failed_count} failed."
    )
    if failed_count:
        sys.exit(1)


if __name__ == '__main__':
    main()
