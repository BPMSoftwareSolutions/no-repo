from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from orchestration.data_access_runtime.executor import execute_runtime_query
from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation


@dataclass(frozen=True, slots=True)
class CodebaseShapeRowContracts:
    delete_inventory_graph: str = 'codebase_shape_delete_inventory_graph'
    fetch_file_ids_for_repository: str = 'codebase_shape_fetch_file_ids_for_repository'
    insert_file_if_missing: str = 'codebase_shape_insert_file_if_missing'
    upsert_project: str = 'codebase_shape_upsert_project'
    upsert_file: str = 'codebase_shape_upsert_file'
    upsert_symbol: str = 'codebase_shape_upsert_symbol'
    upsert_relationship: str = 'codebase_shape_upsert_relationship'
    upsert_repository: str = 'codebase_shape_upsert_repository'


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


class CodebaseShapeRowPersistenceMixin:
    contracts = CodebaseShapeRowContracts()

    def _delete_inventory_graph(self, cursor: Any, repository_id: str) -> None:
        execute_runtime_mutation(self.contracts.delete_inventory_graph, {'repository_id': repository_id})

    def _fetch_file_ids_for_repository(self, cursor: Any, repository_id: str) -> dict[str, str]:
        rows = _rows(execute_runtime_query(self.contracts.fetch_file_ids_for_repository, {'repository_id': repository_id}))
        return {self._normalize_path_key(str(row['file_path'])): str(row['code_file_id']) for row in rows}

    def _insert_file_if_missing(self, cursor: Any, repository_id: str, project_id: str | None, code_file: Any) -> str:
        file_id = str(uuid.uuid4())
        result = execute_runtime_mutation(
            self.contracts.insert_file_if_missing,
            {
                'code_file_id': file_id,
                'repository_id': repository_id,
                'project_id': project_id,
                'file_path': code_file.file_path,
                'relative_path': code_file.relative_path,
                'language': code_file.language,
                'extension': code_file.extension,
                'line_count': code_file.line_count,
                'sha256': code_file.sha256,
                'symbol_count': code_file.symbol_count,
                'metadata_json': self._json(code_file.metadata),
            },
        )
        rows = _rows(result)
        if rows:
            return str(rows[0].get('code_file_id') or file_id)
        return file_id

    def _upsert_project(self, cursor: Any, repository_id: str, project: Any) -> str:
        project_id = str(uuid.uuid4())
        result = execute_runtime_mutation(
            self.contracts.upsert_project,
            {
                'code_project_id': project_id,
                'repository_id': repository_id,
                'project_path': project.project_path,
                'relative_path': project.relative_path,
                'name': project.name,
                'project_type': project.project_type,
                'language': project.language,
                'metadata_json': self._json(project.metadata),
            },
        )
        rows = _rows(result)
        if rows:
            return str(rows[0].get('code_project_id') or project_id)
        return project_id

    def _upsert_file(self, cursor: Any, repository_id: str, project_id: str | None, code_file: Any) -> str:
        file_id = str(uuid.uuid4())
        result = execute_runtime_mutation(
            self.contracts.upsert_file,
            {
                'code_file_id': file_id,
                'repository_id': repository_id,
                'project_id': project_id,
                'file_path': code_file.file_path,
                'relative_path': code_file.relative_path,
                'language': code_file.language,
                'extension': code_file.extension,
                'line_count': code_file.line_count,
                'sha256': code_file.sha256,
                'content_text': code_file.content_text,
                'symbol_count': code_file.symbol_count,
                'metadata_json': self._json(code_file.metadata),
            },
        )
        rows = _rows(result)
        if rows:
            return str(rows[0].get('code_file_id') or file_id)
        return file_id

    def _upsert_symbol(
        self,
        cursor: Any,
        *,
        file_id: str,
        symbol_id: str,
        symbol_name: str,
        qualified_name: str,
        symbol_kind: str,
        line_number: int,
        end_line_number: int | None,
        container_name: str | None,
        metadata_json: str | None,
        symbol_hash: str | None,
        signature: str | None,
        visibility: str | None,
        layer_code: str | None,
        domain_code: str | None,
        parent_symbol_id: str | None,
        is_entry_point: bool,
        is_exported: bool,
        is_abstract: bool,
        enrichment_status: str,
    ) -> str:
        layer_code = self._normalize_classifier_code(layer_code)
        domain_code = self._normalize_classifier_code(domain_code)
        result = execute_runtime_mutation(
            self.contracts.upsert_symbol,
            {
                'symbol_id': symbol_id,
                'file_id': file_id,
                'symbol_name': symbol_name,
                'qualified_name': qualified_name,
                'symbol_kind': symbol_kind,
                'line_number': line_number,
                'end_line_number': end_line_number,
                'container_name': container_name,
                'metadata_json': metadata_json,
                'symbol_hash': symbol_hash,
                'signature': signature,
                'visibility': visibility,
                'layer_code': layer_code,
                'domain_code': domain_code,
                'parent_symbol_id': parent_symbol_id,
                'is_entry_point': is_entry_point,
                'is_exported': is_exported,
                'is_abstract': is_abstract,
                'enrichment_status': enrichment_status,
            },
        )
        rows = _rows(result)
        if rows:
            return str(rows[0].get('code_symbol_id') or symbol_id)
        return symbol_id

    def _upsert_relationship(
        self,
        cursor: Any,
        *,
        repository_id: str,
        source_file_id: str | None,
        source_symbol_id: str | None,
        target_file_id: str | None,
        target_symbol_id: str | None,
        target_ref: str | None,
        relationship_type: str,
        metadata_json: str | None,
    ) -> None:
        execute_runtime_mutation(
            self.contracts.upsert_relationship,
            {
                'relationship_id': str(uuid.uuid4()),
                'repository_id': repository_id,
                'source_file_id': source_file_id,
                'source_symbol_id': source_symbol_id,
                'target_file_id': target_file_id,
                'target_symbol_id': target_symbol_id,
                'target_ref': target_ref,
                'relationship_type': relationship_type,
                'metadata_json': metadata_json,
            },
        )

    def _upsert_repository(self, cursor: Any, repository: Any) -> str:
        result = execute_runtime_mutation(
            self.contracts.upsert_repository,
            {
                'repository_id': str(uuid.uuid4()),
                'repo_key': repository.repo_key,
                'root_path': repository.repository_root,
                'name': repository.name,
                'primary_language': repository.primary_language,
                'metadata_json': self._json(repository.metadata),
            },
        )
        rows = _rows(result)
        if rows:
            return str(rows[0].get('code_repository_id') or rows[0].get('repository_id') or uuid.uuid4())
        return str(uuid.uuid4())
