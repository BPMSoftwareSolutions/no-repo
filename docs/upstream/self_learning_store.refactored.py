from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field, asdict
from typing import Any, Callable, Protocol

try:
    import pyodbc
except ImportError:
    pyodbc = None  # type: ignore[assignment]

from orchestration.data_access_runtime.executor import execute_runtime_query
from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation
from orchestration.self_learning_models import (
    LearningEvidenceRef,
    LearningPromotionCandidate,
    LearningPromotionCandidateMember,
    LearningPromotionFlow,
    LearningPromotionFlowDecision,
    SelfLearningRecord,
    SuggestedPromotionAction,
    build_self_learning_record_contract,
)
from persistence.repositories.sql_client import _PG_CUTOVER_ACTIVE
from persistence.sql.file_organizer_store import PgConnectionSettings, open_sql_connection


ConnectionFactory = Callable[[], Any]
SELF_LEARNING_RECORD_CONTRACT = build_self_learning_record_contract()


@dataclass(slots=True)
class PersistedSelfLearningRecord:
    learning_record_id: str
    created_at: str | None
    updated_at: str | None
    record: SelfLearningRecord


@dataclass(slots=True)
class PersistedSelfLearningPromotionCandidate:
    learning_promotion_candidate_id: str
    created_at: str | None
    updated_at: str | None
    candidate: LearningPromotionCandidate


@dataclass(slots=True)
class PersistedSelfLearningPromotionFlow:
    learning_promotion_flow_id: str
    created_at: str | None
    updated_at: str | None
    flow: LearningPromotionFlow
    latest_decision: dict[str, Any] | None = None


@dataclass(frozen=True, slots=True)
class SelfLearningRuntimeContracts:
    record_upsert: str = 'self_learning_record_upsert'
    record_list: str = 'self_learning_record_list'
    record_get: str = 'self_learning_record_get'
    posture: str = 'self_learning_posture'
    promotion_candidate_upsert: str = 'self_learning_promotion_candidate_upsert'
    promotion_candidate_list: str = 'self_learning_promotion_candidate_list'
    promotion_candidate_get: str = 'self_learning_promotion_candidate_get'
    promotion_flow_upsert: str = 'self_learning_promotion_flow_upsert'
    promotion_flow_list: str = 'self_learning_promotion_flow_list'
    promotion_flow_get: str = 'self_learning_promotion_flow_get'
    promotion_flow_decision_record: str = 'self_learning_promotion_flow_decision_record'


def _is_pg_cutover_active() -> bool:
    return _PG_CUTOVER_ACTIVE


def _normalize_payload(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return dict(value)
    if hasattr(value, '_asdict'):
        return dict(value._asdict())
    if hasattr(value, '__dict__'):
        return {key: val for key, val in vars(value).items() if not key.startswith('_')}
    return {'value': value}


def _normalize_rows(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if isinstance(value, list):
        return [_normalize_payload(item) for item in value]
    if isinstance(value, dict):
        rows = value.get('rows')
        if isinstance(rows, list):
            return [_normalize_payload(item) for item in rows]
        return [_normalize_payload(value)]
    return [_normalize_payload(value)]


def _first_row(value: Any) -> dict[str, Any]:
    rows = _normalize_rows(value)
    return rows[0] if rows else {}


def _json_loads(raw_value: Any) -> dict[str, Any]:
    if raw_value in (None, ''):
        return {}
    if isinstance(raw_value, dict):
        return dict(raw_value)
    if isinstance(raw_value, str):
        try:
            loaded = json.loads(raw_value)
        except json.JSONDecodeError:
            return {}
        return loaded if isinstance(loaded, dict) else {}
    return {}


def _json_loads_list(raw_value: Any) -> list[dict[str, Any]]:
    if raw_value in (None, ''):
        return []
    if isinstance(raw_value, list):
        return [_normalize_payload(item) for item in raw_value]
    if isinstance(raw_value, str):
        try:
            loaded = json.loads(raw_value)
        except json.JSONDecodeError:
            return []
        if isinstance(loaded, list):
            return [_normalize_payload(item) for item in loaded]
    return []


def _timestamp_value(raw_value: Any) -> str | None:
    if raw_value in (None, ''):
        return None
    if hasattr(raw_value, 'isoformat'):
        try:
            return raw_value.isoformat()
        except Exception:
            return str(raw_value)
    return str(raw_value)


def _string_value(row: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = row.get(key)
        if value not in (None, ''):
            return str(value)
    return None


def _int_value(row: dict[str, Any], *keys: str, default: int = 0) -> int:
    for key in keys:
        value = row.get(key)
        if value not in (None, ''):
            try:
                return int(value)
            except Exception:
                continue
    return default


def _bool_value(row: dict[str, Any], *keys: str, default: bool = False) -> bool:
    for key in keys:
        value = row.get(key)
        if value not in (None, ''):
            return bool(value)
    return default


def _coerce_evidence_ref(payload: dict[str, Any]) -> LearningEvidenceRef:
    return LearningEvidenceRef(
        evidence_posture=_string_value(payload, 'evidence_posture') or 'measured',
        source_type=_string_value(payload, 'source_type') or 'unknown',
        source_ref=_string_value(payload, 'source_ref') or '',
        workflow_run_id=_string_value(payload, 'workflow_run_id'),
        step_run_id=_string_value(payload, 'step_run_id'),
        agent_turn_id=_string_value(payload, 'agent_turn_id'),
        artifact_id=_string_value(payload, 'artifact_id'),
        decision_record_id=_string_value(payload, 'decision_record_id'),
        policy_evaluation_id=_string_value(payload, 'policy_evaluation_id'),
        metric_key=_string_value(payload, 'metric_key'),
        metric_value=payload.get('metric_value'),
        is_primary=_bool_value(payload, 'is_primary'),
        metadata=_json_loads(payload.get('metadata') or payload.get('metadata_json')),
    )


def _coerce_suggested_action(payload: dict[str, Any]) -> SuggestedPromotionAction:
    return SuggestedPromotionAction(
        action_type=_string_value(payload, 'action_type') or 'observe_only',
        target_type=_string_value(payload, 'target_type') or 'workflow_update',
        rationale=_string_value(payload, 'rationale') or '',
        target_ref=_string_value(payload, 'target_ref'),
        governance_required=_bool_value(payload, 'governance_required', default=True),
        minimum_evidence_count=_int_value(payload, 'minimum_evidence_count', default=1),
        minimum_confidence=_string_value(payload, 'minimum_confidence') or 'review_required',
    )


def _coerce_candidate_member(payload: dict[str, Any]) -> LearningPromotionCandidateMember:
    return LearningPromotionCandidateMember(
        learning_record_id=_string_value(payload, 'learning_record_id') or '',
        learning_key=_string_value(payload, 'learning_key') or '',
        workflow_run_id=_string_value(payload, 'workflow_run_id'),
        confidence_posture=_string_value(payload, 'confidence_posture') or 'review_required',
        promotion_readiness=_string_value(payload, 'promotion_readiness') or 'review_blocked',
        observed_at=_timestamp_value(payload.get('observed_at') or payload.get('created_at')),
        evidence_count=_int_value(payload, 'evidence_count', default=0),
    )


def _coerce_record(payload: dict[str, Any], fallback: SelfLearningRecord | None = None) -> SelfLearningRecord:
    evidence_rows = _json_loads_list(payload.get('evidence_refs') or payload.get('evidence_refs_json') or payload.get('evidence_links'))
    action_rows = _json_loads_list(payload.get('suggested_actions') or payload.get('suggested_actions_json'))
    return SelfLearningRecord(
        learning_key=_string_value(payload, 'learning_key') or (fallback.learning_key if fallback else ''),
        title=_string_value(payload, 'title') or (fallback.title if fallback else ''),
        summary=_string_value(payload, 'summary') or (fallback.summary if fallback else ''),
        learning_category=_string_value(payload, 'learning_category') or (fallback.learning_category if fallback else 'optimization'),
        confidence_posture=_string_value(payload, 'confidence_posture') or (fallback.confidence_posture if fallback else 'review_required'),
        promotion_readiness=_string_value(payload, 'promotion_readiness') or (fallback.promotion_readiness if fallback else 'review_blocked'),
        evidence_refs=[_coerce_evidence_ref(row) for row in evidence_rows] if evidence_rows else (list(fallback.evidence_refs) if fallback else []),
        suggested_actions=[_coerce_suggested_action(row) for row in action_rows] if action_rows else (list(fallback.suggested_actions) if fallback else []),
        workflow_run_id=_string_value(payload, 'workflow_run_id') or (fallback.workflow_run_id if fallback else None),
        step_run_id=_string_value(payload, 'step_run_id') or (fallback.step_run_id if fallback else None),
        agent_turn_id=_string_value(payload, 'agent_turn_id') or (fallback.agent_turn_id if fallback else None),
        primary_artifact_id=_string_value(payload, 'primary_artifact_id') or (fallback.primary_artifact_id if fallback else None),
        cluster_key=_string_value(payload, 'cluster_key') or (fallback.cluster_key if fallback else None),
        affected_workflow_slug=_string_value(payload, 'affected_workflow_slug') or (fallback.affected_workflow_slug if fallback else None),
        affected_step_key=_string_value(payload, 'affected_step_key') or (fallback.affected_step_key if fallback else None),
        target_seed_kind=_string_value(payload, 'target_seed_kind') or (fallback.target_seed_kind if fallback else None),
        target_seed_profile_id=_string_value(payload, 'target_seed_profile_id') or (fallback.target_seed_profile_id if fallback else None),
        target_seed_profile_key=_string_value(payload, 'target_seed_profile_key') or (fallback.target_seed_profile_key if fallback else None),
        target_seed_profile_version_id=_string_value(payload, 'target_seed_profile_version_id') or (fallback.target_seed_profile_version_id if fallback else None),
        suggested_change=_json_loads(payload.get('suggested_change') or payload.get('suggested_change_json')) or (dict(fallback.suggested_change) if fallback else {}),
        expected_effect=_json_loads(payload.get('expected_effect') or payload.get('expected_effect_json')) or (dict(fallback.expected_effect) if fallback else {}),
        governance_notes=_string_value(payload, 'governance_notes') or (fallback.governance_notes if fallback else None),
        operator_notes=_string_value(payload, 'operator_notes') or (fallback.operator_notes if fallback else None),
        metadata=_json_loads(payload.get('metadata') or payload.get('metadata_json')) or (dict(fallback.metadata) if fallback else {}),
    )


def _coerce_candidate(payload: dict[str, Any], fallback: LearningPromotionCandidate | None = None) -> LearningPromotionCandidate:
    member_rows = _json_loads_list(payload.get('members') or payload.get('candidate_members'))
    members = [_coerce_candidate_member(row) for row in member_rows] if member_rows else (list(fallback.members) if fallback else [])
    return LearningPromotionCandidate(
        candidate_key=_string_value(payload, 'candidate_key') or (fallback.candidate_key if fallback else ''),
        title=_string_value(payload, 'title') or (fallback.title if fallback else ''),
        summary=_string_value(payload, 'summary') or (fallback.summary if fallback else ''),
        learning_category=_string_value(payload, 'learning_category') or (fallback.learning_category if fallback else 'optimization'),
        confidence_posture=_string_value(payload, 'confidence_posture') or (fallback.confidence_posture if fallback else 'review_required'),
        promotion_readiness=_string_value(payload, 'promotion_readiness') or (fallback.promotion_readiness if fallback else 'candidate'),
        members=members,
        workflow_scope_count=_int_value(payload, 'workflow_scope_count', default=fallback.workflow_scope_count if fallback else 1),
        learning_record_count=_int_value(payload, 'learning_record_count', default=fallback.learning_record_count if fallback else 1),
        source_cluster_key=_string_value(payload, 'source_cluster_key') or (fallback.source_cluster_key if fallback else None),
        affected_workflow_slug=_string_value(payload, 'affected_workflow_slug') or (fallback.affected_workflow_slug if fallback else None),
        affected_step_key=_string_value(payload, 'affected_step_key') or (fallback.affected_step_key if fallback else None),
        target_seed_kind=_string_value(payload, 'target_seed_kind') or (fallback.target_seed_kind if fallback else None),
        target_seed_profile_id=_string_value(payload, 'target_seed_profile_id') or (fallback.target_seed_profile_id if fallback else None),
        target_seed_profile_key=_string_value(payload, 'target_seed_profile_key') or (fallback.target_seed_profile_key if fallback else None),
        target_seed_profile_version_id=_string_value(payload, 'target_seed_profile_version_id') or (fallback.target_seed_profile_version_id if fallback else None),
        proposed_seed_change=_json_loads(payload.get('proposed_seed_change') or payload.get('proposed_seed_change_json')) or (dict(fallback.proposed_seed_change) if fallback else {}),
        expected_effect=_json_loads(payload.get('expected_effect') or payload.get('expected_effect_json')) or (dict(fallback.expected_effect) if fallback else {}),
        requires_seed_change_set=_bool_value(payload, 'requires_seed_change_set', default=fallback.requires_seed_change_set if fallback else True),
        governance_notes=_string_value(payload, 'governance_notes') or (fallback.governance_notes if fallback else None),
        metadata=_json_loads(payload.get('metadata') or payload.get('metadata_json')) or (dict(fallback.metadata) if fallback else {}),
    )


def _coerce_flow(payload: dict[str, Any], fallback: LearningPromotionFlow | None = None) -> LearningPromotionFlow:
    return LearningPromotionFlow(
        promotion_flow_key=_string_value(payload, 'promotion_flow_key') or (fallback.promotion_flow_key if fallback else ''),
        candidate_key=_string_value(payload, 'candidate_key') or (fallback.candidate_key if fallback else ''),
        title=_string_value(payload, 'title') or (fallback.title if fallback else ''),
        summary=_string_value(payload, 'summary') or (fallback.summary if fallback else ''),
        target_type=_string_value(payload, 'target_type') or (fallback.target_type if fallback else 'workflow_update'),
        target_ref=_string_value(payload, 'target_ref') or (fallback.target_ref if fallback else None),
        source_action_type=_string_value(payload, 'source_action_type') or (fallback.source_action_type if fallback else 'observe_only'),
        flow_status=_string_value(payload, 'flow_status') or (fallback.flow_status if fallback else 'pending_review'),
        requires_governance=_bool_value(payload, 'requires_governance', default=fallback.requires_governance if fallback else True),
        governance_rationale=_string_value(payload, 'governance_rationale') or (fallback.governance_rationale if fallback else None),
        proposed_change=_json_loads(payload.get('proposed_change') or payload.get('proposed_change_json')) or (dict(fallback.proposed_change) if fallback else {}),
        metadata=_json_loads(payload.get('metadata') or payload.get('metadata_json')) or (dict(fallback.metadata) if fallback else {}),
    )


def _coerce_decision_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        'learning_promotion_flow_decision_id': _string_value(payload, 'learning_promotion_flow_decision_id', 'decision_id'),
        'learning_promotion_flow_id': _string_value(payload, 'learning_promotion_flow_id'),
        'decision': _string_value(payload, 'decision'),
        'rationale': _string_value(payload, 'rationale'),
        'decision_notes': _json_loads(payload.get('decision_notes') or payload.get('decision_notes_json')),
        'decided_by': _string_value(payload, 'decided_by'),
        'decided_at': _timestamp_value(payload.get('decided_at')),
    }


class SelfLearningStore(Protocol):
    def save_learning_record(self, record: SelfLearningRecord, *, created_by: str | None = None) -> PersistedSelfLearningRecord: ...
    def list_learning_records(
        self,
        *,
        workflow_run_id: str | None = None,
        learning_category: str | None = None,
        promotion_readiness: str | None = None,
        limit: int = 100,
    ) -> list[PersistedSelfLearningRecord]: ...
    def get_learning_record(self, learning_record_id: str) -> PersistedSelfLearningRecord: ...
    def get_self_learning_posture(self, *, workflow_run_id: str | None = None) -> dict[str, Any]: ...
    def save_promotion_candidate(
        self,
        candidate: LearningPromotionCandidate,
        *,
        created_by: str | None = None,
    ) -> PersistedSelfLearningPromotionCandidate: ...
    def list_promotion_candidates(
        self,
        *,
        workflow_run_id: str | None = None,
        learning_category: str | None = None,
        promotion_readiness: str | None = None,
        limit: int = 100,
    ) -> list[PersistedSelfLearningPromotionCandidate]: ...
    def get_promotion_candidate(self, candidate_key: str) -> PersistedSelfLearningPromotionCandidate: ...
    def save_promotion_flow(
        self,
        flow: LearningPromotionFlow,
        *,
        created_by: str | None = None,
    ) -> PersistedSelfLearningPromotionFlow: ...
    def list_promotion_flows(
        self,
        *,
        flow_status: str | None = None,
        target_type: str | None = None,
        candidate_key: str | None = None,
        limit: int = 100,
    ) -> list[PersistedSelfLearningPromotionFlow]: ...
    def get_promotion_flow(self, promotion_flow_key: str) -> PersistedSelfLearningPromotionFlow: ...
    def record_promotion_flow_decision(
        self,
        promotion_flow_key: str,
        decision: LearningPromotionFlowDecision,
    ) -> dict[str, Any]: ...


@dataclass(slots=True)
class SqlSelfLearningStore:
    settings: PgConnectionSettings | None = None
    connection_factory: ConnectionFactory | None = None
    contracts: SelfLearningRuntimeContracts = field(default_factory=SelfLearningRuntimeContracts)

    def __post_init__(self) -> None:
        self.settings = self.settings or PgConnectionSettings.from_env()
        self.connection_factory = self.connection_factory or self._open_connection

    def _open_connection(self) -> Any:
        return open_sql_connection(self.settings)

    def _save_and_reload_record(self, learning_record_id: str, record: SelfLearningRecord, created_by: str | None) -> PersistedSelfLearningRecord:
        result = execute_runtime_mutation(
            self.contracts.record_upsert,
            {
                'learning_record_id': learning_record_id,
                'record': record.to_dict(),
                'created_by': created_by,
            },
        )
        persisted_row = _first_row(result)
        if persisted_row:
            learning_record_id = _string_value(persisted_row, 'learning_record_id') or learning_record_id
        return self.get_learning_record(learning_record_id)

    def save_learning_record(self, record: SelfLearningRecord, *, created_by: str | None = None) -> PersistedSelfLearningRecord:
        learning_record_id = str(uuid.uuid4())
        return self._save_and_reload_record(learning_record_id, record, created_by)

    def list_learning_records(
        self,
        *,
        workflow_run_id: str | None = None,
        learning_category: str | None = None,
        promotion_readiness: str | None = None,
        limit: int = 100,
    ) -> list[PersistedSelfLearningRecord]:
        return self._load_learning_records(
            where_clause='',
            params={
                'workflow_run_id': workflow_run_id,
                'learning_category': learning_category,
                'promotion_readiness': promotion_readiness,
                'limit': limit,
            },
            limit=limit,
        )

    def get_learning_record(self, learning_record_id: str) -> PersistedSelfLearningRecord:
        records = self._load_learning_records(
            where_clause='',
            params={'learning_record_id': learning_record_id, 'limit': 1},
            limit=1,
        )
        if not records:
            raise LookupError('Self-learning record not found.')
        return records[0]

    def get_self_learning_posture(self, *, workflow_run_id: str | None = None) -> dict[str, Any]:
        row = _first_row(
            execute_runtime_query(
                self.contracts.posture,
                {
                    'workflow_run_id': workflow_run_id,
                },
            )
        )
        if not row:
            return {
                'summary': {
                    'total_learning_count': 0,
                    'optimization_count': 0,
                    'failure_pattern_count': 0,
                    'governance_pattern_count': 0,
                    'candidate_count': 0,
                    'review_blocked_count': 0,
                    'high_confidence_count': 0,
                    'medium_confidence_count': 0,
                    'latest_learning_at': None,
                }
            }
        return {
            'summary': {
                'total_learning_count': _int_value(row, 'total_learning_count'),
                'optimization_count': _int_value(row, 'optimization_count'),
                'failure_pattern_count': _int_value(row, 'failure_pattern_count'),
                'governance_pattern_count': _int_value(row, 'governance_pattern_count'),
                'candidate_count': _int_value(row, 'candidate_count'),
                'review_blocked_count': _int_value(row, 'review_blocked_count'),
                'high_confidence_count': _int_value(row, 'high_confidence_count'),
                'medium_confidence_count': _int_value(row, 'medium_confidence_count'),
                'latest_learning_at': _timestamp_value(row.get('latest_learning_at')),
            }
        }

    def _save_and_reload_candidate(self, candidate: LearningPromotionCandidate, created_by: str | None) -> PersistedSelfLearningPromotionCandidate:
        result = execute_runtime_mutation(
            self.contracts.promotion_candidate_upsert,
            {
                'candidate': candidate.to_dict(),
                'created_by': created_by,
            },
        )
        row = _first_row(result)
        candidate_key = _string_value(row, 'candidate_key') or candidate.candidate_key
        return self.get_promotion_candidate(candidate_key)

    def save_promotion_candidate(
        self,
        candidate: LearningPromotionCandidate,
        *,
        created_by: str | None = None,
    ) -> PersistedSelfLearningPromotionCandidate:
        return self._save_and_reload_candidate(candidate, created_by)

    def list_promotion_candidates(
        self,
        *,
        workflow_run_id: str | None = None,
        learning_category: str | None = None,
        promotion_readiness: str | None = None,
        limit: int = 100,
    ) -> list[PersistedSelfLearningPromotionCandidate]:
        return self._load_promotion_candidates(
            params={
                'workflow_run_id': workflow_run_id,
                'learning_category': learning_category,
                'promotion_readiness': promotion_readiness,
                'limit': limit,
            },
            limit=limit,
        )

    def get_promotion_candidate(self, candidate_key: str) -> PersistedSelfLearningPromotionCandidate:
        candidates = self._load_promotion_candidates(
            params={'candidate_key': candidate_key, 'limit': 1},
            limit=1,
        )
        if not candidates:
            raise LookupError('Self-learning promotion candidate not found.')
        return candidates[0]

    def _save_and_reload_flow(self, flow: LearningPromotionFlow, created_by: str | None) -> PersistedSelfLearningPromotionFlow:
        result = execute_runtime_mutation(
            self.contracts.promotion_flow_upsert,
            {
                'flow': flow.to_dict(),
                'created_by': created_by,
            },
        )
        row = _first_row(result)
        flow_key = _string_value(row, 'promotion_flow_key') or flow.promotion_flow_key
        return self.get_promotion_flow(flow_key)

    def save_promotion_flow(
        self,
        flow: LearningPromotionFlow,
        *,
        created_by: str | None = None,
    ) -> PersistedSelfLearningPromotionFlow:
        return self._save_and_reload_flow(flow, created_by)

    def list_promotion_flows(
        self,
        *,
        flow_status: str | None = None,
        target_type: str | None = None,
        candidate_key: str | None = None,
        limit: int = 100,
    ) -> list[PersistedSelfLearningPromotionFlow]:
        return self._load_promotion_flows(
            params={
                'flow_status': flow_status,
                'target_type': target_type,
                'candidate_key': candidate_key,
                'limit': limit,
            },
            limit=limit,
        )

    def get_promotion_flow(self, promotion_flow_key: str) -> PersistedSelfLearningPromotionFlow:
        flows = self._load_promotion_flows(
            params={'promotion_flow_key': promotion_flow_key, 'limit': 1},
            limit=1,
        )
        if not flows:
            raise LookupError('Promotion flow not found.')
        return flows[0]

    def record_promotion_flow_decision(
        self,
        promotion_flow_key: str,
        decision: LearningPromotionFlowDecision,
    ) -> dict[str, Any]:
        result = execute_runtime_mutation(
            self.contracts.promotion_flow_decision_record,
            {
                'promotion_flow_key': promotion_flow_key,
                'decision': decision.to_dict(),
            },
        )
        row = _first_row(result)
        if row:
            return _coerce_decision_payload(row)
        flow = self.get_promotion_flow(promotion_flow_key)
        if flow.latest_decision:
            return dict(flow.latest_decision)
        return {
            'learning_promotion_flow_decision_id': None,
            'learning_promotion_flow_id': None,
            'decision': decision.decision,
            'rationale': decision.rationale,
            'decision_notes': dict(decision.decision_notes or {}),
            'decided_by': decision.decided_by,
            'decided_at': None,
        }

    def decide_promotion_flow(
        self,
        promotion_flow_key: str,
        *,
        decision: str,
        rationale: str,
        decided_by: str,
        decision_notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return self.record_promotion_flow_decision(
            promotion_flow_key,
            LearningPromotionFlowDecision(
                decision=decision,
                decided_by=decided_by,
                rationale=rationale,
                decision_notes=decision_notes or {},
            ),
        )

    def record_learning(self, record: SelfLearningRecord, *, created_by: str | None = None) -> dict[str, Any]:
        persisted = self.save_learning_record(record, created_by=created_by)
        return self.serialize_record(persisted)

    def list_records(
        self,
        *,
        workflow_run_id: str | None = None,
        learning_category: str | None = None,
        promotion_readiness: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        records = self.list_learning_records(
            workflow_run_id=workflow_run_id,
            learning_category=learning_category,
            promotion_readiness=promotion_readiness,
            limit=limit,
        )
        return [self.serialize_record(record) for record in records]

    def get_record(self, learning_record_id: str) -> dict[str, Any]:
        return self.serialize_record(self.get_learning_record(learning_record_id))

    def get_posture(self, *, workflow_run_id: str | None = None, recent_limit: int = 10) -> dict[str, Any]:
        posture = self.get_self_learning_posture(workflow_run_id=workflow_run_id)
        return {
            'summary': posture.get('summary', {}),
            'recent_records': self.list_records(workflow_run_id=workflow_run_id, limit=recent_limit),
        }

    def get_operator_posture(self, *, workflow_run_id: str | None = None, recent_limit: int = 10) -> dict[str, Any]:
        posture = self.get_self_learning_posture(workflow_run_id=workflow_run_id)
        return {
            'summary': posture.get('summary', {}),
            'recent_records': self.list_records(workflow_run_id=workflow_run_id, limit=recent_limit),
            'promotion_candidates': self.list_candidates(workflow_run_id=workflow_run_id, limit=recent_limit),
            'pending_flows': self.list_promotion_flows(flow_status='pending_review', limit=recent_limit),
        }

    def record_promotion_candidate(
        self,
        candidate: LearningPromotionCandidate,
        *,
        created_by: str | None = None,
    ) -> dict[str, Any]:
        persisted = self.save_promotion_candidate(candidate, created_by=created_by)
        return self.serialize_candidate(persisted)

    def list_candidates(
        self,
        *,
        workflow_run_id: str | None = None,
        learning_category: str | None = None,
        promotion_readiness: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        return [self.serialize_candidate(candidate) for candidate in self.list_promotion_candidates(
            workflow_run_id=workflow_run_id,
            learning_category=learning_category,
            promotion_readiness=promotion_readiness,
            limit=limit,
        )]

    def get_candidate_detail(self, candidate_key: str) -> dict[str, Any]:
        persisted = self.get_promotion_candidate(candidate_key)
        return {
            'candidate': self.serialize_candidate(persisted),
            'seed_target': persisted.candidate.metadata.get('seed_target') if isinstance(persisted.candidate.metadata, dict) else {},
        }

    def record_promotion_flow(
        self,
        flow: LearningPromotionFlow,
        *,
        created_by: str | None = None,
    ) -> dict[str, Any]:
        persisted = self.save_promotion_flow(flow, created_by=created_by)
        return self.serialize_flow(persisted)

    def list_promotion_flows_view(
        self,
        *,
        flow_status: str | None = None,
        target_type: str | None = None,
        candidate_key: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        return [self.serialize_flow(flow) for flow in self.list_promotion_flows(
            flow_status=flow_status,
            target_type=target_type,
            candidate_key=candidate_key,
            limit=limit,
        )]

    def get_promotion_flow_detail(self, promotion_flow_key: str) -> dict[str, Any]:
        return self.serialize_flow(self.get_promotion_flow(promotion_flow_key))

    def _load_learning_records(
        self,
        *,
        where_clause: str,
        params: dict[str, Any],
        limit: int,
    ) -> list[PersistedSelfLearningRecord]:
        del where_clause
        rows = _normalize_rows(
            execute_runtime_query(
                self.contracts.record_list,
                params,
            )
        )
        results: list[PersistedSelfLearningRecord] = []
        for row in rows[:limit]:
            record = _coerce_record(row)
            results.append(
                PersistedSelfLearningRecord(
                    learning_record_id=_string_value(row, 'learning_record_id') or '',
                    created_at=_timestamp_value(row.get('created_at')),
                    updated_at=_timestamp_value(row.get('updated_at')),
                    record=record,
                )
            )
        return results

    def _load_promotion_candidates(
        self,
        *,
        params: dict[str, Any],
        limit: int,
    ) -> list[PersistedSelfLearningPromotionCandidate]:
        rows = _normalize_rows(
            execute_runtime_query(
                self.contracts.promotion_candidate_list,
                params,
            )
        )
        results: list[PersistedSelfLearningPromotionCandidate] = []
        for row in rows[:limit]:
            candidate = _coerce_candidate(row)
            results.append(
                PersistedSelfLearningPromotionCandidate(
                    learning_promotion_candidate_id=_string_value(row, 'learning_promotion_candidate_id') or '',
                    created_at=_timestamp_value(row.get('created_at')),
                    updated_at=_timestamp_value(row.get('updated_at')),
                    candidate=candidate,
                )
            )
        return results

    def _load_promotion_flows(
        self,
        *,
        params: dict[str, Any],
        limit: int,
    ) -> list[PersistedSelfLearningPromotionFlow]:
        rows = _normalize_rows(
            execute_runtime_query(
                self.contracts.promotion_flow_list,
                params,
            )
        )
        results: list[PersistedSelfLearningPromotionFlow] = []
        for row in rows[:limit]:
            flow = _coerce_flow(row)
            latest_decision_payload = row.get('latest_decision') or row.get('decisions') or row.get('decision')
            latest_decision = None
            if isinstance(latest_decision_payload, list) and latest_decision_payload:
                latest_decision = _coerce_decision_payload(_normalize_payload(latest_decision_payload[0]))
            elif isinstance(latest_decision_payload, dict):
                latest_decision = _coerce_decision_payload(latest_decision_payload)
            results.append(
                PersistedSelfLearningPromotionFlow(
                    learning_promotion_flow_id=_string_value(row, 'learning_promotion_flow_id') or '',
                    created_at=_timestamp_value(row.get('created_at')),
                    updated_at=_timestamp_value(row.get('updated_at')),
                    flow=flow,
                    latest_decision=latest_decision,
                )
            )
        return results

    def serialize_record(self, persisted: PersistedSelfLearningRecord) -> dict[str, Any]:
        return {
            'learning_record_id': persisted.learning_record_id,
            'created_at': persisted.created_at,
            'updated_at': persisted.updated_at,
            'record': persisted.record.to_dict(),
        }

    def serialize_candidate(self, persisted: PersistedSelfLearningPromotionCandidate) -> dict[str, Any]:
        return {
            'learning_promotion_candidate_id': persisted.learning_promotion_candidate_id,
            'created_at': persisted.created_at,
            'updated_at': persisted.updated_at,
            'candidate': persisted.candidate.to_dict(),
        }

    def serialize_flow(self, persisted: PersistedSelfLearningPromotionFlow) -> dict[str, Any]:
        return {
            'learning_promotion_flow_id': persisted.learning_promotion_flow_id,
            'created_at': persisted.created_at,
            'updated_at': persisted.updated_at,
            'flow': persisted.flow.to_dict(),
            'latest_decision': persisted.latest_decision,
        }


def build_default_self_learning_store() -> SqlSelfLearningStore:
    return SqlSelfLearningStore()


__all__ = [
    'ConnectionFactory',
    'PersistedSelfLearningPromotionCandidate',
    'PersistedSelfLearningPromotionFlow',
    'PersistedSelfLearningRecord',
    'SELF_LEARNING_RECORD_CONTRACT',
    'SelfLearningRuntimeContracts',
    'SelfLearningStore',
    'SqlSelfLearningStore',
    'build_default_self_learning_store',
]
