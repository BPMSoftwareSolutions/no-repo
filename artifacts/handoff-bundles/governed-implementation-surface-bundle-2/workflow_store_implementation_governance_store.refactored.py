from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from typing import Any

from orchestration.data_access_runtime.executor import execute_runtime_query
from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation


@dataclass(frozen=True, slots=True)
class WorkflowStoreImplementationGovernanceContracts:
    item_status_update: str = 'workflow_store_implementation_item_status_update'
    item_routing_update: str = 'workflow_store_implementation_item_routing_update'
    acceptance_check_status_update: str = 'workflow_store_implementation_acceptance_check_status_update'
    evidence_link_create: str = 'workflow_store_implementation_evidence_link_create'
    gate_decision_record: str = 'workflow_store_implementation_gate_decision_record'
    item_domain_transitions_list: str = 'workflow_store_implementation_item_domain_transitions_list'


def _normalize_rows(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if isinstance(value, list):
        return [item if isinstance(item, dict) else {'value': item} for item in value]
    if isinstance(value, dict):
        rows = value.get('rows')
        if isinstance(rows, list):
            return [item if isinstance(item, dict) else {'value': item} for item in rows]
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


def _json_loads(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, (bytes, bytearray)):
        value = value.decode('utf-8')
    text = str(value).strip()
    if not text:
        return None
    return json.loads(text)


class SqlWorkflowStoreImplementationGovernanceStoreMixin:
    contracts = WorkflowStoreImplementationGovernanceContracts()

    def update_implementation_item_status(
        self,
        implementation_item_id: str,
        *,
        status: str,
        status_reason: str | None,
        updated_by: str,
    ) -> dict[str, Any]:
        result = execute_runtime_mutation(
            self.contracts.item_status_update,
            {
                'implementation_item_id': implementation_item_id,
                'status': status,
                'status_reason': status_reason,
                'updated_by': updated_by,
            },
        )
        row = _first_row(result)
        if not row:
            raise LookupError('Implementation item not found.')
        return {
            'implementation_item_id': str(_row_value(row, 'implementation_item_id') or implementation_item_id),
            'implementation_packet_id': str(_row_value(row, 'implementation_packet_id')),
            'item_key': _row_value(row, 'item_key'),
            'status': _row_value(row, 'status') or status,
            'status_reason': _row_value(row, 'status_reason') or status_reason,
            'updated_by': updated_by,
            'updated_at': _row_value(row, 'updated_at').isoformat() if _row_value(row, 'updated_at') and hasattr(_row_value(row, 'updated_at'), 'isoformat') else _row_value(row, 'updated_at'),
        }

    def update_implementation_item_routing(
        self,
        implementation_item_id: str,
        *,
        target_domain: str,
        current_domain: str,
        domain_status: str,
        transition_reason: str | None,
        routing_strategy: str | None,
        current_owner_type: str | None,
        current_owner_id: str | None,
        triggered_by: str,
        workflow_run_id: str | None,
    ) -> dict[str, Any]:
        transition_id = str(uuid.uuid4())
        result = execute_runtime_mutation(
            self.contracts.item_routing_update,
            {
                'implementation_item_id': implementation_item_id,
                'transition_id': transition_id,
                'target_domain': target_domain,
                'current_domain': current_domain,
                'domain_status': domain_status,
                'transition_reason': transition_reason,
                'routing_strategy': routing_strategy,
                'current_owner_type': current_owner_type,
                'current_owner_id': current_owner_id,
                'triggered_by': triggered_by,
                'workflow_run_id': workflow_run_id,
            },
        )
        row = _first_row(result)
        if not row:
            raise LookupError('Implementation item not found.')
        return {
            'implementation_item_id': str(_row_value(row, 'implementation_item_id') or implementation_item_id),
            'implementation_packet_id': str(_row_value(row, 'implementation_packet_id')),
            'item_key': _row_value(row, 'item_key'),
            'domain_status': _row_value(row, 'domain_status') or domain_status,
            'target_domain': _row_value(row, 'target_domain') or target_domain,
            'current_domain': _row_value(row, 'current_domain') or current_domain,
            'routing_strategy': _row_value(row, 'routing_strategy') or routing_strategy,
            'current_owner_type': _row_value(row, 'current_owner_type') or current_owner_type,
            'current_owner_id': _row_value(row, 'current_owner_id') or current_owner_id,
            'transition_id': transition_id,
            'transition_reason': transition_reason,
            'triggered_by': triggered_by,
            'workflow_run_id': workflow_run_id,
        }

    def update_implementation_acceptance_check_status(
        self,
        implementation_item_id: str,
        acceptance_check_id: str,
        *,
        status: str,
        updated_by: str,
    ) -> dict[str, Any]:
        result = execute_runtime_mutation(
            self.contracts.acceptance_check_status_update,
            {
                'implementation_item_id': implementation_item_id,
                'acceptance_check_id': acceptance_check_id,
                'status': status,
                'updated_by': updated_by,
            },
        )
        row = _first_row(result)
        if not row:
            raise LookupError('Acceptance check not found.')
        return {
            'acceptance_check_id': str(_row_value(row, 'acceptance_check_id') or acceptance_check_id),
            'implementation_item_id': str(_row_value(row, 'implementation_item_id') or implementation_item_id),
            'status': _row_value(row, 'status') or status,
            'updated_by': updated_by,
            'updated_at': _row_value(row, 'updated_at').isoformat() if _row_value(row, 'updated_at') and hasattr(_row_value(row, 'updated_at'), 'isoformat') else _row_value(row, 'updated_at'),
        }

    def create_implementation_evidence_link(
        self,
        *,
        implementation_item_id: str,
        acceptance_check_id: str | None,
        evidence_type: str,
        evidence_ref: str,
        title: str | None,
        metadata: dict[str, Any] | None,
        recorded_by: str,
    ) -> dict[str, Any]:
        result = execute_runtime_mutation(
            self.contracts.evidence_link_create,
            {
                'implementation_item_id': implementation_item_id,
                'acceptance_check_id': acceptance_check_id,
                'evidence_type': evidence_type,
                'evidence_ref': evidence_ref,
                'title': title,
                'metadata': metadata or {},
                'recorded_by': recorded_by,
            },
        )
        row = _first_row(result)
        if not row:
            raise RuntimeError('Implementation evidence link did not persist.')
        return {
            'evidence_link_id': str(_row_value(row, 'evidence_link_id') or _row_value(row, 'implementation_evidence_link_id')),
            'implementation_item_id': _row_value(row, 'implementation_item_id') or implementation_item_id,
            'acceptance_check_id': _row_value(row, 'acceptance_check_id') or acceptance_check_id,
            'evidence_type': _row_value(row, 'evidence_type') or evidence_type,
            'evidence_ref': _row_value(row, 'evidence_ref') or evidence_ref,
            'title': _row_value(row, 'title') or title,
            'metadata': _json_loads(_row_value(row, 'metadata_json')) or metadata or {},
            'recorded_by': _row_value(row, 'recorded_by') or recorded_by,
            'created_at': _row_value(row, 'created_at').isoformat() if _row_value(row, 'created_at') and hasattr(_row_value(row, 'created_at'), 'isoformat') else _row_value(row, 'created_at'),
        }

    def record_implementation_gate_decision(
        self,
        packet_id: str,
        *,
        gate_type: str,
        decision: str,
        rationale: str | None,
        evidence_refs: list[str] | None,
        remediation_actions: list[str] | None,
        decided_by: str,
    ) -> dict[str, Any]:
        result = execute_runtime_mutation(
            self.contracts.gate_decision_record,
            {
                'packet_id': packet_id,
                'gate_type': gate_type,
                'decision': decision,
                'rationale': rationale,
                'evidence_refs': evidence_refs or [],
                'remediation_actions': remediation_actions or [],
                'decided_by': decided_by,
            },
        )
        row = _first_row(result)
        if not row:
            raise RuntimeError('Implementation gate decision did not persist.')
        return {
            'implementation_gate_decision_id': str(_row_value(row, 'implementation_gate_decision_id')),
            'implementation_gate_bundle_id': str(_row_value(row, 'implementation_gate_bundle_id')),
            'decision': _row_value(row, 'decision') or decision,
            'rationale': _row_value(row, 'rationale') or rationale,
            'evidence_refs': _json_loads(_row_value(row, 'evidence_refs_json')) or evidence_refs or [],
            'remediation_actions': _json_loads(_row_value(row, 'remediation_actions_json')) or remediation_actions or [],
            'decided_by': _row_value(row, 'decided_by') or decided_by,
            'decided_at': _row_value(row, 'decided_at').isoformat() if _row_value(row, 'decided_at') and hasattr(_row_value(row, 'decided_at'), 'isoformat') else _row_value(row, 'decided_at'),
        }

    def list_implementation_item_domain_transitions(self, implementation_item_id: str) -> list[dict[str, Any]]:
        rows = _normalize_rows(
            execute_runtime_query(
                self.contracts.item_domain_transitions_list,
                {'implementation_item_id': implementation_item_id},
            )
        )
        return [
            {
                'implementation_item_domain_transition_id': _row_value(row, 'implementation_item_domain_transition_id'),
                'implementation_item_id': _row_value(row, 'implementation_item_id'),
                'implementation_packet_id': _row_value(row, 'implementation_packet_id'),
                'workflow_run_id': _row_value(row, 'workflow_run_id'),
                'from_domain': _row_value(row, 'from_domain'),
                'to_domain': _row_value(row, 'to_domain'),
                'from_domain_status': _row_value(row, 'from_domain_status'),
                'to_domain_status': _row_value(row, 'to_domain_status'),
                'transition_reason': _row_value(row, 'transition_reason'),
                'triggered_by': _row_value(row, 'triggered_by'),
                'routing_strategy': _row_value(row, 'routing_strategy'),
                'current_owner_type': _row_value(row, 'current_owner_type'),
                'current_owner_id': _row_value(row, 'current_owner_id'),
                'created_at': _row_value(row, 'created_at').isoformat() if _row_value(row, 'created_at') and hasattr(_row_value(row, 'created_at'), 'isoformat') else _row_value(row, 'created_at'),
            }
            for row in rows
        ]
