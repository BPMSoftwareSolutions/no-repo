from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from typing import Any

from orchestration.contractor_tax_models import ContractorTaxCodificationRunResult
from orchestration.data_access_runtime.executor import execute_runtime_query
from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation
from persistence.sql.file_organizer_store import SqlConnectionSettings


@dataclass(frozen=True, slots=True)
class ContractorTaxRuntimeContracts:
    save_run: str = 'contractor_tax_save_run'
    apply_review_decision: str = 'contractor_tax_apply_review_decision'
    load_pending_operations: str = 'contractor_tax_load_pending_operations'


@dataclass(slots=True)
class SqlContractorTaxStore:
    settings: SqlConnectionSettings | None = None
    contracts: ContractorTaxRuntimeContracts = ContractorTaxRuntimeContracts()

    def __post_init__(self) -> None:
        self.settings = self.settings or SqlConnectionSettings.from_env()

    def save_run(
        self,
        result: ContractorTaxCodificationRunResult,
        monolith_root: str,
        rebuild_root: str,
        status: str = 'completed',
    ) -> str:
        run_id = str(uuid.uuid4())
        payload = {
            'profile': result.profile.__dict__,
            'documents': [document.__dict__ for document in result.documents],
            'trust_conditions': [condition.__dict__ for condition in result.trust_conditions],
            'rebuild_plan': {'operations': [operation.__dict__ for operation in result.rebuild_plan.operations]},
        }
        row = _first_row(
            execute_runtime_mutation(
                self.contracts.save_run,
                {
                    'run_id': run_id,
                    'profile_name': result.profile.profile_name,
                    'match_rate': result.profile.match_rate,
                    'inferred': bool(result.profile.inferred),
                    'monolith_root': monolith_root,
                    'rebuild_root': rebuild_root,
                    'status': status,
                    'detected_document_types_json': self._json(result.profile.detected_document_types),
                    'payload': self._json(payload),
                },
            )
        )
        return str(_row_value(row, 'run_id') or run_id)

    def apply_review_decision(
        self,
        run_id: str,
        decision: str,
        contractor_name: str | None = None,
        document_type: str | None = None,
        tax_year: str | None = None,
        reviewed_by: str = 'operator',
        notes: str = '',
    ) -> dict[str, Any]:
        normalized_decision = decision.strip().lower()
        if normalized_decision not in {'approved', 'rejected'}:
            raise ValueError("decision must be 'approved' or 'rejected'.")

        operations = _rows(
            execute_runtime_query(
                self.contracts.load_pending_operations,
                {
                    'run_id': run_id,
                    'contractor_name': contractor_name,
                    'document_type': document_type,
                    'tax_year': tax_year,
                },
            )
        )
        updated_operations: list[dict[str, Any]] = []
        for operation in operations:
            review_action_id = str(uuid.uuid4())
            execute_runtime_mutation(
                self.contracts.apply_review_decision,
                {
                    'review_action_id': review_action_id,
                    'operation_id': str(operation['operation_id']),
                    'run_id': run_id,
                    'contractor_name': operation.get('contractor_name'),
                    'document_type': operation.get('document_type'),
                    'tax_year': operation.get('tax_year'),
                    'previous_status': operation.get('status'),
                    'new_status': normalized_decision,
                    'reviewed_by': reviewed_by,
                    'notes': notes,
                },
            )
            updated_operations.append(
                {
                    'operation_id': str(operation['operation_id']),
                    'contractor_name': operation.get('contractor_name'),
                    'document_type': operation.get('document_type'),
                    'tax_year': operation.get('tax_year'),
                    'source_path': operation.get('source_path'),
                    'target_path': operation.get('target_path'),
                    'previous_status': operation.get('status'),
                    'new_status': normalized_decision,
                }
            )

        return {
            'run_id': run_id,
            'decision': normalized_decision,
            'reviewed_by': reviewed_by,
            'notes': notes,
            'filters': {
                'contractor_name': contractor_name,
                'document_type': document_type,
                'tax_year': tax_year,
            },
            'matched_operation_count': len(updated_operations),
            'updated_operations': updated_operations,
        }

    def _json(self, value: object) -> str:
        return json.dumps(value, default=str)


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


def _first_row(value: Any) -> dict[str, Any]:
    rows = _rows(value)
    return rows[0] if rows else {}


def _row_value(row: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in row and row[key] is not None:
            return row[key]
    return None
