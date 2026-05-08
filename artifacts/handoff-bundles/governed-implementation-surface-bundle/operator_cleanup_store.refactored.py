from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from orchestration.data_access_runtime.executor import execute_runtime_query
from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation


ACTIVE_RUN_STATUSES = ('queued', 'running', 'blocked')


@dataclass(frozen=True, slots=True)
class OperatorCleanupStoreContracts:
    project_get: str = 'operator_cleanup_project_get'
    workflow_get: str = 'operator_cleanup_workflow_get'
    workflow_belongs_to_project: str = 'operator_cleanup_workflow_belongs_to_project'
    runs_list: str = 'operator_cleanup_runs_list'
    matching_claims_list: str = 'operator_cleanup_matching_claims_list'
    runs_close: str = 'operator_cleanup_runs_close'
    workflow_supersede: str = 'operator_cleanup_workflow_supersede'
    project_supersede: str = 'operator_cleanup_project_supersede'
    claims_close: str = 'operator_cleanup_claims_close'
    completion_verify: str = 'operator_cleanup_completion_verify'
    completion_verify_by_slug: str = 'operator_cleanup_completion_verify_by_slug'
    completion_verify_by_project_id: str = 'operator_cleanup_completion_verify_by_project_id'
    execution_record_insert: str = 'operator_cleanup_execution_record_insert'


def _normalize_rows(value: Any) -> list[dict[str, Any]]:
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


def _first_row(value: Any) -> dict[str, Any]:
    rows = _normalize_rows(value)
    return rows[0] if rows else {}


def _row_value(row: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in row and row[key] is not None:
            return row[key]
    return None


def _json_loads(value: Any, default: Any) -> Any:
    if value in (None, ''):
        return default
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(str(value))
    except (TypeError, ValueError):
        return default


def _normalize_uuid(value: str, field_name: str) -> str:
    try:
        return str(uuid.UUID(str(value)))
    except (TypeError, ValueError, AttributeError) as exc:
        raise ValueError(f'{field_name} must be a valid UUID.') from exc


class OperatorCleanupStore:
    contracts = OperatorCleanupStoreContracts()

    def execute_cleanup(
        self,
        *,
        project_id: str,
        workflow_id: str,
        workflow_run_ids: list[str],
        reason: str,
        operator_identity: str,
        run_terminal_status: str = 'failed',
    ) -> dict[str, Any]:
        normalized_project_id = _normalize_uuid(project_id, 'project_id')
        normalized_workflow_id = _normalize_uuid(workflow_id, 'workflow_id')
        normalized_run_ids = [_normalize_uuid(item, 'workflow_run_ids') for item in workflow_run_ids]
        if not normalized_run_ids:
            raise ValueError('workflow_run_ids must contain at least one run id.')
        if run_terminal_status not in {'failed', 'superseded'}:
            raise ValueError('run_terminal_status must be failed or superseded.')

        project = self._load_project(normalized_project_id)
        if project is None:
            raise LookupError('Project not found.')
        workflow = self._load_workflow(normalized_workflow_id)
        if workflow is None:
            raise LookupError('Workflow not found.')
        if not self._workflow_belongs_to_project(normalized_project_id, normalized_workflow_id):
            raise ValueError('Workflow does not belong to project.')

        runs = self._load_runs(normalized_workflow_id, normalized_run_ids)
        found_run_ids = {str(row['workflow_run_id']) for row in runs}
        missing_run_ids = sorted(set(normalized_run_ids) - found_run_ids)
        if missing_run_ids:
            raise ValueError(f'Workflow runs do not belong to workflow: {", ".join(missing_run_ids)}')

        claims = self._load_matching_claims(normalized_project_id, normalized_workflow_id, normalized_run_ids)
        before_state = {
            'project': project,
            'workflow': workflow,
            'workflow_runs': runs,
            'claims': claims,
        }

        affected_runs = self._close_runs(normalized_run_ids, run_terminal_status)
        updated_workflow = self._supersede_workflow(normalized_workflow_id)
        updated_project = self._supersede_project(normalized_project_id)
        affected_claims = self._close_claims([str(row['claim_id']) for row in claims])
        completion = self._verify_completion(normalized_project_id, str(project.get('project_slug') or ''))
        after_state = {
            'project': updated_project,
            'workflow': updated_workflow,
            'workflow_runs': affected_runs,
            'claims': affected_claims,
        }

        status = 'succeeded' if int(completion['active_workflow_run_count']) == 0 else 'failed'
        record = self._insert_execution_record(
            project_id=normalized_project_id,
            workflow_id=normalized_workflow_id,
            requested_workflow_run_ids=normalized_run_ids,
            affected_workflow_run_ids=[str(row['workflow_run_id']) for row in affected_runs],
            affected_claim_ids=[str(row['claim_id']) for row in affected_claims],
            before_state=before_state,
            after_state=after_state,
            reason=reason,
            operator_identity=operator_identity,
            completion_status=status,
            active_workflow_run_count=int(completion['active_workflow_run_count']),
            verification=completion,
        )

        return {
            'status': record['completion_status'],
            'cleanup_execution_record_id': record['cleanup_execution_record_id'],
            'project_id': normalized_project_id,
            'workflow_id': normalized_workflow_id,
            'workflow_run_ids': normalized_run_ids,
            'affected_claim_ids': [str(row['claim_id']) for row in affected_claims],
            'completion_condition': {
                'no_active_workflow_runs_for_project_slug': int(completion['active_workflow_run_count']) == 0,
                'active_workflow_run_count': int(completion['active_workflow_run_count']),
                'project_slug': completion.get('project_slug'),
            },
            'before_state': before_state,
            'after_state': after_state,
        }

    def _load_project(self, project_id: str) -> dict[str, Any] | None:
        rows = _normalize_rows(execute_runtime_query(self.contracts.project_get, {'project_id': project_id}))
        row = _first_row(rows)
        if not row:
            return None
        payload = dict(row)
        payload['snapshot'] = _json_loads(payload.pop('snapshot_json', None), {})
        return payload

    def _load_workflow(self, workflow_id: str) -> dict[str, Any] | None:
        row = _first_row(execute_runtime_query(self.contracts.workflow_get, {'workflow_id': workflow_id}))
        return dict(row) if row else None

    def _workflow_belongs_to_project(self, project_id: str, workflow_id: str) -> bool:
        row = _first_row(
            execute_runtime_query(
                self.contracts.workflow_belongs_to_project,
                {
                    'project_id': project_id,
                    'workflow_id': workflow_id,
                },
            )
        )
        return bool(row)

    def _load_runs(self, workflow_id: str, workflow_run_ids: list[str]) -> list[dict[str, Any]]:
        rows = _normalize_rows(
            execute_runtime_query(
                self.contracts.runs_list,
                {'workflow_id': workflow_id, 'workflow_run_ids': workflow_run_ids},
            )
        )
        return [dict(row) for row in rows]

    def _load_matching_claims(
        self,
        project_id: str,
        workflow_id: str,
        workflow_run_ids: list[str],
    ) -> list[dict[str, Any]]:
        rows = _normalize_rows(
            execute_runtime_query(
                self.contracts.matching_claims_list,
                {
                    'project_id': project_id,
                    'workflow_id': workflow_id,
                    'workflow_run_ids': workflow_run_ids,
                },
            )
        )
        claims: list[dict[str, Any]] = []
        for row in rows:
            payload = dict(row)
            payload['metadata'] = _json_loads(payload.pop('metadata_json', None), {})
            claims.append(payload)
        return claims

    def _close_runs(self, workflow_run_ids: list[str], run_terminal_status: str) -> list[dict[str, Any]]:
        rows = _normalize_rows(
            execute_runtime_mutation(
                self.contracts.runs_close,
                {'workflow_run_ids': workflow_run_ids, 'run_terminal_status': run_terminal_status},
            )
        )
        return [dict(row) for row in rows]

    def _supersede_workflow(self, workflow_id: str) -> dict[str, Any]:
        row = _first_row(
            execute_runtime_mutation(self.contracts.workflow_supersede, {'workflow_id': workflow_id})
        )
        return dict(row) if row else {}

    def _supersede_project(self, project_id: str) -> dict[str, Any]:
        row = _first_row(
            execute_runtime_mutation(self.contracts.project_supersede, {'project_id': project_id})
        )
        return dict(row) if row else {}

    def _close_claims(self, claim_ids: list[str]) -> list[dict[str, Any]]:
        if not claim_ids:
            return []
        rows = _normalize_rows(
            execute_runtime_mutation(self.contracts.claims_close, {'claim_ids': claim_ids})
        )
        return [dict(row) for row in rows]

    def _verify_completion(self, project_id: str, project_slug: str) -> dict[str, Any]:
        if project_slug:
            row = _first_row(
                execute_runtime_query(
                    self.contracts.completion_verify_by_slug,
                    {'project_slug': project_slug},
                )
            )
        else:
            row = _first_row(
                execute_runtime_query(
                    self.contracts.completion_verify_by_project_id,
                    {'project_id': project_id},
                )
            )
        count = int(_row_value(row, 'active_workflow_run_count') or 0)
        return {
            'project_id': project_id,
            'project_slug': project_slug or None,
            'active_workflow_run_count': count,
            'active_statuses': list(ACTIVE_RUN_STATUSES),
        }

    def _insert_execution_record(
        self,
        *,
        project_id: str,
        workflow_id: str,
        requested_workflow_run_ids: list[str],
        affected_workflow_run_ids: list[str],
        affected_claim_ids: list[str],
        before_state: dict[str, Any],
        after_state: dict[str, Any],
        reason: str,
        operator_identity: str,
        completion_status: str,
        active_workflow_run_count: int,
        verification: dict[str, Any],
    ) -> dict[str, Any]:
        row = _first_row(
            execute_runtime_mutation(
                self.contracts.execution_record_insert,
                {
                    'project_id': project_id,
                    'workflow_id': workflow_id,
                    'requested_workflow_run_ids_json': json.dumps(requested_workflow_run_ids),
                    'affected_workflow_run_ids_json': json.dumps(affected_workflow_run_ids),
                    'affected_claim_ids_json': json.dumps(affected_claim_ids),
                    'before_state_json': json.dumps(before_state, default=str),
                    'after_state_json': json.dumps(after_state, default=str),
                    'reason': reason,
                    'operator_identity': operator_identity,
                    'completion_status': completion_status,
                    'active_workflow_run_count': active_workflow_run_count,
                    'verification_json': json.dumps(verification, default=str),
                },
            )
        )
        return dict(row) if row else {}
