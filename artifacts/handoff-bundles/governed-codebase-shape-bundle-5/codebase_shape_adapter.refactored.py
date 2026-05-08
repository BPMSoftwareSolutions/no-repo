from __future__ import annotations

from dataclasses import dataclass

from orchestration.codebase_shape_models import CodebaseShapeReport
from persistence.sql.code_file_inventory_sync import (
    DEFAULT_SYNC_EXCLUDE_PATTERNS,
    DEFAULT_SYNC_INCLUDE_ROOTS,
    RepositorySyncPolicy,
    _parse_json_string_list,
    sync_missing_code_files,
)
from persistence.sql.codebase_shape.bulk import CodebaseShapeBulkPersistenceMixin
from persistence.sql.codebase_shape.helpers import CodebaseShapeAdapterHelpersMixin
from persistence.sql.codebase_shape.journal import CodebaseShapeRunJournalMixin
from persistence.sql.codebase_shape.rows import CodebaseShapeRowPersistenceMixin


@dataclass(frozen=True, slots=True)
class CodebaseShapeAdapterContracts:
    load_repository_sync_policy: str = 'codebase_shape_load_repository_sync_policy'
    save_report: str = 'codebase_shape_save_report'


class SqlCodebaseShapePersistenceAdapter(
    CodebaseShapeRunJournalMixin,
    CodebaseShapeBulkPersistenceMixin,
    CodebaseShapeRowPersistenceMixin,
    CodebaseShapeAdapterHelpersMixin,
):
    contracts = CodebaseShapeAdapterContracts()

    def load_repository_sync_policy(self, root_path: str) -> RepositorySyncPolicy:
        # Runtime-backed contract fetch. The adapter keeps fallback defaults only when no row is returned.
        from orchestration.data_access_runtime.executor import execute_runtime_query

        row = _first_row(
            execute_runtime_query(
                self.contracts.load_repository_sync_policy,
                {'root_path': root_path},
            )
        )
        if row is None or not row:
            return RepositorySyncPolicy(
                include_roots=list(DEFAULT_SYNC_INCLUDE_ROOTS),
                exclude_patterns=list(DEFAULT_SYNC_EXCLUDE_PATTERNS),
            )
        include_raw = row.get('sync_include_roots_json')
        exclude_raw = row.get('sync_exclude_patterns_json')
        return RepositorySyncPolicy(
            include_roots=_parse_json_string_list(include_raw, defaults=DEFAULT_SYNC_INCLUDE_ROOTS),
            exclude_patterns=_parse_json_string_list(exclude_raw, defaults=DEFAULT_SYNC_EXCLUDE_PATTERNS),
        )

    def save_report(self, report: CodebaseShapeReport, *, replace_existing_roots: bool = False) -> None:
        self._log(
            f"persist-start repositories={len(report.repositories)} projects={len(report.projects)} files={len(report.files)} symbols={len(report.symbols)} relationships={len(report.relationships)}"
        )
        repository_roots = [repository.repository_root for repository in report.repositories]
        if repository_roots:
            self._log('phase=file-staging begin')
            stage_stats = sync_missing_code_files(root_paths=repository_roots)
            self._log(
                f"phase=file-staging complete inserted={stage_stats.inserted_files} deleted={stage_stats.deleted_files}"
            )

        from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation
        execute_runtime_mutation(
            self.contracts.save_report,
            {
                'repositories': len(report.repositories),
                'projects': len(report.projects),
                'files': len(report.files),
                'symbols': len(report.symbols),
                'relationships': len(report.relationships),
                'report_json': self._json(report.to_dict() if hasattr(report, 'to_dict') else {'repositories': len(report.repositories)}),
                'replace_existing_roots': replace_existing_roots,
            },
        )


def _first_row(value):
    if isinstance(value, dict):
        rows = value.get('rows')
        if isinstance(rows, list):
            return rows[0] if rows else {}
        return value
    if isinstance(value, list):
        return value[0] if value else {}
    return {}
