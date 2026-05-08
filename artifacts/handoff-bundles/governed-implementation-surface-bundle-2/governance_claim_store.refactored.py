from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from orchestration.data_access_runtime.executor import execute_runtime_query
from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation


@dataclass(frozen=True, slots=True)
class GovernanceClaimStoreContracts:
    create_claim: str = 'governance_claim_create'
    get_claim: str = 'governance_claim_get'
    update_metadata: str = 'governance_claim_update_metadata'
    get_active_for_context_session: str = 'governance_claim_get_active_for_context_session'
    get_scope_declaration: str = 'governance_claim_get_scope_declaration'
    update_status: str = 'governance_claim_update_status'
    get_signoff: str = 'governance_claim_get_signoff'
    record_signoff: str = 'governance_claim_record_signoff'


def _json_loads(value: Any, default: Any) -> Any:
    if value in (None, ''):
        return default
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(str(value))
    except (TypeError, ValueError):
        return default


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


def _claim_from_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        'claim_id': str(payload.get('claim_id') or ''),
        'claim_name': payload.get('claim_name'),
        'context_session_id': str(payload.get('context_session_id')) if payload.get('context_session_id') else None,
        'session_governance_id': str(payload.get('session_governance_id')) if payload.get('session_governance_id') else None,
        'scope_declaration_id': str(payload.get('scope_declaration_id')) if payload.get('scope_declaration_id') else None,
        'intent_id': payload.get('intent_id'),
        'actor_id': payload.get('actor_id'),
        'status': payload.get('claim_status'),
        'declared_scope_files': _json_loads(payload.get('declared_scope_files_json'), []),
        'allowed_mutation_surfaces': _json_loads(payload.get('allowed_mutation_surfaces_json'), []),
        'metadata': _json_loads(payload.get('metadata_json'), {}),
        'created_at': payload.get('created_at').isoformat() if payload.get('created_at') else None,
        'updated_at': payload.get('updated_at').isoformat() if payload.get('updated_at') else None,
    }


def _claim_signoff_from_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        'claim_signoff_id': str(payload.get('claim_signoff_id') or ''),
        'claim_id': str(payload.get('claim_id') or ''),
        'context_session_id': str(payload.get('context_session_id')) if payload.get('context_session_id') else None,
        'intent_id': payload.get('intent_id'),
        'acknowledged_reminders': _json_loads(payload.get('acknowledged_reminders_json'), []),
        'intent_confirmation': payload.get('intent_confirmation'),
        'actor_signature': payload.get('actor_signature'),
        'signoff_status': payload.get('signoff_status'),
        'created_at': payload.get('created_at').isoformat() if payload.get('created_at') else None,
        'updated_at': payload.get('updated_at').isoformat() if payload.get('updated_at') else None,
    }


class GovernanceClaimStore:
    contracts = GovernanceClaimStoreContracts()

    def create_claim(
        self,
        *,
        claim_name: str,
        context_session_id: str,
        session_governance_id: str | None,
        scope_declaration_id: str | None,
        intent_id: str,
        actor_id: str,
        declared_scope_files: list[str],
        allowed_mutation_surfaces: list[str],
        metadata: dict[str, Any] | None = None,
        status: str = 'active',
    ) -> dict[str, Any]:
        row = _first_row(
            execute_runtime_mutation(
                self.contracts.create_claim,
                {
                    'claim_name': claim_name,
                    'context_session_id': context_session_id,
                    'session_governance_id': session_governance_id,
                    'scope_declaration_id': scope_declaration_id,
                    'intent_id': intent_id,
                    'actor_id': actor_id,
                    'status': status,
                    'declared_scope_files': json.dumps(declared_scope_files),
                    'allowed_mutation_surfaces': json.dumps(allowed_mutation_surfaces),
                    'metadata': json.dumps(metadata or {}, default=str),
                },
            )
        )
        if not row:
            raise LookupError('Governance claim not found after insert.')
        return _claim_from_payload(row)

    def get_claim(self, claim_id: str) -> dict[str, Any] | None:
        row = _first_row(execute_runtime_query(self.contracts.get_claim, {'claim_id': claim_id}))
        return None if not row else _claim_from_payload(row)

    def update_claim_metadata(self, claim_id: str, metadata: dict[str, Any]) -> dict[str, Any] | None:
        row = _first_row(
            execute_runtime_mutation(
                self.contracts.update_metadata,
                {'claim_id': claim_id, 'metadata': json.dumps(metadata or {}, default=str)},
            )
        )
        return None if not row else _claim_from_payload(row)

    def get_active_claim_for_context_session(self, context_session_id: str) -> dict[str, Any] | None:
        row = _first_row(
            execute_runtime_query(
                self.contracts.get_active_for_context_session,
                {'context_session_id': context_session_id},
            )
        )
        return None if not row else _claim_from_payload(row)

    def get_scope_declaration(self, scope_declaration_id: str) -> dict[str, Any] | None:
        row = _first_row(
            execute_runtime_query(self.contracts.get_scope_declaration, {'scope_declaration_id': scope_declaration_id})
        )
        if not row:
            return None
        return {
            'scope_declaration_id': row.get('scope_declaration_id'),
            'session_governance_id': row.get('session_governance_id'),
            'allowed_mutation_surfaces': _json_loads(row.get('allowed_mutation_surfaces_json'), []),
        }

    def update_claim_status(self, claim_id: str, status: str) -> dict[str, Any] | None:
        row = _first_row(
            execute_runtime_mutation(self.contracts.update_status, {'claim_id': claim_id, 'status': status})
        )
        return None if not row else _claim_from_payload(row)

    def get_claim_signoff(self, claim_id: str) -> dict[str, Any] | None:
        row = _first_row(execute_runtime_query(self.contracts.get_signoff, {'claim_id': claim_id}))
        return None if not row else _claim_signoff_from_payload(row)

    def record_claim_signoff(
        self,
        *,
        claim_id: str,
        context_session_id: str,
        intent_id: str,
        acknowledged_reminders: list[str],
        intent_confirmation: str,
        actor_signature: str,
        signoff_status: str = 'completed',
    ) -> dict[str, Any]:
        row = _first_row(
            execute_runtime_mutation(
                self.contracts.record_signoff,
                {
                    'claim_id': claim_id,
                    'context_session_id': context_session_id,
                    'intent_id': intent_id,
                    'acknowledged_reminders': json.dumps(acknowledged_reminders),
                    'intent_confirmation': intent_confirmation,
                    'actor_signature': actor_signature,
                    'signoff_status': signoff_status,
                },
            )
        )
        if not row:
            raise LookupError('Claim signoff not found after upsert.')
        return _claim_signoff_from_payload(row)
