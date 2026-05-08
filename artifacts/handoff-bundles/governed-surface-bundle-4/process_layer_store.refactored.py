from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from typing import Any

from orchestration.process_layer_models import (
    EvidenceRecord,
    ExecutionOperation,
    OutcomeRecord,
    ProcessAssessment,
    ProcessInstance,
    ProcessPolicyDecision,
    ProcessWorkRequest,
    ReviewTask,
)
from orchestration.data_access_runtime.executor import execute_runtime_query
from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation
from persistence.sql.file_organizer_store import PgConnectionSettings


@dataclass(frozen=True, slots=True)
class ProcessLayerRuntimeContracts:
    create_process_instance: str = 'process_layer_create_process_instance'
    update_process_instance: str = 'process_layer_update_process_instance'
    get_process_instance: str = 'process_layer_get_process_instance'
    create_work_request: str = 'process_layer_create_work_request'
    complete_work_request: str = 'process_layer_complete_work_request'
    record_evidence: str = 'process_layer_record_evidence'
    record_assessment: str = 'process_layer_record_assessment'
    record_policy_decision: str = 'process_layer_record_policy_decision'
    open_review_task: str = 'process_layer_open_review_task'
    record_execution_operation: str = 'process_layer_record_execution_operation'
    record_outcome: str = 'process_layer_record_outcome'


@dataclass(slots=True)
class SqlProcessLayerStore:
    settings: PgConnectionSettings | None = None
    contracts: ProcessLayerRuntimeContracts = ProcessLayerRuntimeContracts()

    def __post_init__(self) -> None:
        self.settings = self.settings or PgConnectionSettings.from_env()

    def create_process_instance(
        self,
        process_type: str,
        subject_ref: str,
        current_stage: str,
        status: str = 'open',
        current_owner: str | None = None,
        snapshot: dict[str, object] | None = None,
    ) -> ProcessInstance:
        process_instance = ProcessInstance(
            process_instance_id=str(uuid.uuid4()),
            process_type=process_type,
            subject_ref=subject_ref,
            status=status,
            current_stage=current_stage,
            current_owner=current_owner,
            snapshot=snapshot or {},
        )
        row = _first_row(
            execute_runtime_mutation(
                self.contracts.create_process_instance,
                {
                    'process_instance_id': process_instance.process_instance_id,
                    'process_type': process_instance.process_type,
                    'subject_ref': process_instance.subject_ref,
                    'status': process_instance.status,
                    'current_stage': process_instance.current_stage,
                    'current_owner': process_instance.current_owner,
                    'snapshot_json': _json(process_instance.snapshot),
                },
            )
        )
        if row:
            process_instance.process_instance_id = str(_row_value(row, 'process_instance_id') or process_instance.process_instance_id)  # type: ignore[misc]
        return process_instance

    def update_process_instance(
        self,
        process_instance_id: str,
        *,
        status: str,
        current_stage: str,
        current_owner: str | None,
        snapshot: dict[str, object],
        closed_at: str | None = None,
    ) -> None:
        execute_runtime_mutation(
            self.contracts.update_process_instance,
            {
                'process_instance_id': process_instance_id,
                'status': status,
                'current_stage': current_stage,
                'current_owner': current_owner,
                'snapshot_json': _json(snapshot),
                'closed_at': closed_at,
            },
        )

    def get_process_instance(self, process_instance_id: str) -> ProcessInstance | None:
        row = _first_row(
            execute_runtime_query(
                self.contracts.get_process_instance,
                {'process_instance_id': process_instance_id},
            )
        )
        if not row:
            return None
        snapshot_raw = row.get('snapshot_json')
        snapshot = json.loads(snapshot_raw) if isinstance(snapshot_raw, str) and snapshot_raw else (snapshot_raw or {})
        return ProcessInstance(
            process_instance_id=str(_row_value(row, 'process_instance_id')),
            process_type=str(_row_value(row, 'process_type')),
            subject_ref=str(_row_value(row, 'subject_ref')),
            status=str(_row_value(row, 'status')),
            current_stage=str(_row_value(row, 'current_stage')),
            current_owner=str(_row_value(row, 'current_owner')) if _row_value(row, 'current_owner') is not None else None,
            snapshot=snapshot if isinstance(snapshot, dict) else {},
            opened_at=str(_row_value(row, 'opened_at')) if _row_value(row, 'opened_at') is not None else None,
            closed_at=str(_row_value(row, 'closed_at')) if _row_value(row, 'closed_at') is not None else None,
            last_updated_at=str(_row_value(row, 'last_updated_at')) if _row_value(row, 'last_updated_at') is not None else None,
        )

    def create_work_request(
        self,
        request_type: str,
        requested_by: str,
        target_scope: dict[str, object],
        *,
        process_instance_id: str | None = None,
        scheduled_for: str | None = None,
        source_name: str | None = None,
        surface_name: str | None = None,
        status: str = 'in-progress',
    ) -> ProcessWorkRequest:
        work_request = ProcessWorkRequest(
            work_request_id=str(uuid.uuid4()),
            process_instance_id=process_instance_id,
            request_type=request_type,
            requested_by=requested_by,
            scheduled_for=scheduled_for,
            source_name=source_name,
            surface_name=surface_name,
            status=status,
            target_scope=target_scope,
        )
        execute_runtime_mutation(
            self.contracts.create_work_request,
            {
                'work_request_id': work_request.work_request_id,
                'process_instance_id': work_request.process_instance_id,
                'request_type': work_request.request_type,
                'requested_by': work_request.requested_by,
                'scheduled_for': work_request.scheduled_for,
                'source_name': work_request.source_name,
                'surface_name': work_request.surface_name,
                'target_scope_json': _json(work_request.target_scope),
                'status': work_request.status,
            },
        )
        return work_request

    def complete_work_request(self, work_request_id: str, status: str = 'completed') -> None:
        execute_runtime_mutation(
            self.contracts.complete_work_request,
            {'work_request_id': work_request_id, 'status': status},
        )

    def record_evidence(
        self,
        process_instance_id: str,
        work_request_id: str,
        evidence_type: str,
        source_locator: str,
        observed_at: str,
        *,
        content_hash: str | None = None,
        metadata: dict[str, object] | None = None,
    ) -> EvidenceRecord:
        evidence = EvidenceRecord(
            evidence_id=str(uuid.uuid4()),
            process_instance_id=process_instance_id,
            work_request_id=work_request_id,
            evidence_type=evidence_type,
            source_locator=source_locator,
            observed_at=observed_at,
            content_hash=content_hash,
            metadata=metadata or {},
        )
        execute_runtime_mutation(
            self.contracts.record_evidence,
            {
                'evidence_id': evidence.evidence_id,
                'process_instance_id': evidence.process_instance_id,
                'work_request_id': evidence.work_request_id,
                'evidence_type': evidence.evidence_type,
                'source_locator': evidence.source_locator,
                'content_hash': evidence.content_hash,
                'metadata_json': _json(evidence.metadata),
                'observed_at': evidence.observed_at,
            },
        )
        return evidence

    def record_assessment(
        self,
        work_request_id: str,
        assessment_type: str,
        assessment_payload: dict[str, object],
        produced_by: str,
        produced_at: str,
        *,
        confidence: float | None = None,
    ) -> ProcessAssessment:
        assessment = ProcessAssessment(
            assessment_id=str(uuid.uuid4()),
            work_request_id=work_request_id,
            assessment_type=assessment_type,
            assessment_payload=assessment_payload,
            produced_by=produced_by,
            produced_at=produced_at,
            confidence=confidence,
        )
        execute_runtime_mutation(
            self.contracts.record_assessment,
            {
                'assessment_id': assessment.assessment_id,
                'work_request_id': assessment.work_request_id,
                'assessment_type': assessment.assessment_type,
                'assessment_payload_json': _json(assessment.assessment_payload),
                'confidence': assessment.confidence,
                'produced_by': assessment.produced_by,
                'produced_at': assessment.produced_at,
            },
        )
        return assessment

    def record_policy_decision(
        self,
        work_request_id: str,
        decision: str,
        allowed: bool,
        reason_codes: list[str],
        policy_codes: list[str],
        evaluated_at: str,
        *,
        assessment_id: str | None = None,
    ) -> ProcessPolicyDecision:
        policy_decision = ProcessPolicyDecision(
            policy_decision_id=str(uuid.uuid4()),
            work_request_id=work_request_id,
            assessment_id=assessment_id,
            decision=decision,
            allowed=allowed,
            reason_codes=reason_codes,
            policy_codes=policy_codes,
            evaluated_at=evaluated_at,
        )
        execute_runtime_mutation(
            self.contracts.record_policy_decision,
            {
                'policy_decision_id': policy_decision.policy_decision_id,
                'work_request_id': policy_decision.work_request_id,
                'assessment_id': policy_decision.assessment_id,
                'decision': policy_decision.decision,
                'allowed': bool(policy_decision.allowed),
                'reason_codes_json': _json(policy_decision.reason_codes),
                'policy_codes_json': _json(policy_decision.policy_codes),
                'evaluated_at': policy_decision.evaluated_at,
            },
        )
        return policy_decision

    def open_review_task(
        self,
        process_instance_id: str,
        work_request_id: str,
        task_type: str,
        opened_at: str,
        *,
        assigned_to: str | None = None,
        resolution_payload: dict[str, object] | None = None,
        status: str = 'open',
    ) -> ReviewTask:
        review_task = ReviewTask(
            review_task_id=str(uuid.uuid4()),
            process_instance_id=process_instance_id,
            work_request_id=work_request_id,
            task_type=task_type,
            status=status,
            opened_at=opened_at,
            assigned_to=assigned_to,
            resolution_payload=resolution_payload or {},
        )
        execute_runtime_mutation(
            self.contracts.open_review_task,
            {
                'review_task_id': review_task.review_task_id,
                'process_instance_id': review_task.process_instance_id,
                'work_request_id': review_task.work_request_id,
                'task_type': review_task.task_type,
                'status': review_task.status,
                'assigned_to': review_task.assigned_to,
                'opened_at': review_task.opened_at,
                'resolved_at': review_task.resolved_at,
                'resolution_payload_json': _json(review_task.resolution_payload),
            },
        )
        return review_task

    def record_execution_operation(
        self,
        work_request_id: str,
        operation_type: str,
        target_locator: str,
        status: str,
        reason: str,
        payload: dict[str, object],
        executed_at: str,
    ) -> ExecutionOperation:
        operation = ExecutionOperation(
            operation_id=str(uuid.uuid4()),
            work_request_id=work_request_id,
            operation_type=operation_type,
            target_locator=target_locator,
            status=status,
            reason=reason,
            payload=payload,
            executed_at=executed_at,
        )
        execute_runtime_mutation(
            self.contracts.record_execution_operation,
            {
                'operation_id': operation.operation_id,
                'work_request_id': operation.work_request_id,
                'operation_type': operation.operation_type,
                'target_locator': operation.target_locator,
                'status': operation.status,
                'reason': operation.reason,
                'payload_json': _json(operation.payload),
                'executed_at': operation.executed_at,
            },
        )
        return operation

    def record_outcome(
        self,
        process_instance_id: str,
        outcome_type: str,
        outcome_status: str,
        measured_at: str,
        outcome_payload: dict[str, object],
        *,
        work_request_id: str | None = None,
    ) -> OutcomeRecord:
        outcome = OutcomeRecord(
            outcome_id=str(uuid.uuid4()),
            process_instance_id=process_instance_id,
            work_request_id=work_request_id,
            outcome_type=outcome_type,
            outcome_status=outcome_status,
            measured_at=measured_at,
            outcome_payload=outcome_payload,
        )
        execute_runtime_mutation(
            self.contracts.record_outcome,
            {
                'outcome_id': outcome.outcome_id,
                'process_instance_id': outcome.process_instance_id,
                'work_request_id': outcome.work_request_id,
                'outcome_type': outcome.outcome_type,
                'outcome_status': outcome.outcome_status,
                'measured_at': outcome.measured_at,
                'outcome_payload_json': _json(outcome.outcome_payload),
            },
        )
        return outcome

    def _json(self, value: object) -> str:
        return json.dumps(value, default=str)


def _json(value: object) -> str:
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
