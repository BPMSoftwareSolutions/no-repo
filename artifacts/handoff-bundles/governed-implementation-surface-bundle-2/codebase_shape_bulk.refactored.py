from __future__ import annotations

import json
from typing import Any

from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation


class CodebaseShapeBulkContracts:
    merge_projects: str = 'codebase_shape_bulk_merge_projects'
    merge_files: str = 'codebase_shape_bulk_merge_files'
    merge_symbols: str = 'codebase_shape_bulk_merge_symbols'
    update_symbol_parents: str = 'codebase_shape_bulk_update_symbol_parents'
    merge_relationships: str = 'codebase_shape_bulk_merge_relationships'


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


def _json_rows(rows: list[dict[str, Any]]) -> str:
    return json.dumps(rows, default=str)


class CodebaseShapeBulkPersistenceMixin:
    contracts = CodebaseShapeBulkContracts()

    def _bulk_merge_projects(self, cursor: Any, project_rows: list[dict[str, Any]]) -> dict[tuple[str, str], str]:
        merged = _rows(
            execute_runtime_mutation(
                self.contracts.merge_projects,
                {'rows': _json_rows(project_rows)},
            )
        )
        return {(str(row['code_repository_id']), self._normalize_path_key(str(row['project_path']))): str(row['code_project_id']) for row in merged}

    def _bulk_merge_files(self, cursor: Any, file_rows: list[dict[str, Any]]) -> dict[tuple[str, str], str]:
        merged = _rows(
            execute_runtime_mutation(
                self.contracts.merge_files,
                {'rows': _json_rows(file_rows)},
            )
        )
        return {(str(row['code_repository_id']), str(row['file_path'])): str(row['code_file_id']) for row in merged}

    def _bulk_merge_symbols(self, cursor: Any, symbol_rows: list[dict[str, Any]]) -> dict[tuple[str, str], str]:
        merged = _rows(
            execute_runtime_mutation(
                self.contracts.merge_symbols,
                {'rows': _json_rows(symbol_rows)},
            )
        )
        return {(str(row['code_file_id']), str(row['symbol_name'])): str(row['code_symbol_id']) for row in merged}

    def _bulk_update_symbol_parents(self, cursor: Any, parent_updates: list[tuple[str, str]]) -> None:
        if not parent_updates:
            return
        rows = [{'code_symbol_id': code_symbol_id, 'parent_symbol_id': parent_symbol_id} for code_symbol_id, parent_symbol_id in parent_updates]
        execute_runtime_mutation(self.contracts.update_symbol_parents, {'rows': _json_rows(rows)})

    def _bulk_merge_relationships(self, cursor: Any, relationship_rows: list[dict[str, Any]]) -> None:
        if not relationship_rows:
            return
        execute_runtime_mutation(self.contracts.merge_relationships, {'rows': _json_rows(relationship_rows)})
