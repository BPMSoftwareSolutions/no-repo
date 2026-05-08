from __future__ import annotations

import fnmatch
import hashlib
import json
import os
import re
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Protocol

from orchestration.data_access_runtime.executor import execute_runtime_query
from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation
from persistence.sql.file_organizer_store import PgConnectionSettings, open_sql_connection
from persistence.sql.metadata_sync_lock import metadata_sync_lock


DEFAULT_EXCLUDED_DIR_NAMES = {
    '.git',
    '.hg',
    '.svn',
    '.venv',
    'venv',
    '__pycache__',
    '.pytest_cache',
    'node_modules',
    'dist',
    'build',
    '.mypy_cache',
    '.ruff_cache',
    '.tox',
    '.idea',
    '.vscode',
    '.bak',
    '__tests__',
    '__mocks__',
    'coverage',
}
DEFAULT_EXCLUDED_FILE_PATTERNS = (
    re.compile(r'^test_.*\.py$', re.IGNORECASE),
    re.compile(r'^.*\.test\.(ts|tsx|js|jsx|mjs|cjs)$', re.IGNORECASE),
    re.compile(r'^.*\.spec\.(ts|tsx|js|jsx|mjs|cjs)$', re.IGNORECASE),
    re.compile(r'^.*\.d\.ts$', re.IGNORECASE),
)
DEFAULT_INCLUDE_PATTERNS = ['*.py', '*.sql', '*.ts', '*.tsx', '*.js', '*.jsx', '*.mjs', '*.cjs', '*.cs', '*.html', '*.htm']
DEFAULT_SYNC_INCLUDE_ROOTS = ['src', 'scripts', 'tests']
DEFAULT_SYNC_EXCLUDE_PATTERNS = ['**/node_modules/**', 'node_modules/**']
REPOSITORY_ROOT_SCOPE = '.'


@dataclass(slots=True)
class SyncStats:
    roots: int
    scanned_files: int
    existing_files: int
    missing_files: int
    inserted_files: int
    updated_files: int
    stale_files: int
    deleted_files: int


@dataclass(slots=True)
class RepositorySyncPolicy:
    include_roots: list[str]
    exclude_patterns: list[str]


@dataclass(frozen=True, slots=True)
class CodeFileInventoryContracts:
    upsert_repository: str = 'code_file_inventory_upsert_repository'
    load_repository_sync_policy: str = 'code_file_inventory_load_repository_sync_policy'
    fetch_existing_file_records: str = 'code_file_inventory_fetch_existing_file_records'
    fetch_existing_file_rows_by_path: str = 'code_file_inventory_fetch_existing_file_rows_by_path'
    batch_update_changed_code_files: str = 'code_file_inventory_batch_update_changed_code_files'
    batch_insert_missing_code_files: str = 'code_file_inventory_batch_insert_missing_code_files'
    batch_rehome_existing_code_files: str = 'code_file_inventory_batch_rehome_existing_code_files'
    delete_stale_code_files: str = 'code_file_inventory_delete_stale_code_files'
    delete_orphaned_code_repositories: str = 'code_file_inventory_delete_orphaned_code_repositories'


class CodeFileInventoryRepository(Protocol):
    def upsert_repository(self, *, root_path: str, repo_name: str) -> str: ...

    def load_repository_sync_policy(self, repository_id: str) -> RepositorySyncPolicy: ...

    def fetch_existing_file_records(self, repository_id: str) -> dict[str, tuple[str, str | None]]: ...

    def fetch_existing_file_rows_by_path(self) -> dict[str, tuple[str, str]]: ...

    def batch_update_changed_code_files(self, rows: list[tuple[object, ...]]) -> int: ...

    def batch_insert_missing_code_files(self, rows: list[tuple[object, ...]]) -> int: ...

    def batch_rehome_existing_code_files(self, rows: list[tuple[object, ...]]) -> int: ...

    def delete_stale_code_files(self, *, repository_id: str, stale_paths: set[str]) -> int: ...

    def delete_orphaned_code_repositories(self) -> int: ...


def _is_pg_cutover_active() -> bool:
    from persistence.repositories.sql_client import _PG_CUTOVER_ACTIVE
    return _PG_CUTOVER_ACTIVE


def _slugify_path(value: str) -> str:
    lowered = value.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', lowered).strip('-')
    return slug or 'repository'


def _detect_language(path: Path) -> str:
    ext = path.suffix.lower()
    if ext == '.py':
        return 'python'
    if ext in {'.ts', '.tsx'}:
        return 'typescript'
    if ext in {'.js', '.jsx', '.mjs', '.cjs'}:
        return 'javascript'
    if ext == '.cs':
        return 'csharp'
    if ext in {'.html', '.htm'}:
        return 'html'
    return 'unknown'


def _matches_include_patterns(relative_path: str, include_patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(relative_path, pattern) for pattern in include_patterns)


def _normalize_scope_path(value: str) -> str:
    normalized = value.strip().replace('\\', '/').strip()
    normalized = normalized.removeprefix('./').strip('/')
    return normalized


def _normalize_scope_prefixes(values: Iterable[str] | None, defaults: list[str]) -> list[str]:
    normalized: list[str] = []
    for value in values or []:
        raw_value = str(value).strip().replace('\\', '/').strip()
        if raw_value in {REPOSITORY_ROOT_SCOPE, './', '/'}:
            candidate = REPOSITORY_ROOT_SCOPE
        else:
            candidate = _normalize_scope_path(raw_value)
        if candidate and candidate not in normalized:
            normalized.append(candidate)
    return normalized or list(defaults)


def _parse_json_string_list(raw_value: object, *, defaults: list[str]) -> list[str]:
    if raw_value in (None, ''):
        return list(defaults)
    if isinstance(raw_value, str):
        try:
            payload = json.loads(raw_value)
        except json.JSONDecodeError:
            return list(defaults)
    elif isinstance(raw_value, (list, tuple)):
        payload = list(raw_value)
    else:
        return list(defaults)
    if not isinstance(payload, list):
        return list(defaults)
    return _normalize_scope_prefixes((str(item) for item in payload if isinstance(item, str)), defaults)


def _path_is_within_scope(relative_path: str, include_roots: list[str]) -> bool:
    normalized = _normalize_scope_path(relative_path)
    for include_root in include_roots:
        if include_root == REPOSITORY_ROOT_SCOPE:
            return True
        if normalized == include_root or normalized.startswith(include_root + '/'):
            return True
    return False


def _matches_exclude_patterns(relative_path: str, exclude_patterns: list[str] | None) -> bool:
    if not exclude_patterns:
        return False
    normalized = _normalize_scope_path(relative_path)
    return any(Path(normalized).match(pattern) or fnmatch.fnmatch(normalized, pattern) for pattern in exclude_patterns)


def _iter_candidate_source_files(root: Path, include_patterns: list[str], exclude_patterns: list[str] | None) -> list[Path]:
    paths: list[Path] = []
    for path in root.rglob('*'):
        if path.is_dir():
            continue
        try:
            relative = path.relative_to(root).as_posix()
        except ValueError:
            continue
        path_parts = set(path.parts)
        if DEFAULT_EXCLUDED_DIR_NAMES.intersection(path_parts):
            continue
        if any(pattern.match(path.name) for pattern in DEFAULT_EXCLUDED_FILE_PATTERNS):
            continue
        if _matches_exclude_patterns(relative, exclude_patterns):
            continue
        if not _matches_include_patterns(relative, include_patterns):
            continue
        paths.append(path)
    return sorted(paths)


def _normalize_runtime_row(row: Any) -> dict[str, Any]:
    if isinstance(row, dict):
        return dict(row)
    if hasattr(row, '_asdict'):
        return dict(row._asdict())
    return {'value': row}


def _normalize_runtime_rows(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if isinstance(value, dict):
        if isinstance(value.get('rows'), list):
            return [_normalize_runtime_row(item) for item in value['rows']]
        return [_normalize_runtime_row(value)]
    if isinstance(value, list):
        return [_normalize_runtime_row(item) for item in value]
    return []


def _normalize_affected_count(value: Any, *, default: int = 0) -> int:
    if value is None:
        return default
    if isinstance(value, int):
        return value
    if isinstance(value, list):
        return len(value)
    if isinstance(value, dict):
        for key in ('affected_rows', 'inserted_rows', 'updated_rows', 'deleted_rows', 'count', 'row_count'):
            if value.get(key) is not None:
                try:
                    return int(value[key])
                except Exception:
                    continue
        if isinstance(value.get('rows'), list):
            return len(value['rows'])
    try:
        return int(value)
    except Exception:
        return default


def _extract_identifier(value: Any, *keys: str) -> str | None:
    rows = _normalize_runtime_rows(value)
    if rows:
        for key in keys:
            candidate = rows[0].get(key)
            if candidate not in (None, ''):
                return str(candidate)
    if isinstance(value, dict):
        for key in keys:
            candidate = value.get(key)
            if candidate not in (None, ''):
                return str(candidate)
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


@dataclass(slots=True)
class ContractBackedCodeFileInventoryStore:
    contracts: CodeFileInventoryContracts = field(default_factory=CodeFileInventoryContracts)

    def upsert_repository(self, *, root_path: str, repo_name: str) -> str:
        payload = {
            'root_path': root_path,
            'repo_name': repo_name,
            'repo_key': _slugify_path(root_path),
            'metadata': {'source': 'sync-missing-code-files'},
            'sync_include_roots': list(DEFAULT_SYNC_INCLUDE_ROOTS),
            'sync_exclude_patterns': list(DEFAULT_SYNC_EXCLUDE_PATTERNS),
        }
        result = execute_runtime_mutation(self.contracts.upsert_repository, payload)
        repository_id = _extract_identifier(result, 'code_repository_id', 'repository_id', 'id')
        if repository_id is None:
            raise RuntimeError('Repository upsert did not return a repository identifier.')
        return repository_id

    def load_repository_sync_policy(self, repository_id: str) -> RepositorySyncPolicy:
        result = execute_runtime_query(
            self.contracts.load_repository_sync_policy,
            {'code_repository_id': repository_id},
        )
        row = _normalize_runtime_rows(result)
        payload = row[0] if row else {}
        return RepositorySyncPolicy(
            include_roots=_parse_json_string_list(
                payload.get('sync_include_roots_json') or payload.get('include_roots'),
                defaults=DEFAULT_SYNC_INCLUDE_ROOTS,
            ),
            exclude_patterns=_parse_json_string_list(
                payload.get('sync_exclude_patterns_json') or payload.get('exclude_patterns'),
                defaults=DEFAULT_SYNC_EXCLUDE_PATTERNS,
            ),
        )

    def fetch_existing_file_records(self, repository_id: str) -> dict[str, tuple[str, str | None]]:
        result = execute_runtime_query(
            self.contracts.fetch_existing_file_records,
            {'code_repository_id': repository_id},
        )
        rows = _normalize_runtime_rows(result)
        return {
            str(row['file_path']): (
                str(row['code_file_id']),
                str(row['sha256']) if row.get('sha256') is not None else None,
            )
            for row in rows
            if row.get('file_path') is not None and row.get('code_file_id') is not None
        }

    def fetch_existing_file_rows_by_path(self) -> dict[str, tuple[str, str]]:
        result = execute_runtime_query(self.contracts.fetch_existing_file_rows_by_path, {})
        rows = _normalize_runtime_rows(result)
        return {
            str(row['file_path']): (
                str(row['code_file_id']),
                str(row['code_repository_id']),
            )
            for row in rows
            if row.get('file_path') is not None and row.get('code_file_id') is not None and row.get('code_repository_id') is not None
        }

    def batch_update_changed_code_files(self, rows: list[tuple[object, ...]]) -> int:
        if not rows:
            return 0
        payload = [
            {
                'line_count': row[0],
                'sha256': row[1],
                'content_text': row[2],
                'metadata_json': row[3],
                'code_file_id': row[4],
            }
            for row in rows
        ]
        result = execute_runtime_mutation(self.contracts.batch_update_changed_code_files, {'rows': payload})
        return _normalize_affected_count(result, default=len(rows))

    def batch_insert_missing_code_files(self, rows: list[tuple[object, ...]]) -> int:
        if not rows:
            return 0
        payload = [
            {
                'code_file_id': row[0],
                'code_repository_id': row[1],
                'code_project_id': row[2],
                'file_path': row[3],
                'relative_path': row[4],
                'language': row[5],
                'extension': row[6],
                'line_count': row[7],
                'sha256': row[8],
                'content_text': row[9],
                'symbol_count': row[10],
                'metadata_json': row[11],
            }
            for row in rows
        ]
        result = execute_runtime_mutation(self.contracts.batch_insert_missing_code_files, {'rows': payload})
        return _normalize_affected_count(result, default=len(rows))

    def batch_rehome_existing_code_files(self, rows: list[tuple[object, ...]]) -> int:
        if not rows:
            return 0
        payload = [
            {
                'code_repository_id': row[0],
                'code_project_id': row[1],
                'relative_path': row[2],
                'language': row[3],
                'extension': row[4],
                'line_count': row[5],
                'sha256': row[6],
                'content_text': row[7],
                'metadata_json': row[8],
                'code_file_id': row[9],
            }
            for row in rows
        ]
        result = execute_runtime_mutation(self.contracts.batch_rehome_existing_code_files, {'rows': payload})
        return _normalize_affected_count(result, default=len(rows))

    def delete_stale_code_files(self, *, repository_id: str, stale_paths: set[str]) -> int:
        if not stale_paths:
            return 0
        result = execute_runtime_mutation(
            self.contracts.delete_stale_code_files,
            {
                'code_repository_id': repository_id,
                'stale_paths': sorted(stale_paths),
            },
        )
        return _normalize_affected_count(result, default=len(stale_paths))

    def delete_orphaned_code_repositories(self) -> int:
        result = execute_runtime_mutation(self.contracts.delete_orphaned_code_repositories, {})
        return _normalize_affected_count(result, default=0)


_CONTRACT_BACKED_CODE_FILE_INVENTORY = ContractBackedCodeFileInventoryStore()


def _upsert_repository(cursor: Any, root_path: str, repo_name: str) -> str:
    del cursor
    return _CONTRACT_BACKED_CODE_FILE_INVENTORY.upsert_repository(root_path=root_path, repo_name=repo_name)


def _load_repository_sync_policy(cursor: Any, repository_id: str) -> RepositorySyncPolicy:
    del cursor
    return _CONTRACT_BACKED_CODE_FILE_INVENTORY.load_repository_sync_policy(repository_id)


def _fetch_existing_file_records(cursor: Any, repository_id: str) -> dict[str, tuple[str, str | None]]:
    del cursor
    return _CONTRACT_BACKED_CODE_FILE_INVENTORY.fetch_existing_file_records(repository_id)


def _fetch_existing_file_rows_by_path(cursor: Any) -> dict[str, tuple[str, str]]:
    del cursor
    return _CONTRACT_BACKED_CODE_FILE_INVENTORY.fetch_existing_file_rows_by_path()


def _resolve_repository_root(roots: list[Path]) -> Path:
    if not roots:
        raise ValueError('At least one root path is required.')
    return Path(os.path.commonpath([root.as_posix() for root in roots]))


def _resolve_repository_scan_scope(roots: list[Path], include_roots: list[str] | None = None) -> tuple[Path, list[Path]]:
    repository_root = _resolve_repository_root(roots)
    allowed_root_names = set(_normalize_scope_prefixes(include_roots or DEFAULT_SYNC_INCLUDE_ROOTS, DEFAULT_SYNC_INCLUDE_ROOTS))
    for root in roots:
        relative_parts = root.relative_to(repository_root).parts
        if not relative_parts:
            continue
        if relative_parts[0] not in allowed_root_names:
            raise ValueError(
                'sync_missing_code_files only supports one repository root or repository-scoped include roots '
                f"({', '.join(sorted(allowed_root_names))}) per invocation. Run unrelated repositories separately."
            )
    return repository_root, roots


def _canonical_file_path(repository_root: Path, path: Path) -> str:
    return './' + path.relative_to(repository_root).as_posix()


def _collect_candidate_source_files(
    repository_root: Path,
    scan_roots: list[Path],
    include_patterns: list[str],
    exclude_patterns: list[str] | None,
    allowed_roots: list[str],
) -> dict[str, Path]:
    candidates: dict[str, Path] = {}
    for root in scan_roots:
        for path in _iter_candidate_source_files(root, include_patterns, exclude_patterns):
            canonical_path = _canonical_file_path(repository_root, path)
            repo_relative = canonical_path.removeprefix('./')
            if not _path_is_within_scope(repo_relative, allowed_roots):
                continue
            if _matches_exclude_patterns(repo_relative, exclude_patterns):
                continue
            candidates.setdefault(canonical_path, path)
    return dict(sorted(candidates.items()))


def _batch_update_changed_code_files(cursor: Any, rows: list[tuple[object, ...]]) -> int:
    del cursor
    return _CONTRACT_BACKED_CODE_FILE_INVENTORY.batch_update_changed_code_files(rows)


def _batch_insert_missing_code_files(cursor: Any, rows: list[tuple[object, ...]]) -> int:
    del cursor
    return _CONTRACT_BACKED_CODE_FILE_INVENTORY.batch_insert_missing_code_files(rows)


def _batch_rehome_existing_code_files(cursor: Any, rows: list[tuple[object, ...]]) -> int:
    del cursor
    return _CONTRACT_BACKED_CODE_FILE_INVENTORY.batch_rehome_existing_code_files(rows)


def _delete_stale_code_files(cursor: Any, repository_id: str, stale_paths: set[str]) -> int:
    del cursor
    return _CONTRACT_BACKED_CODE_FILE_INVENTORY.delete_stale_code_files(repository_id=repository_id, stale_paths=stale_paths)


def _delete_orphaned_code_repositories(cursor: Any) -> int:
    del cursor
    return _CONTRACT_BACKED_CODE_FILE_INVENTORY.delete_orphaned_code_repositories()


def _build_insert_row(repository_id: str, repository_root: Path, path: Path) -> tuple[object, ...]:
    content = path.read_text(encoding='utf-8', errors='replace')
    canonical_path = _canonical_file_path(repository_root, path)
    metadata = {'root_path': repository_root.name, 'relative_path': canonical_path}
    return (
        str(uuid.uuid4()),
        repository_id,
        None,
        canonical_path,
        canonical_path,
        _detect_language(path),
        path.suffix.lower(),
        len(content.splitlines()),
        hashlib.sha256(content.encode('utf-8', errors='replace')).hexdigest(),
        content,
        0,
        metadata,
    )


def sync_missing_code_files(
    *,
    root_paths: Iterable[str],
    include_patterns: list[str] | None = None,
    exclude_patterns: list[str] | None = None,
    delete_stale: bool | None = None,
    settings: PgConnectionSettings | None = None,
) -> SyncStats:
    resolved_settings = settings
    if resolved_settings is not None and not _is_pg_cutover_active():
        resolved_settings.ensure_runtime_compatibility()

    roots = [Path(path).resolve() for path in root_paths if str(path).strip()]
    include = include_patterns or list(DEFAULT_INCLUDE_PATTERNS)
    scoped_filters_active = bool(include_patterns or exclude_patterns)
    delete_stale_records = (not scoped_filters_active) if delete_stale is None else delete_stale

    scanned_files = 0
    existing_files = 0
    missing_files = 0
    inserted_files = 0
    updated_files = 0
    stale_files = 0
    deleted_files = 0

    connection_factory = (
        (lambda resolved=resolved_settings: open_sql_connection(resolved))
        if resolved_settings is not None
        else open_sql_connection
    )
    with connection_factory() as connection:
        connection.autocommit = False
        cursor = connection.cursor()
        with metadata_sync_lock(cursor):
            for root in roots:
                if not root.exists() or not root.is_dir():
                    raise ValueError(f'Root path does not exist or is not a directory: {root.as_posix()}')

            existing_by_path = _fetch_existing_file_rows_by_path(cursor)
            repository_root, repository_scan_roots = _resolve_repository_scan_scope(roots)
            repository_id = _upsert_repository(cursor, repository_root.resolve().as_posix(), repository_root.name)
            policy = _load_repository_sync_policy(cursor, repository_id)
            effective_excludes = list(dict.fromkeys((exclude_patterns or []) + policy.exclude_patterns))
            existing_records = _fetch_existing_file_records(cursor, repository_id)
            existing = set(existing_records.keys())
            existing_files += len(existing)

            candidate_map = _collect_candidate_source_files(
                repository_root,
                repository_scan_roots,
                include,
                effective_excludes,
                policy.include_roots,
            )
            scanned_files += len(candidate_map)
            candidate_paths = set(candidate_map.keys())

            insert_rows: list[tuple[object, ...]] = []
            rehome_rows: list[tuple[object, ...]] = []
            update_rows: list[tuple[object, ...]] = []
            for canonical_path, file_path in candidate_map.items():
                content = file_path.read_text(encoding='utf-8', errors='replace')
                current_sha256 = hashlib.sha256(content.encode('utf-8', errors='replace')).hexdigest()
                metadata = {'root_path': repository_root.name, 'relative_path': canonical_path}
                if canonical_path in existing:
                    file_id, stored_sha256 = existing_records[canonical_path]
                    if stored_sha256 != current_sha256:
                        update_rows.append((
                            len(content.splitlines()),
                            current_sha256,
                            content,
                            metadata,
                            file_id,
                        ))
                    continue
                existing_row = existing_by_path.get(canonical_path)
                if existing_row is not None:
                    existing_file_id, existing_repository_id = existing_row
                    if existing_repository_id != repository_id:
                        rehome_rows.append(
                            (
                                repository_id,
                                None,
                                canonical_path,
                                _detect_language(file_path),
                                file_path.suffix.lower(),
                                len(content.splitlines()),
                                current_sha256,
                                content,
                                metadata,
                                existing_file_id,
                            )
                        )
                    continue
                insert_rows.append(_build_insert_row(repository_id, repository_root, file_path))

            missing_files += len(insert_rows) + len(rehome_rows)
            inserted_files += _batch_rehome_existing_code_files(cursor, rehome_rows)
            inserted_files += _batch_insert_missing_code_files(cursor, insert_rows)
            updated_files += _batch_update_changed_code_files(cursor, update_rows)

            stale_paths = existing - candidate_paths
            if stale_paths and all('/' in p and (p[1:3] == ':/' or p.startswith('/')) for p in stale_paths) and not any('/' in p and (p[1:3] == ':/' or p.startswith('/')) for p in candidate_paths):
                print(
                    f'WARNING: repo {repository_id} has {len(stale_paths)} absolute-path '
                    f'entries in code_files but the current scan produces relative paths. '
                    f'Run migration 127 to normalise paths before stale deletion is safe. '
                    f'Skipping stale deletion for this repo.',
                    flush=True,
                )
            else:
                stale_files += len(stale_paths)
                if delete_stale_records:
                    deleted_files += _delete_stale_code_files(cursor, repository_id, stale_paths)

            _delete_orphaned_code_repositories(cursor)

            connection.commit()

    return SyncStats(
        roots=len(roots),
        scanned_files=scanned_files,
        existing_files=existing_files,
        missing_files=missing_files,
        inserted_files=inserted_files,
        updated_files=updated_files,
        stale_files=stale_files,
        deleted_files=deleted_files,
    )


__all__ = [
    'DEFAULT_EXCLUDED_DIR_NAMES',
    'DEFAULT_EXCLUDED_FILE_PATTERNS',
    'DEFAULT_INCLUDE_PATTERNS',
    'DEFAULT_SYNC_EXCLUDE_PATTERNS',
    'DEFAULT_SYNC_INCLUDE_ROOTS',
    'REPOSITORY_ROOT_SCOPE',
    'RepositorySyncPolicy',
    'SyncStats',
    '_batch_insert_missing_code_files',
    '_batch_rehome_existing_code_files',
    '_batch_update_changed_code_files',
    '_build_insert_row',
    '_canonical_file_path',
    '_collect_candidate_source_files',
    '_delete_orphaned_code_repositories',
    '_delete_stale_code_files',
    '_detect_language',
    '_fetch_existing_file_records',
    '_fetch_existing_file_rows_by_path',
    '_is_pg_cutover_active',
    '_iter_candidate_source_files',
    '_load_repository_sync_policy',
    '_matches_exclude_patterns',
    '_matches_include_patterns',
    '_normalize_scope_path',
    '_normalize_scope_prefixes',
    '_parse_json_string_list',
    '_path_is_within_scope',
    '_resolve_repository_root',
    '_resolve_repository_scan_scope',
    '_slugify_path',
    '_upsert_repository',
    'sync_missing_code_files',
]
