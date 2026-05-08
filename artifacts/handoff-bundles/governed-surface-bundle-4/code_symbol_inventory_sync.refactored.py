from __future__ import annotations

import hashlib
import json
import re
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from orchestration.data_access_runtime.executor import execute_runtime_query
from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation
from persistence.sql.codebase_shape.csharp_symbol_extractor import extract_csharp_symbols
from persistence.sql.codebase_shape.ecmascript_symbol_extractor import extract_typescript_javascript_symbols
from persistence.sql.codebase_shape.html_symbol_extractor import extract_html_symbols
from persistence.sql.codebase_shape.python_symbol_extractor import extract_python_symbols


def extract_symbols(relative_path: str, content: str) -> list[dict]:
    ext = Path(relative_path).suffix.lower()
    if ext == '.py':
        return extract_python_symbols(relative_path, content)
    if ext in {'.ts', '.tsx'}:
        return extract_typescript_javascript_symbols(relative_path, content, extractor='typescript-regex')
    if ext in {'.js', '.jsx', '.mjs', '.cjs'}:
        return extract_typescript_javascript_symbols(relative_path, content, extractor='javascript-regex')
    if ext == '.cs':
        return extract_csharp_symbols(relative_path, content)
    if ext in {'.html', '.htm'}:
        return extract_html_symbols(relative_path, content)
    return []


@dataclass(slots=True)
class SymbolSyncStats:
    repos: int
    files_checked: int
    files_skipped: int
    files_updated: int
    symbols_inserted: int
    symbols_deleted: int


@dataclass(frozen=True, slots=True)
class CodeSymbolInventoryContracts:
    fetch_repositories: str = 'code_symbol_inventory_fetch_repositories'
    fetch_files_for_repository: str = 'code_symbol_inventory_fetch_files_for_repository'
    fetch_symbol_ids_for_file: str = 'code_symbol_inventory_fetch_symbol_ids_for_file'
    delete_file_symbols: str = 'code_symbol_inventory_delete_file_symbols'
    insert_symbols_batch: str = 'code_symbol_inventory_insert_symbols_batch'
    update_file_metadata: str = 'code_symbol_inventory_update_file_metadata'


def _rows(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if isinstance(value, list):
        return [row if isinstance(row, dict) else {'value': row} for row in value]
    if isinstance(value, dict):
        rows = value.get('rows')
        if isinstance(rows, list):
            return [row if isinstance(row, dict) else {'value': row} for row in rows]
        return [value]
    return [{'value': value}]


def _json(value: Any) -> str:
    return json.dumps(value, default=str)


def _normalize_path(value: str) -> str:
    return value.removeprefix('./')


@dataclass(slots=True)
class CodeSymbolInventorySync:
    contracts: CodeSymbolInventoryContracts = CodeSymbolInventoryContracts()

    def sync_code_symbols(self, *, settings: Any | None = None) -> SymbolSyncStats:
        repos = _rows(execute_runtime_query(self.contracts.fetch_repositories, {}))
        stats = SymbolSyncStats(
            repos=len(repos),
            files_checked=0,
            files_skipped=0,
            files_updated=0,
            symbols_inserted=0,
            symbols_deleted=0,
        )

        for repo_row in repos:
            repository_id = str(repo_row['code_repository_id'])
            root_path = Path(str(repo_row['root_path']))
            files = _rows(
                execute_runtime_query(
                    self.contracts.fetch_files_for_repository,
                    {'code_repository_id': repository_id},
                )
            )
            for file_row in files:
                stats.files_checked += 1
                file_id = str(file_row['code_file_id'])
                relative_path = str(file_row['relative_path'])
                stored_sha256 = str(file_row.get('sha256') or '')
                stored_symbol_count = int(file_row.get('symbol_count') or 0)
                disk_path = root_path / _normalize_path(relative_path)
                if not disk_path.is_file():
                    continue

                content = disk_path.read_text(encoding='utf-8', errors='replace')
                current_sha256 = hashlib.sha256(content.encode('utf-8', errors='replace')).hexdigest()
                if current_sha256 == stored_sha256 and stored_symbol_count > 0 and not bool(file_row.get('needs_semantic_backfill')):
                    stats.files_skipped += 1
                    continue

                existing_symbol_ids = [str(row['code_symbol_id']) for row in _rows(
                    execute_runtime_query(
                        self.contracts.fetch_symbol_ids_for_file,
                        {'code_file_id': file_id},
                    )
                )]
                if existing_symbol_ids:
                    deleted_rows = _rows(
                        execute_runtime_mutation(
                            self.contracts.delete_file_symbols,
                            {'symbol_ids': existing_symbol_ids},
                        )
                    )
                    stats.symbols_deleted += len(deleted_rows) if deleted_rows else len(existing_symbol_ids)

                symbols = extract_symbols(relative_path, content)
                symbol_rows = self._build_symbol_rows(file_id, symbols)
                inserted_rows = _rows(
                    execute_runtime_mutation(
                        self.contracts.insert_symbols_batch,
                        {'rows': _json(symbol_rows)},
                    )
                )
                stats.symbols_inserted += len(inserted_rows) if inserted_rows else len(symbol_rows)

                execute_runtime_mutation(
                    self.contracts.update_file_metadata,
                    {
                        'file_id': file_id,
                        'sha256': current_sha256,
                        'line_count': len(content.splitlines()),
                        'symbol_count': len(symbol_rows),
                        'content_text': content,
                    },
                )
                stats.files_updated += 1

        return stats

    def _build_symbol_rows(self, file_id: str, symbols: list[dict]) -> list[dict[str, Any]]:
        used_names: set[str] = set()
        rows: list[dict[str, Any]] = []
        for symbol in symbols:
            symbol_id = str(uuid.uuid4())
            persisted_symbol_name = self._unique_symbol_name(
                str(symbol.get('symbol_name') or ''),
                symbol.get('container_name'),
                str(symbol.get('qualified_name') or ''),
                used_names,
            )
            rows.append(
                {
                    'code_symbol_id': symbol_id,
                    'code_file_id': file_id,
                    'symbol_name': persisted_symbol_name,
                    'qualified_name': symbol.get('qualified_name'),
                    'symbol_kind': symbol.get('symbol_kind'),
                    'line_number': symbol.get('line_number'),
                    'end_line_number': symbol.get('end_line_number'),
                    'container_name': symbol.get('container_name'),
                    'metadata_json': symbol.get('metadata_json'),
                    'symbol_hash': symbol.get('symbol_hash'),
                    'signature': symbol.get('signature'),
                    'visibility': symbol.get('visibility'),
                    'layer_code': symbol.get('layer_code'),
                    'domain_code': symbol.get('domain_code'),
                    'parent_symbol_id': None,
                    'is_entry_point': bool(symbol.get('is_entry_point')),
                    'is_exported': bool(symbol.get('is_exported')),
                    'is_abstract': bool(symbol.get('is_abstract')),
                    'enrichment_status': symbol.get('enrichment_status', 'pending_enrichment'),
                }
            )
        return rows

    @staticmethod
    def _unique_symbol_name(base: str, container: str | None, qualified: str, used: set[str]) -> str:
        base = (base or '').strip() or (qualified.rsplit('.', 1)[-1] if qualified else 'anonymous_symbol')
        candidates = [base]
        if container:
            suffix = re.sub(r'[^a-z0-9]+', '_', container.lower()).strip('_')
            if suffix:
                candidates.append(f'{base}__{suffix}')
        if qualified and '.' in qualified:
            parent = qualified.rsplit('.', 1)[0].rsplit('.', 1)[-1]
            suffix = re.sub(r'[^a-z0-9]+', '_', parent.lower()).strip('_')
            if suffix:
                candidates.append(f'{base}__{suffix}')
        for candidate in candidates:
            if candidate.casefold() not in used:
                used.add(candidate.casefold())
                return candidate
        seq = 2
        while True:
            candidate = f'{base}__{seq}'
            if candidate.casefold() not in used:
                used.add(candidate.casefold())
                return candidate
            seq += 1


def _unique_symbol_name(base: str, container: str | None, qualified: str, used: set[str]) -> str:
    return CodeSymbolInventorySync._unique_symbol_name(base, container, qualified, used)


def sync_code_symbols(*, settings: Any | None = None) -> SymbolSyncStats:
    return CodeSymbolInventorySync().sync_code_symbols(settings=settings)
