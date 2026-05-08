from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any

from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation


@dataclass(frozen=True, slots=True)
class CodebaseShapeJournalContracts:
    run_record: str = 'codebase_shape_run_record'
    workflow_run_file_link_record: str = 'codebase_shape_workflow_run_file_link_record'
    action_observation_record: str = 'codebase_shape_action_observation_record'
    object_flow_observation_record: str = 'codebase_shape_object_flow_observation_record'
    finding_record: str = 'codebase_shape_finding_record'


class CodebaseShapeRunJournalMixin:
    contracts: CodebaseShapeJournalContracts = field(default_factory=CodebaseShapeJournalContracts)  # type: ignore[assignment]

    def _persist_run_observations(
        self,
        cursor: Any,
        *,
        report: Any,
        repository_id_by_root: dict[str, str],
        file_id_by_path: dict[str, str],
        symbol_id_by_key: dict[tuple[str, str], str],
    ) -> None:
        findings_by_root: dict[str, list[Any]] = {}
        for finding in report.findings:
            findings_by_root.setdefault(finding.repository_root, []).append(finding)

        action_observations_by_root: dict[str, list[Any]] = {}
        for observation in report.action_observations:
            action_observations_by_root.setdefault(observation.repository_root, []).append(observation)

        object_flow_observations_by_root: dict[str, list[Any]] = {}
        for observation in report.object_flow_observations:
            object_flow_observations_by_root.setdefault(observation.repository_root, []).append(observation)

        started_at = self._coerce_datetime(report.scanned_at)
        self._log('phase=runs-and-observations begin')
        for repository in report.repositories:
            repository_id = repository_id_by_root[self._normalize_path_key(repository.repository_root)]
            run_id = str(uuid.uuid4())
            execute_runtime_mutation(
                self.contracts.run_record,
                {
                    'codebase_shape_run_id': run_id,
                    'code_repository_id': repository_id,
                    'run_key': repository.scan_run_key,
                    'workflow_run_id': report.workflow_run_id,
                    'trigger_source': report.trigger_source,
                    'requested_by': report.requested_by,
                    'status': 'completed',
                    'summary_json': self._json(repository.metadata),
                    'started_at': started_at,
                    'completed_at': started_at,
                },
            )

            if report.workflow_run_id:
                linked_file_rows = cursor.execute(
                    """
                    SELECT code_file_id
                    FROM inventory.code_files
                    WHERE code_repository_id = ?
                    """,
                    repository_id,
                ).fetchall() if hasattr(cursor, 'fetchall') else []
                link_metadata = self._json(
                    {
                        'source': 'codebase-shape-store',
                        'scan_run_key': repository.scan_run_key,
                    }
                )
                for row in linked_file_rows:
                    code_file_id = getattr(row, 'code_file_id', row[0])
                    execute_runtime_mutation(
                        self.contracts.workflow_run_file_link_record,
                        {
                            'workflow_run_code_file_id': str(uuid.uuid4()),
                            'workflow_run_id': report.workflow_run_id,
                            'code_repository_id': repository_id,
                            'code_file_id': str(code_file_id),
                            'relation_source': 'codebase-shape',
                            'metadata_json': link_metadata,
                        },
                    )

            for observation in action_observations_by_root.get(repository.repository_root, []):
                normalized_file_path = self._normalize_path_key(observation.file_path)
                execute_runtime_mutation(
                    self.contracts.action_observation_record,
                    {
                        'codebase_shape_action_observation_id': str(uuid.uuid4()),
                        'codebase_shape_run_id': run_id,
                        'code_repository_id': repository_id,
                        'code_file_id': file_id_by_path.get(normalized_file_path),
                        'code_symbol_id': symbol_id_by_key.get((normalized_file_path, str(observation.symbol_qualified_name or ''))),
                        'project_path': observation.project_path,
                        'file_path': observation.file_path,
                        'symbol_qualified_name': observation.symbol_qualified_name,
                        'symbol_kind': observation.symbol_kind,
                        'language': observation.language,
                        'action_kind': observation.action_kind,
                        'action_subject': observation.action_subject,
                        'object_kind': observation.object_kind,
                        'source_kind': observation.source_kind,
                        'representation_in': observation.representation_in,
                        'representation_out': observation.representation_out,
                        'boundary_kind': observation.boundary_kind,
                        'sink_kind': observation.sink_kind,
                        'action_scope': observation.action_scope,
                        'composition_role': observation.composition_role,
                        'side_effect_profile': observation.side_effect_profile,
                        'confidence': observation.confidence,
                        'evidence_json': self._json(observation.evidence),
                    },
                )

            for observation in object_flow_observations_by_root.get(repository.repository_root, []):
                normalized_file_path = self._normalize_path_key(observation.file_path)
                execute_runtime_mutation(
                    self.contracts.object_flow_observation_record,
                    {
                        'codebase_object_flow_observation_id': str(uuid.uuid4()),
                        'codebase_shape_run_id': run_id,
                        'code_repository_id': repository_id,
                        'code_file_id': file_id_by_path.get(normalized_file_path),
                        'code_symbol_id': symbol_id_by_key.get((normalized_file_path, str(observation.symbol_qualified_name or ''))),
                        'project_path': observation.project_path,
                        'file_path': observation.file_path,
                        'symbol_qualified_name': observation.symbol_qualified_name,
                        'symbol_kind': observation.symbol_kind,
                        'language': observation.language,
                        'action_profile_json': self._json(observation.action_profile),
                        'object_kind': observation.object_kind,
                        'source_kind': observation.source_kind,
                        'representation_in': observation.representation_in,
                        'representation_out': observation.representation_out,
                        'boundary_kind': observation.boundary_kind,
                        'sink_kind': observation.sink_kind,
                        'confidence': observation.confidence,
                        'evidence_json': self._json(observation.evidence),
                    },
                )

            for finding in findings_by_root.get(repository.repository_root, []):
                execute_runtime_mutation(
                    self.contracts.finding_record,
                    {
                        'codebase_shape_finding_id': str(uuid.uuid4()),
                        'codebase_shape_run_id': run_id,
                        'code_repository_id': repository_id,
                        'finding_type': finding.finding_type,
                        'severity': finding.severity,
                        'title': finding.title,
                        'summary': finding.summary,
                        'project_path': finding.project_path,
                        'file_path': finding.file_path,
                        'symbol_qualified_name': finding.symbol_qualified_name,
                        'evidence_json': self._json(finding.evidence),
                        'status': finding.status,
                    },
                )
        self._log('phase=runs-and-observations complete')
