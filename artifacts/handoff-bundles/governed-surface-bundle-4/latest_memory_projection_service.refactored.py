from __future__ import annotations

from typing import Any, Protocol

from orchestration.authored_skill_packets import get_authored_skill_packet
from orchestration.execution_context_service import ExecutionContextService
from orchestration.skill_seed_catalog import EXECUTION_CONTEXT_REQUIREMENT_OVERRIDES
from persistence.sql.agent_handoff_store import SqlAgentHandoffStore
from persistence.sql.file_organizer_store import open_sql_connection
from persistence.sql.governed_execution_contract_store import GovernedExecutionContractStore
from persistence.sql.session_governance_store import SessionGovernanceStore
from persistence.sql.skill_contract_store import SqlSkillContractStore
from persistence.sql.workflow_store import SqlWorkflowStore


MEMORY_LANE_DEFINITIONS: dict[str, dict[str, Any]] = {
    'understand_system': {
        'label': 'Understand the system',
        'goal': 'Learn workflow posture, architecture shape, and code inventory from SQL-backed truth.',
        'skill_keys': ['lookup_code_inventory', 'lookup_code_graph', 'find_workflow'],
        'keywords': ['understand', 'system', 'repo', 'codebase', 'architecture', 'inventory', 'graph', 'shape'],
    },
    'implementation_planning': {
        'label': 'Plan implementation work',
        'goal': 'Create or inspect charter and roadmap state through the project delivery control plane.',
        'skill_keys': ['create_project_charter', 'create_implementation_roadmap', 'find_project_charter', 'find_implementation_roadmap'],
        'keywords': ['plan', 'implementation', 'roadmap', 'charter', 'project', 'scope'],
    },
    'workflow_execution': {
        'label': 'Work a workflow',
        'goal': 'Locate, run, export, or review workflow-backed execution state.',
        'skill_keys': ['run_workflow', 'find_workflow', 'export_project_charter_report', 'export_implementation_roadmap_report'],
        'keywords': ['workflow', 'run', 'execute', 'export', 'report', 'stage'],
    },
    'pattern_inspection': {
        'label': 'Inspect architecture patterns',
        'goal': 'Use governed code inventory and graph signals before any raw repo traversal.',
        'skill_keys': ['lookup_code_inventory', 'lookup_code_graph', 'discover_codebase_shapes_and_architecture_signals'],
        'keywords': ['pattern', 'architecture', 'integrity', 'symbol', 'code', 'inventory', 'relationship'],
    },
    'skill_governance': {
        'label': 'Govern skills and pattern review',
        'goal': 'Create or review skill contracts, policy bindings, and pattern findings.',
        'skill_keys': ['create_skill_contract', 'run_pattern_inventory_discovery'],
        'keywords': ['skill', 'contract', 'governance', 'pattern', 'review'],
    },
    'governance_recovery': {
        'label': 'Resolve governance gaps',
        'goal': 'Repair blocking session gaps or compliance blockers before further execution.',
        'skill_keys': ['resolve_session_gap'],
        'keywords': ['gap', 'blocker', 'compliance', 'exception', 'recover', 'provenance'],
    },
}


class LatestMemoryProjectionStore(Protocol):
    def get_latest_memory_projection(self, workflow_run_id: str | None = None) -> dict[str, Any]: ...


class RunCompliancePostureStore(Protocol):
    def get_run_compliance_posture(self, *, workflow_run_id: str) -> dict[str, Any]: ...


class SessionGovernanceStateStore(Protocol):
    def get_session_governance_state_by_run(self, workflow_run_id: str) -> dict[str, Any] | None: ...
    def get_latest_lane_selection_record(self, session_governance_id: str) -> dict[str, Any] | None: ...
    def create_lane_selection_record(
        self,
        *,
        session_governance_id: str,
        selection_basis: str,
        selected_lane_key: str | None = None,
        selected_skill_key: str | None = None,
        recommended_lane_key: str | None = None,
        recommended_skill_key: str | None = None,
        selection_source: str = 'latest_memory_projection',
        selection_metadata: dict[str, Any] | None = None,
        agent_session_id: str | None = None,
        agent_turn_id: str | None = None,
        workflow_run_id: str | None = None,
    ) -> dict[str, Any]: ...


class TurnStartPostureStore(Protocol):
    def get_turn_start_posture(self, *, session_governance_id: str, intent: str | None = None) -> dict[str, Any] | None: ...


class SkillRegistryStore(Protocol):
    def get_skill_registry_status(self) -> dict[str, Any]: ...
    def get_skill_contract(self, *, skill_id: str | None = None, skill_key: str | None = None) -> dict[str, Any] | None: ...
    def get_skill_governance_posture(
        self,
        *,
        skill_id: str | None = None,
        skill_key: str | None = None,
        skill_version_id: str | None = None,
    ) -> dict[str, Any] | None: ...


class AgentHandoffStore(Protocol):
    def get_pending_handoff(self, workflow_run_id: str) -> dict[str, Any] | None: ...


class LatestMemoryProjectionService:
    def __init__(
        self,
        store: LatestMemoryProjectionStore,
        execution_contract_store: RunCompliancePostureStore | None = None,
        session_governance_store: SessionGovernanceStateStore | None = None,
        execution_context_service: TurnStartPostureStore | None = None,
        skill_contract_store: SkillRegistryStore | None = None,
        handoff_store: AgentHandoffStore | None = None,
    ) -> None:
        self.store = store
        self.execution_contract_store = execution_contract_store
        self.session_governance_store = session_governance_store
        self.execution_context_service = execution_context_service
        self.skill_contract_store = skill_contract_store
        self.handoff_store = handoff_store

    def get_current_projection(
        self,
        workflow_run_id: str | None = None,
        *,
        selected_lane: str | None = None,
        skill_key: str | None = None,
    ) -> dict[str, Any]:
        payload = self.store.get_latest_memory_projection(workflow_run_id=workflow_run_id)
        if not isinstance(payload, dict):
            raise RuntimeError('Latest memory projection store returned an invalid payload.')

        projected = dict(payload)
        session_governance_state = self._get_projection_session_governance_state(projected, workflow_run_id)
        projected['execution_context_posture'] = self._build_execution_context_posture(
            projected,
            session_governance_state=session_governance_state,
        )
        projected['contract'] = self._build_contract_metadata()
        projected['hydration_context'] = self._build_hydration_context(projected)
        existing_selection_record = self._get_lane_selection_record(session_governance_state)
        lane_catalog = self._build_lane_catalog()
        routing_state = self._build_routing_state(
            projected,
            lane_catalog,
            selected_lane=selected_lane,
            skill_key=skill_key,
            existing_selection_record=existing_selection_record,
        )
        lane_selection_record = existing_selection_record
        if self._should_persist_lane_selection(selected_lane=selected_lane, skill_key=skill_key):
            persisted_record = self._persist_lane_selection(
                projected,
                session_governance_state,
                routing_state,
            )
            if persisted_record is not None:
                lane_selection_record = persisted_record
        projected['pending_handoff'] = self._build_pending_handoff(projected)
        projected.update(self._build_signed_compliance_projection(projected, workflow_run_id=workflow_run_id))
        projected['memory_entrypoint'] = self._build_memory_entrypoint(projected, lane_catalog, routing_state)
        projected['routing_state'] = routing_state
        projected['lane_selection_record'] = lane_selection_record
        selected_skill_key = str(routing_state.get('selected_skill_key') or '').strip() or None
        if selected_skill_key:
            skill_packet = self._build_skill_packet(projected, lane_catalog, routing_state, selected_skill_key=selected_skill_key)
            if skill_packet is not None:
                projected['skill_packet'] = skill_packet
        return projected

    def _build_signed_compliance_projection(
        self,
        payload: dict[str, Any],
        *,
        workflow_run_id: str | None,
    ) -> dict[str, Any]:
        resolved_workflow_run_id = str(workflow_run_id or '').strip()
        if not resolved_workflow_run_id:
            summary = payload.get('summary') if isinstance(payload.get('summary'), dict) else {}
            resolved_workflow_run_id = str(summary.get('workflow_run_id') or '').strip()
        if not resolved_workflow_run_id:
            return {'policy_recognitions': [], 'compliance_commitments': []}

        try:
            with open_sql_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(
                    """
                    SELECT
                        agent_turn_compliance_commitment_id,
                        agent_turn_id,
                        agent_session_id,
                        claim_id,
                        project_id,
                        workflow_run_id,
                        declared_intent_json,
                        allowed_mutation_surfaces_json,
                        mutations_performed_json,
                        required_postconditions_json,
                        postconditions_satisfied,
                        blockers_opened_json,
                        signed_by,
                        signature_hash,
                        created_at
                    FROM decisioning.agent_turn_compliance_commitments
                    WHERE workflow_run_id = %s
                    ORDER BY created_at DESC
                    LIMIT 6
                    """,
                    (resolved_workflow_run_id,),
                )
                column_names = [item[0] for item in (cursor.description or [])]
                rows = cursor.fetchall()
        except Exception:
            return {'policy_recognitions': [], 'compliance_commitments': []}

        commitments: list[dict[str, Any]] = []
        recognitions_by_signature: dict[str, dict[str, Any]] = {}
        for row in rows:
            record = dict(row) if isinstance(row, dict) else dict(zip(column_names, row, strict=False))
            declared_intent = self._json_value(record.get('declared_intent_json'), {})
            mutations = self._json_value(record.get('mutations_performed_json'), [])
            postconditions = self._json_value(record.get('required_postconditions_json'), [])
            blockers = self._json_value(record.get('blockers_opened_json'), [])
            commitments.append(
                {
                    'claim_id': record.get('claim_id'),
                    'turn_id': str(record.get('agent_turn_id') or ''),
                    'project_id': record.get('project_id'),
                    'workflow_run_id': record.get('workflow_run_id'),
                    'observed_mutations': mutations if isinstance(mutations, list) else [],
                    'required_postconditions': postconditions if isinstance(postconditions, list) else [],
                    'postconditions_satisfied': bool(record.get('postconditions_satisfied')),
                    'blockers_opened': blockers if isinstance(blockers, list) else [],
                    'signed_by': record.get('signed_by'),
                    'signature_hash': record.get('signature_hash'),
                }
            )
            if isinstance(declared_intent, dict):
                for policy in declared_intent.get('recognized_policies') or []:
                    if not isinstance(policy, dict):
                        continue
                    signature = str(policy.get('signature_hash') or '')
                    if signature:
                        recognitions_by_signature[signature] = policy

        return {
            'policy_recognitions': list(recognitions_by_signature.values()),
            'compliance_commitments': commitments,
        }

    @staticmethod
    def _json_value(value: Any, default: Any) -> Any:
        if isinstance(value, (dict, list)):
            return value
        if isinstance(value, str):
            try:
                import json

                return json.loads(value)
            except Exception:
                return default
        return default

    def _build_contract_metadata(self) -> dict[str, Any]:
        return {
            'contract_key': 'latest-memory-projection',
            'contract_version': '1.3',
            'source_of_truth_sections': [
                'summary',
                'blockers',
                'decisions',
                'artifacts',
                'source_refs',
                'reminders',
                'execution_context_posture',
            ],
            'convenience_sections': [
                'operator_handoff',
                'pending_handoff',
                'hydration_context',
                'memory_entrypoint',
                'routing_state',
                'lane_selection_record',
                'skill_packet',
            ],
            'minimum_hydration_fields': [
                'summary.workflow_run_id',
                'summary.workflow_id',
                'summary.agent_session_id',
                'summary.current_objective',
                'summary.current_stage',
                'summary.workflow_run_status',
                'summary.active_step_name',
                'summary.blocker_count',
                'blockers[].blocker_label',
                'blockers[].blocker_status',
                'decisions[].gate_key',
                'decisions[].decision_band',
                'artifacts[].artifact_type',
                'artifacts[].title',
                'source_refs[].source_kind',
                'source_refs[].source_path',
                'source_refs[].integrity_status',
                'reminders[].reminder_key',
                'reminders[].category',
                'reminders[].reminder_tier',
                'reminders[].source_ref',
                'reminders[].source_title',
                'reminders[].reminder_text',
                'execution_context_posture.status',
                'execution_context_posture.current_context_key',
                'execution_context_posture.effective_mutation_posture',
                'execution_context_posture.startup_outcome',
                'execution_context_posture.requires_transition_request',
                'execution_context_posture.non_compliant_steps',
                'execution_context_posture.open_gap_count',
                'execution_context_posture.pending_manual_exception_count',
                'operator_handoff.next_action',
                'memory_entrypoint.system_identity.system_name',
                'memory_entrypoint.current_posture.startup_mode',
                'memory_entrypoint.work_lanes[].lane_key',
                'memory_entrypoint.available_skills[].skill_key',
                'memory_entrypoint.routing_prompt.prompt_text',
                'routing_state.selected_lane_key',
                'routing_state.selected_skill_key',
                'routing_state.selection_basis',
                'lane_selection_record.selection_basis',
            ],
        }

    def _get_projection_session_governance_state(
        self,
        payload: dict[str, Any],
        workflow_run_id: str | None,
    ) -> dict[str, Any] | None:
        resolved_workflow_run_id = str(workflow_run_id or '').strip()
        if not resolved_workflow_run_id:
            summary = payload.get('summary') if isinstance(payload.get('summary'), dict) else {}
            resolved_workflow_run_id = str(summary.get('workflow_run_id') or '').strip()
        if not resolved_workflow_run_id:
            return None
        return self._get_session_governance_state(resolved_workflow_run_id)

    def _get_lane_selection_record(self, session_governance_state: dict[str, Any] | None) -> dict[str, Any] | None:
        if self.session_governance_store is None or not isinstance(session_governance_state, dict):
            return None
        session_governance_id = str(session_governance_state.get('session_governance_id') or '').strip()
        if not session_governance_id:
            return None
        try:
            record = self.session_governance_store.get_latest_lane_selection_record(session_governance_id)
        except Exception:
            return None
        return record if isinstance(record, dict) else None

    def _should_persist_lane_selection(self, *, selected_lane: str | None, skill_key: str | None) -> bool:
        return bool(str(selected_lane or '').strip() or str(skill_key or '').strip())

    def _persist_lane_selection(
        self,
        payload: dict[str, Any],
        session_governance_state: dict[str, Any] | None,
        routing_state: dict[str, Any],
    ) -> dict[str, Any] | None:
        if self.session_governance_store is None or not isinstance(session_governance_state, dict):
            return None
        session_governance_id = str(session_governance_state.get('session_governance_id') or '').strip()
        if not session_governance_id:
            return None
        try:
            return self.session_governance_store.create_lane_selection_record(
                session_governance_id=session_governance_id,
                workflow_run_id=session_governance_state.get('workflow_run_id'),
                selected_lane_key=str(routing_state.get('selected_lane_key') or '').strip() or None,
                selected_skill_key=str(routing_state.get('selected_skill_key') or '').strip() or None,
                recommended_lane_key=str(routing_state.get('recommended_lane_key') or '').strip() or None,
                recommended_skill_key=str(routing_state.get('recommended_skill_key') or '').strip() or None,
                selection_basis=str(routing_state.get('selection_basis') or 'startup_recommendation'),
                selection_source='latest_memory_projection',
                selection_metadata={
                    'active_skill_key': routing_state.get('active_skill_key'),
                    'workflow_run_id': ((payload.get('summary') or {}) if isinstance(payload.get('summary'), dict) else {}).get('workflow_run_id'),
                },
            )
        except Exception:
            return None

    def _build_execution_context_posture(
        self,
        payload: dict[str, Any],
        *,
        session_governance_state: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        if self.execution_contract_store is None and self.session_governance_store is None:
            return None

        summary = payload.get('summary') if isinstance(payload.get('summary'), dict) else {}
        workflow_run_id = str(summary.get('workflow_run_id') or '').strip()
        if not workflow_run_id:
            return None

        posture: dict[str, Any] = {}
        if self.execution_contract_store is not None:
            try:
                posture = self.execution_contract_store.get_run_compliance_posture(workflow_run_id=workflow_run_id)
            except Exception:
                posture = {}
        if not isinstance(posture, dict):
            posture = {}

        session_governance = session_governance_state or self._get_session_governance_state(workflow_run_id)
        turn_start_posture = self._get_turn_start_posture(session_governance_id=(session_governance or {}).get('session_governance_id'))

        if not posture and session_governance is None and turn_start_posture is None:
            return None

        reason_breakdown = posture.get('compliance_reason_breakdown') if isinstance(posture.get('compliance_reason_breakdown'), list) else []
        top_reason = None
        if reason_breakdown:
            top_reason = max(
                (item for item in reason_breakdown if isinstance(item, dict)),
                key=lambda item: int(item.get('step_count') or 0),
                default=None,
            )

        total_steps = int(posture.get('total_steps') or 0)
        non_compliant_steps = int(posture.get('non_compliant_steps') or 0)
        open_gap_count = int(posture.get('open_gap_count') or 0)
        pending_manual_exception_count = int(posture.get('pending_manual_exception_count') or 0)
        unevaluated_steps = int(posture.get('unevaluated_steps') or 0)

        if non_compliant_steps or open_gap_count or pending_manual_exception_count:
            status = 'attention_required'
        elif total_steps == 0 and not posture.get('intent'):
            status = 'not_started'
        elif unevaluated_steps:
            status = 'in_progress'
        else:
            status = 'compliant'

        current_context = turn_start_posture.get('current_context') if isinstance(turn_start_posture, dict) and isinstance(turn_start_posture.get('current_context'), dict) else {}
        active_control_state = (
            turn_start_posture.get('active_control_state')
            if isinstance(turn_start_posture, dict) and isinstance(turn_start_posture.get('active_control_state'), dict)
            else {}
        )
        pending_transition = (
            turn_start_posture.get('pending_transition')
            if isinstance(turn_start_posture, dict) and isinstance(turn_start_posture.get('pending_transition'), dict)
            else {}
        )
        skill_execution_run = (
            turn_start_posture.get('skill_execution_run')
            if isinstance(turn_start_posture, dict) and isinstance(turn_start_posture.get('skill_execution_run'), dict)
            else {}
        )

        return {
            'workflow_run_id': workflow_run_id,
            'session_governance_id': (session_governance or {}).get('session_governance_id'),
            'governance_state': (session_governance or {}).get('governance_state'),
            'status': status,
            'intent': posture.get('intent') if isinstance(posture.get('intent'), dict) else None,
            'total_steps': total_steps,
            'compliant_steps': int(posture.get('compliant_steps') or 0),
            'non_compliant_steps': non_compliant_steps,
            'unevaluated_steps': unevaluated_steps,
            'open_gap_count': open_gap_count,
            'pending_manual_exception_count': pending_manual_exception_count,
            'current_context_key': current_context.get('context_key'),
            'current_context_display_name': current_context.get('display_name'),
            'current_context_mutation_posture': current_context.get('mutation_posture'),
            'effective_mutation_posture': (
                turn_start_posture.get('effective_mutation_posture') if isinstance(turn_start_posture, dict) else None
            ) or (session_governance or {}).get('mutation_posture'),
            'startup_outcome': (
                turn_start_posture.get('outcome') if isinstance(turn_start_posture, dict) else None
            ),
            'startup_rationale': (
                turn_start_posture.get('rationale') if isinstance(turn_start_posture, dict) else None
            ) or (session_governance or {}).get('startup_rationale'),
            'requires_transition_request': (
                bool(turn_start_posture.get('requires_transition_request')) if isinstance(turn_start_posture, dict) else None
            ),
            'active_control_state': active_control_state.get('control_state'),
            'active_control_reason': active_control_state.get('reason_summary'),
            'pending_transition_to_context_key': pending_transition.get('to_context_key'),
            'pending_transition_status': pending_transition.get('transition_status'),
            'pending_transition_reason': pending_transition.get('decision_reason') or pending_transition.get('request_reason'),
            'active_skill_key': skill_execution_run.get('skill_key'),
            'active_skill_execution_status': skill_execution_run.get('execution_status'),
            'top_compliance_reason_code': (
                str(top_reason.get('compliance_reason_code') or '').strip() if isinstance(top_reason, dict) else None
            ) or None,
            'top_compliance_reason_step_count': int(top_reason.get('step_count') or 0) if isinstance(top_reason, dict) else 0,
        }

    def _get_session_governance_state(self, workflow_run_id: str) -> dict[str, Any] | None:
        if self.session_governance_store is None:
            return None
        try:
            state = self.session_governance_store.get_session_governance_state_by_run(workflow_run_id)
        except Exception:
            return None
        return state if isinstance(state, dict) else None

    def _get_turn_start_posture(self, session_governance_id: Any) -> dict[str, Any] | None:
        normalized_session_governance_id = str(session_governance_id or '').strip()
        if not normalized_session_governance_id or self.execution_context_service is None:
            return None
        try:
            posture = self.execution_context_service.get_turn_start_posture(session_governance_id=normalized_session_governance_id)
        except Exception:
            return None
        return posture if isinstance(posture, dict) else None

    def _build_hydration_context(self, payload: dict[str, Any]) -> dict[str, Any]:
        summary = payload.get('summary') if isinstance(payload.get('summary'), dict) else {}
        operator_handoff = payload.get('operator_handoff') if isinstance(payload.get('operator_handoff'), dict) else {}
        blockers = payload.get('blockers') if isinstance(payload.get('blockers'), list) else []
        decisions = payload.get('decisions') if isinstance(payload.get('decisions'), list) else []
        artifacts = payload.get('artifacts') if isinstance(payload.get('artifacts'), list) else []
        source_refs = payload.get('source_refs') if isinstance(payload.get('source_refs'), list) else []
        reminders = payload.get('reminders') if isinstance(payload.get('reminders'), list) else []
        execution_context_posture = payload.get('execution_context_posture') if isinstance(payload.get('execution_context_posture'), dict) else {}

        return {
            'objective': summary.get('current_objective'),
            'stage': summary.get('current_stage'),
            'run_status': summary.get('workflow_run_status'),
            'active_step': summary.get('active_step_name'),
            'blockers': [
                {
                    'label': item.get('blocker_label'),
                    'status': item.get('blocker_status'),
                    'detail': item.get('blocker_detail'),
                }
                for item in blockers[:5]
                if isinstance(item, dict)
            ],
            'decisions': [
                {
                    'gate_key': item.get('gate_key'),
                    'decision': item.get('decision'),
                    'decision_band': item.get('decision_band'),
                }
                for item in decisions[:5]
                if isinstance(item, dict)
            ],
            'artifacts': [
                {
                    'artifact_type': item.get('artifact_type'),
                    'title': item.get('title'),
                }
                for item in artifacts[:5]
                if isinstance(item, dict)
            ],
            'source_refs': [
                {
                    'source_kind': item.get('source_kind'),
                    'source_path': item.get('source_path'),
                    'integrity_status': item.get('integrity_status'),
                }
                for item in source_refs[:5]
                if isinstance(item, dict)
            ],
            'reminders': [
                {
                    'reminder_key': item.get('reminder_key'),
                    'category': item.get('category'),
                    'reminder_tier': item.get('reminder_tier'),
                    'source_ref': item.get('source_ref'),
                    'source_title': item.get('source_title'),
                    'reminder_text': item.get('reminder_text'),
                }
                for item in reminders[:5]
                if isinstance(item, dict)
            ],
            'execution_context_posture': {
                'status': execution_context_posture.get('status'),
                'current_context_key': execution_context_posture.get('current_context_key'),
                'effective_mutation_posture': execution_context_posture.get('effective_mutation_posture'),
                'startup_outcome': execution_context_posture.get('startup_outcome'),
                'requires_transition_request': execution_context_posture.get('requires_transition_request'),
                'non_compliant_steps': execution_context_posture.get('non_compliant_steps'),
                'open_gap_count': execution_context_posture.get('open_gap_count'),
                'pending_manual_exception_count': execution_context_posture.get('pending_manual_exception_count'),
                'unevaluated_steps': execution_context_posture.get('unevaluated_steps'),
                'intent_summary': ((execution_context_posture.get('intent') or {}) if isinstance(execution_context_posture.get('intent'), dict) else {}).get('intent_summary'),
            }
            if execution_context_posture else None,
            'next_action': operator_handoff.get('next_action'),
        }

    def _build_pending_handoff(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        if self.handoff_store is None:
            return None
        summary = payload.get('summary') if isinstance(payload.get('summary'), dict) else {}
        workflow_run_id = str(summary.get('workflow_run_id') or '').strip()
        if not workflow_run_id:
            return None
        try:
            record = self.handoff_store.get_pending_handoff(workflow_run_id)
        except Exception:
            return None
        if not isinstance(record, dict):
            return None
        return {
            'handoff_id': record.get('handoff_id'),
            'handoff_kind': record.get('handoff_kind'),
            'handoff_priority': record.get('handoff_priority'),
            'title': record.get('title'),
            'summary_text': record.get('summary_text'),
            'handoff_payload': record.get('handoff_payload') if isinstance(record.get('handoff_payload'), dict) else {},
            'created_by': record.get('created_by'),
            'created_at': str(record.get('created_at') or ''),
        }

    def _build_lane_catalog(self) -> list[dict[str, Any]]:
        if self.skill_contract_store is None:
            return []
        try:
            registry = self.skill_contract_store.get_skill_registry_status()
        except Exception:
            return []

        skills = registry.get('skills') if isinstance(registry, dict) and isinstance(registry.get('skills'), list) else []
        skills_by_key = {
            str(skill.get('skill_key') or '').strip(): skill
            for skill in skills
            if isinstance(skill, dict) and str(skill.get('skill_key') or '').strip()
        }
        lanes: list[dict[str, Any]] = []
        for lane_key, definition in MEMORY_LANE_DEFINITIONS.items():
            lane_skills: list[dict[str, Any]] = []
            for lane_skill_key in definition['skill_keys']:
                skill = skills_by_key.get(lane_skill_key)
                if not isinstance(skill, dict):
                    continue
                current_version = skill.get('current_version') if isinstance(skill.get('current_version'), dict) else {}
                lane_skills.append({
                    'skill_key': lane_skill_key,
                    'name': skill.get('name'),
                    'status': skill.get('status'),
                    'domain_code': skill.get('domain_code'),
                    'one_line_purpose': current_version.get('intent_summary') or skill.get('description') or '',
                })
            if not lane_skills:
                continue
            lanes.append({
                'lane_key': lane_key,
                'label': definition['label'],
                'goal': definition['goal'],
                'recommended_skill': lane_skills[0]['skill_key'],
                'skills': lane_skills,
                'route_keywords': list(definition['keywords']),
            })
        return lanes

    def _build_routing_state(
        self,
        payload: dict[str, Any],
        lane_catalog: list[dict[str, Any]],
        *,
        selected_lane: str | None,
        skill_key: str | None,
        existing_selection_record: dict[str, Any] | None,
    ) -> dict[str, Any]:
        lanes_by_key = {
            str(item.get('lane_key') or '').strip(): item
            for item in lane_catalog
            if isinstance(item, dict) and str(item.get('lane_key') or '').strip()
        }
        persisted_lane_key = str((existing_selection_record or {}).get('selected_lane_key') or '').strip() or None
        persisted_skill_key = str((existing_selection_record or {}).get('selected_skill_key') or '').strip() or None
        explicit_lane_key = str(selected_lane or '').strip() or None
        explicit_skill_key = str(skill_key or '').strip() or None
        selected_lane_key = explicit_lane_key or persisted_lane_key or ''
        normalized_skill_key = explicit_skill_key or (None if explicit_lane_key else persisted_skill_key)
        active_skill_key = str(((payload.get('execution_context_posture') or {}) if isinstance(payload.get('execution_context_posture'), dict) else {}).get('active_skill_key') or '').strip() or None

        if normalized_skill_key:
            selected_lane_key = self._find_lane_for_skill(lane_catalog, normalized_skill_key) or selected_lane_key

        recommended_lane_key = selected_lane_key or self._recommend_lane_key(payload, lane_catalog, active_skill_key=active_skill_key)
        recommended_lane = lanes_by_key.get(recommended_lane_key or '') if recommended_lane_key else None

        if not selected_lane_key and active_skill_key:
            selected_lane_key = self._find_lane_for_skill(lane_catalog, active_skill_key) or ''

        selected_lane_record = lanes_by_key.get(selected_lane_key or '') if selected_lane_key else None
        selected_skill_key = normalized_skill_key or (None if explicit_lane_key else active_skill_key)
        if selected_skill_key is None and selected_lane_record is not None:
            selected_skill_key = str(selected_lane_record.get('recommended_skill') or '').strip() or None

        recommended_skill_key = None
        if recommended_lane is not None:
            recommended_skill_key = str(recommended_lane.get('recommended_skill') or '').strip() or None

        selection_basis = 'startup_recommendation'
        if explicit_skill_key:
            selection_basis = 'explicit_skill'
        elif explicit_lane_key and selected_lane_record is not None:
            selection_basis = 'explicit_lane'
        elif existing_selection_record is not None and (persisted_lane_key or persisted_skill_key):
            selection_basis = 'persisted_selection'
        elif active_skill_key:
            selection_basis = 'active_skill_execution'
        elif recommended_lane_key:
            selection_basis = 'objective_and_context_router'

        return {
            'recommended_lane_key': recommended_lane_key,
            'recommended_skill_key': recommended_skill_key,
            'selected_lane_key': selected_lane_key or None,
            'selected_skill_key': selected_skill_key,
            'active_skill_key': active_skill_key,
            'selection_basis': selection_basis,
        }

    def _recommend_lane_key(
        self,
        payload: dict[str, Any],
        lane_catalog: list[dict[str, Any]],
        *,
        active_skill_key: str | None,
    ) -> str | None:
        if active_skill_key:
            active_lane = self._find_lane_for_skill(lane_catalog, active_skill_key)
            if active_lane:
                return active_lane

        execution_context_posture = payload.get('execution_context_posture') if isinstance(payload.get('execution_context_posture'), dict) else {}
        if int(execution_context_posture.get('open_gap_count') or 0) > 0 or int(execution_context_posture.get('non_compliant_steps') or 0) > 0:
            if any(item.get('lane_key') == 'governance_recovery' for item in lane_catalog):
                return 'governance_recovery'

        summary = payload.get('summary') if isinstance(payload.get('summary'), dict) else {}
        operator_handoff = payload.get('operator_handoff') if isinstance(payload.get('operator_handoff'), dict) else {}
        text_parts = [
            summary.get('current_objective'),
            summary.get('current_stage'),
            summary.get('active_step_name'),
            operator_handoff.get('next_action'),
            ((execution_context_posture.get('intent') or {}) if isinstance(execution_context_posture.get('intent'), dict) else {}).get('intent_summary'),
        ]
        corpus = ' '.join(str(item or '').lower() for item in text_parts if item)
        if not corpus:
            return 'understand_system' if any(item.get('lane_key') == 'understand_system' for item in lane_catalog) else None

        best_lane_key = None
        best_score = -1
        for lane in lane_catalog:
            keywords = lane.get('route_keywords') if isinstance(lane.get('route_keywords'), list) else []
            score = sum(1 for keyword in keywords if keyword in corpus)
            if score > best_score:
                best_score = score
                best_lane_key = str(lane.get('lane_key') or '').strip() or None

        if best_score > 0:
            return best_lane_key
        if 'report' in corpus or 'export' in corpus or 'workflow' in corpus:
            return 'workflow_execution'
        if 'roadmap' in corpus or 'charter' in corpus or 'project' in corpus:
            return 'implementation_planning'
        return 'understand_system'

    def _find_lane_for_skill(self, lane_catalog: list[dict[str, Any]], skill_key: str) -> str | None:
        normalized_skill_key = str(skill_key or '').strip()
        if not normalized_skill_key:
            return None
        for lane in lane_catalog:
            skills = lane.get('skills') if isinstance(lane.get('skills'), list) else []
            if any(str(item.get('skill_key') or '').strip() == normalized_skill_key for item in skills if isinstance(item, dict)):
                return str(lane.get('lane_key') or '').strip() or None
        return None

    def _build_memory_entrypoint(
        self,
        payload: dict[str, Any],
        lane_catalog: list[dict[str, Any]],
        routing_state: dict[str, Any],
    ) -> dict[str, Any]:
        summary = payload.get('summary') if isinstance(payload.get('summary'), dict) else {}
        execution_context_posture = payload.get('execution_context_posture') if isinstance(payload.get('execution_context_posture'), dict) else {}
        recommended_lane_key = str(routing_state.get('recommended_lane_key') or '').strip() or None
        selected_lane_key = str(routing_state.get('selected_lane_key') or '').strip() or None
        work_lanes = [
            {
                'lane_key': lane.get('lane_key'),
                'label': lane.get('label'),
                'goal': lane.get('goal'),
                'recommended_skill': lane.get('recommended_skill'),
            }
            for lane in lane_catalog
        ]
        available_skills = self._flatten_available_skills(lane_catalog)
        reminder_items = payload.get('reminders') if isinstance(payload.get('reminders'), list) else []

        return {
            'contract_type': 'memory_entrypoint',
            'contract_version': 'v1',
            'system_identity': {
                'system_name': 'ai-engine',
                'system_role': 'governed AI work engine backend',
                'operating_posture': 'broad-scope, governance-aware, SQL-first repo orchestration',
                'source_of_truth': 'SQL-backed operational state',
            },
            'current_posture': {
                'startup_mode': 'memory_first',
                'agent_expectation': 'orient, choose lane, load skill, then act',
                'global_blockers': self._build_global_blockers(payload),
                'active_focus_hint': self._build_active_focus_hint(summary, execution_context_posture, recommended_lane_key),
                'workflow_run_id': summary.get('workflow_run_id'),
                'workflow_id': summary.get('workflow_id'),
            },
            'recent_changes': self._build_recent_changes(payload),
            'work_lanes': work_lanes,
            'available_skills': available_skills,
            'startup_reminders': self._build_startup_reminders(reminder_items),
            'routing_prompt': {
                'prompt_text': 'What do you want to do in this system right now?',
                'expected_responses': [item['lane_key'] for item in work_lanes],
                'recommended_lane': recommended_lane_key,
                'selected_lane': selected_lane_key,
            },
            'deferred_loading_rule': {
                'policy': 'Do not load lane-specific policy, reminders, or deep evidence until a lane or skill is selected.',
            },
        }

    def _build_skill_packet(
        self,
        payload: dict[str, Any],
        lane_catalog: list[dict[str, Any]],
        routing_state: dict[str, Any],
        *,
        selected_skill_key: str,
    ) -> dict[str, Any] | None:
        selected_lane_key = str(routing_state.get('selected_lane_key') or self._find_lane_for_skill(lane_catalog, selected_skill_key) or '').strip() or None
        authored_packet = get_authored_skill_packet(lane_key=selected_lane_key, skill_key=selected_skill_key)
        contract = self.skill_contract_store.get_skill_contract(skill_key=selected_skill_key) if self.skill_contract_store is not None else None
        if not isinstance(contract, dict) and authored_packet is None:
            return None
        governance = self.skill_contract_store.get_skill_governance_posture(skill_key=selected_skill_key) if self.skill_contract_store is not None else {}
        if not isinstance(governance, dict):
            governance = {}
        contract = contract if isinstance(contract, dict) else {}
        summary = contract.get('summary') if isinstance(contract.get('summary'), dict) else {}
        current_version = summary.get('current_version') if isinstance(summary.get('current_version'), dict) else {}
        durable_contract_available = bool(summary)
        packet_source = 'durable_contract' if durable_contract_available else 'authored'
        execution_requirements = EXECUTION_CONTEXT_REQUIREMENT_OVERRIDES.get(selected_skill_key, {})
        packet = {
            'contract_type': 'skill_packet',
            'contract_version': 'v1',
            'packet_lineage': {
                'packet_source': packet_source,
                'packet_key': f'skill_contract:{selected_skill_key}' if durable_contract_available else None,
                'authored_packet_key': authored_packet.get('packet_key') if isinstance(authored_packet, dict) else None,
                'contract_enrichment': 'live_skill_contract' if isinstance(contract, dict) else 'authored_only',
                'fallback_packet_source': 'authored' if durable_contract_available and authored_packet is not None else None,
            },
            'skill_identity': {
                'skill_key': summary.get('skill_key') or selected_skill_key,
                'name': summary.get('name') or selected_skill_key,
                'skill_category': summary.get('domain_code'),
                'owner_lane': selected_lane_key,
                'status': summary.get('status') or 'authored_packet_only',
                'packet_source': packet_source,
            },
            'when_to_use': {
                'summary': current_version.get('intent_summary') or summary.get('description') or '',
                'trigger_signals': self._build_trigger_signals(selected_skill_key, selected_lane_key),
                'do_not_use_when': [],
            },
            'task_intent': {
                'primary_goal': current_version.get('intent_summary') or summary.get('description') or '',
                'success_definition': self._build_success_definition(current_version.get('validation_policy')),
            },
            'required_inputs': self._build_required_inputs(current_version.get('input_schema')),
            'recommended_context_sources': self._build_recommended_context_sources(selected_lane_key, current_version, governance),
            'execution_context_requirements': execution_requirements,
            'execution_steps': self._build_execution_steps(execution_requirements),
            'implementation_guidance': self._build_implementation_guidance(current_version),
            'reminder_bundle': self._build_skill_reminder_bundle(payload, selected_lane_key),
            'policy_bundle': self._build_policy_bundle(current_version, governance),
            'required_tools': [
                {'tool_key': tool_key, 'purpose': f'Governed tool required by {selected_skill_key}.'}
                for tool_key in current_version.get('allowed_tools', [])
            ],
            'common_failure_modes': self._build_common_failure_modes(governance),
            'expected_outputs': self._build_expected_outputs(current_version.get('output_contract')),
            'workflow_bindings': contract.get('bindings', []),
            'handoff_rule': {
                'policy': 'After this packet is used, continue through bound workflow or operator surfaces instead of carrying ad hoc narrative state forward.',
            },
        }
        if authored_packet is not None:
            for field in (
                'when_to_use',
                'task_intent',
                'required_inputs',
                'recommended_context_sources',
                'execution_context_requirements',
                'execution_steps',
                'common_failure_modes',
                'expected_outputs',
                'handoff_rule',
            ):
                if field in authored_packet:
                    authored_value = authored_packet[field]
                    if isinstance(packet.get(field), dict) and isinstance(authored_value, dict):
                        packet[field] = self._merge_packet_mapping(packet.get(field), authored_value)
                    elif self._is_empty_value(packet.get(field)):
                        packet[field] = authored_value
            packet['policy_bundle'] = self._merge_keyed_entries(
                packet.get('policy_bundle'),
                authored_packet.get('policy_bundle'),
                key_field='policy_key',
            )
        return packet

    def _is_empty_value(self, value: Any) -> bool:
        if value is None:
            return True
        if isinstance(value, str):
            return not value.strip()
        if isinstance(value, (list, tuple, set, dict)):
            return len(value) == 0
        return False

    def _merge_packet_mapping(self, primary: Any, fallback: Any) -> Any:
        if not isinstance(primary, dict):
            return fallback if self._is_empty_value(primary) else primary
        if not isinstance(fallback, dict):
            return primary
        merged = dict(fallback)
        for key, value in primary.items():
            fallback_value = merged.get(key)
            if isinstance(value, dict) and isinstance(fallback_value, dict):
                merged[key] = self._merge_packet_mapping(value, fallback_value)
                continue
            if self._is_empty_value(value) and key in merged:
                continue
            merged[key] = value
        return merged

    def _merge_keyed_entries(
        self,
        preferred_entries: Any,
        fallback_entries: Any,
        *,
        key_field: str,
    ) -> list[dict[str, Any]]:
        merged: list[dict[str, Any]] = []
        seen_keys: set[str] = set()
        for collection in (preferred_entries, fallback_entries):
            if not isinstance(collection, list):
                continue
            for entry in collection:
                if not isinstance(entry, dict):
                    continue
                key = str(entry.get(key_field) or '').strip() or f'entry-{len(merged)}'
                if key in seen_keys:
                    continue
                merged.append(entry)
                seen_keys.add(key)
        return merged

    def _build_global_blockers(self, payload: dict[str, Any]) -> list[str]:
        blockers = payload.get('blockers') if isinstance(payload.get('blockers'), list) else []
        return [
            f"{item.get('blocker_label')}: {item.get('blocker_status')}"
            for item in blockers[:5]
            if isinstance(item, dict) and (item.get('blocker_label') or item.get('blocker_status'))
        ]

    def _build_active_focus_hint(
        self,
        summary: dict[str, Any],
        execution_context_posture: dict[str, Any],
        recommended_lane_key: str | None,
    ) -> str:
        parts = []
        objective = str(summary.get('current_objective') or '').strip()
        if objective:
            parts.append(objective)
        if recommended_lane_key:
            lane_label = MEMORY_LANE_DEFINITIONS.get(recommended_lane_key, {}).get('label')
            if lane_label:
                parts.append(f'recommended lane: {lane_label}')
        posture_status = str(execution_context_posture.get('status') or '').strip()
        if posture_status:
            parts.append(f'execution posture: {posture_status}')
        return ' | '.join(parts) if parts else 'latest repo changes and available governed work lanes'

    def _build_recent_changes(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        changes: list[dict[str, Any]] = []
        blockers = payload.get('blockers') if isinstance(payload.get('blockers'), list) else []
        decisions = payload.get('decisions') if isinstance(payload.get('decisions'), list) else []
        artifacts = payload.get('artifacts') if isinstance(payload.get('artifacts'), list) else []

        for item in blockers[:2]:
            if not isinstance(item, dict):
                continue
            label = str(item.get('blocker_label') or '').strip()
            status = str(item.get('blocker_status') or '').strip()
            if not label:
                continue
            changes.append({
                'change_key': f'blocker:{label.lower().replace(" ", "-")}',
                'title': label,
                'summary': f'Blocker status is {status or "open"}.',
                'importance': 'high' if status in {'failed', 'blocked'} else 'medium',
                'source_ref': 'latest-memory:blockers',
            })

        for item in decisions[:2]:
            if not isinstance(item, dict):
                continue
            gate_key = str(item.get('gate_key') or '').strip()
            band = str(item.get('decision_band') or item.get('decision') or '').strip()
            if not gate_key:
                continue
            changes.append({
                'change_key': f'decision:{gate_key}',
                'title': f'{gate_key} decision',
                'summary': f'Latest decision posture is {band or "recorded"}.',
                'importance': 'high' if band in {'block', 'revise'} else 'medium',
                'source_ref': 'latest-memory:decisions',
            })

        for item in artifacts[:1]:
            if not isinstance(item, dict):
                continue
            title = str(item.get('title') or '').strip()
            artifact_type = str(item.get('artifact_type') or '').strip()
            if not title:
                continue
            changes.append({
                'change_key': f'artifact:{artifact_type or "artifact"}',
                'title': title,
                'summary': f'Latest artifact surfaced as {artifact_type or "artifact"}.',
                'importance': 'medium',
                'source_ref': 'latest-memory:artifacts',
            })

        return changes[:5]

    def _flatten_available_skills(self, lane_catalog: list[dict[str, Any]]) -> list[dict[str, Any]]:
        flattened: dict[str, dict[str, Any]] = {}
        for lane in lane_catalog:
            for skill in lane.get('skills', []):
                if not isinstance(skill, dict):
                    continue
                skill_key = str(skill.get('skill_key') or '').strip()
                if not skill_key or skill_key in flattened:
                    continue
                flattened[skill_key] = {
                    'skill_key': skill_key,
                    'name': skill.get('name'),
                    'one_line_purpose': skill.get('one_line_purpose'),
                    'domain_code': skill.get('domain_code'),
                }
        return list(flattened.values())

    def _build_startup_reminders(self, reminders: list[dict[str, Any]]) -> list[dict[str, Any]]:
        startup_reminders = [
            item for item in reminders
            if isinstance(item, dict) and str(item.get('reminder_tier') or '').strip() == 'startup_critical'
        ]
        if not startup_reminders:
            startup_reminders = [item for item in reminders if isinstance(item, dict)]
        return [
            {
                'reminder_key': item.get('reminder_key'),
                'tier': item.get('reminder_tier'),
                'text': item.get('reminder_text'),
                'source_ref': item.get('source_ref'),
                'source_title': item.get('source_title'),
            }
            for item in startup_reminders[:8]
        ]

    def _build_required_inputs(self, input_schema: Any) -> list[dict[str, Any]]:
        schema = input_schema if isinstance(input_schema, dict) else {}
        properties = schema.get('properties') if isinstance(schema.get('properties'), dict) else {}
        required_keys = {str(item).strip() for item in schema.get('required', []) if str(item).strip()}
        required_inputs: list[dict[str, Any]] = []
        for input_key, details in properties.items():
            description = ''
            if isinstance(details, dict):
                description = str(details.get('description') or '').strip()
            if not description:
                description = f'Provide {str(input_key).replace("_", " ")}.'.capitalize()
            required_inputs.append({
                'input_key': input_key,
                'required': input_key in required_keys,
                'description': description,
            })
        return required_inputs

    def _build_recommended_context_sources(
        self,
        lane_key: str | None,
        current_version: dict[str, Any],
        governance: dict[str, Any],
    ) -> list[dict[str, Any]]:
        sources: list[dict[str, Any]] = [
            {'source_type': 'memory_entrypoint', 'purpose': 'Startup orientation and lane selection.'},
        ]
        if lane_key in {'implementation_planning', 'workflow_execution'}:
            sources.append({'source_type': 'workflow_status', 'purpose': 'Current workflow, roadmap, and operator state.'})
        if lane_key in {'understand_system', 'pattern_inspection'}:
            sources.append({'source_type': 'code_inventory', 'purpose': 'SQL-backed code inventory and relationship posture.'})
        if current_version.get('allowed_tools'):
            sources.append({'source_type': 'skill_contract', 'purpose': 'Allowed tools and IO contract for the selected skill.'})
        if governance:
            sources.append({'source_type': 'skill_governance', 'purpose': 'Policy bindings, anti-pattern bindings, and current review posture.'})
        return sources

    def _build_execution_steps(self, execution_requirements: dict[str, Any]) -> list[dict[str, Any]]:
        preferred_flow = execution_requirements.get('preferred_flow') if isinstance(execution_requirements.get('preferred_flow'), list) else []
        steps: list[dict[str, Any]] = []
        for index, flow_step in enumerate(preferred_flow, start=1):
            steps.append({
                'step_order': index,
                'step_key': str(flow_step),
                'instruction': f'Operate through the {flow_step} execution context before advancing.',
            })
        return steps

    def _build_implementation_guidance(self, current_version: dict[str, Any]) -> list[dict[str, Any]]:
        implementation_policy = current_version.get('implementation_policy') if isinstance(current_version.get('implementation_policy'), dict) else {}
        if not implementation_policy:
            return []
        guidance: list[dict[str, Any]] = []
        ordered_fields = (
            ('governed_path', 'Governed path'),
            ('dry_run_first', 'Dry run first'),
            ('contract_schema', 'Contract schema'),
            ('contract_directory', 'Contract directory'),
            ('runner_script', 'Runner script'),
        )
        for guidance_key, label in ordered_fields:
            value = implementation_policy.get(guidance_key)
            if self._is_empty_value(value):
                continue
            guidance.append({
                'guidance_key': guidance_key,
                'label': label,
                'value': value,
            })
        boolean_policies = (
            ('sql_source_of_truth_required', 'SQL state remains the source of truth during execution.'),
            ('markdown_projection_only', 'Markdown outputs are projections and must not replace SQL truth.'),
            ('allow_bespoke_scripts', 'Bespoke scripts are permitted for this skill.'),
            ('allow_one_off_mutation_paths', 'One-off mutation paths are permitted for this skill.'),
        )
        for guidance_key, description in boolean_policies:
            value = implementation_policy.get(guidance_key)
            if not isinstance(value, bool):
                continue
            guidance.append({
                'guidance_key': guidance_key,
                'label': description,
                'value': 'true' if value else 'false',
            })
        return guidance

    def _build_skill_reminder_bundle(self, payload: dict[str, Any], lane_key: str | None) -> list[dict[str, Any]]:
        reminders = payload.get('reminders') if isinstance(payload.get('reminders'), list) else []
        lane_categories = {
            'implementation_planning': {'roadmap', 'project_chartering', 'governance'},
            'workflow_execution': {'governance', 'tooling'},
            'understand_system': {'governance', 'context-assembly'},
            'pattern_inspection': {'governance', 'tooling'},
            'skill_governance': {'governance', 'tooling'},
            'governance_recovery': {'governance'},
        }
        wanted_categories = lane_categories.get(lane_key or '', {'governance'})
        selected = [
            item for item in reminders
            if isinstance(item, dict) and str(item.get('category') or '').strip() in wanted_categories
        ]
        if not selected:
            selected = [item for item in reminders if isinstance(item, dict)][:3]
        return [
            {
                'reminder_key': item.get('reminder_key'),
                'tier': item.get('reminder_tier'),
                'text': item.get('reminder_text'),
            }
            for item in selected[:4]
        ]

    def _build_policy_bundle(self, current_version: dict[str, Any], governance: dict[str, Any]) -> list[dict[str, Any]]:
        policy_bundle: list[dict[str, Any]] = []
        implementation_policy = current_version.get('implementation_policy') if isinstance(current_version.get('implementation_policy'), dict) else {}
        if implementation_policy:
            policy_bundle.append({
                'policy_key': 'implementation_policy',
                'description': 'Execution constraints carried by the skill contract implementation policy.',
                'details': implementation_policy,
            })
        pattern_contract = current_version.get('pattern_discovery_contract') if isinstance(current_version.get('pattern_discovery_contract'), dict) else {}
        if pattern_contract:
            policy_bundle.append({
                'policy_key': 'pattern_discovery_contract',
                'description': 'Authority ordering and discovery constraints bound to this skill.',
                'details': pattern_contract,
            })

        for binding in (governance.get('policy_bindings') if isinstance(governance.get('policy_bindings'), list) else [])[:4]:
            if not isinstance(binding, dict):
                continue
            policy_bundle.append({
                'policy_key': binding.get('policy_code') or binding.get('policy_rule_id'),
                'description': binding.get('description') or binding.get('notes') or 'Governance policy binding.',
                'enforcement_mode': binding.get('enforcement_mode'),
            })
        for binding in (governance.get('anti_pattern_bindings') if isinstance(governance.get('anti_pattern_bindings'), list) else [])[:3]:
            if not isinstance(binding, dict):
                continue
            policy_bundle.append({
                'policy_key': binding.get('anti_pattern_key') or binding.get('anti_pattern_rule_id'),
                'description': binding.get('title') or binding.get('notes') or 'Anti-pattern enforcement binding.',
                'enforcement_mode': binding.get('enforcement_mode'),
            })
        return policy_bundle

    def _build_common_failure_modes(self, governance: dict[str, Any]) -> list[dict[str, Any]]:
        findings = governance.get('pattern_findings') if isinstance(governance.get('pattern_findings'), list) else []
        failure_modes = [
            {
                'failure_key': item.get('anti_pattern_key') or item.get('pattern_key') or item.get('skill_pattern_finding_id'),
                'description': item.get('summary') or 'Governance finding requires attention.',
                'severity': item.get('severity'),
            }
            for item in findings[:4]
            if isinstance(item, dict)
        ]
        return failure_modes

    def _build_expected_outputs(self, output_contract: Any) -> list[dict[str, Any]]:
        contract = output_contract if isinstance(output_contract, dict) else {}
        outputs = contract.get('returns') if isinstance(contract.get('returns'), list) else []
        return [
            {
                'output_key': item,
                'description': f'Return {str(item).replace("_", " ")}.',
            }
            for item in outputs
        ]

    def _build_success_definition(self, validation_policy: Any) -> list[str]:
        policy = validation_policy if isinstance(validation_policy, dict) else {}
        success_checks = [
            str(key).replace('_', ' ')
            for key, value in policy.items()
            if value is True
        ]
        return success_checks

    def _build_trigger_signals(self, skill_key: str, lane_key: str | None) -> list[str]:
        tokens = [token for token in str(skill_key).split('_') if token]
        if lane_key:
            tokens.extend(str(lane_key).split('_'))
        deduped: list[str] = []
        for token in tokens:
            normalized = str(token).strip()
            if normalized and normalized not in deduped:
                deduped.append(normalized)
        return deduped[:6]


def build_default_latest_memory_projection_service() -> LatestMemoryProjectionService:
    store = SqlWorkflowStore()
    session_governance_store = SessionGovernanceStore(connection_factory=store.connection_factory)
    return LatestMemoryProjectionService(
        store=store,
        execution_contract_store=GovernedExecutionContractStore(),
        session_governance_store=session_governance_store,
        execution_context_service=ExecutionContextService(store=session_governance_store),
        skill_contract_store=SqlSkillContractStore(),
        handoff_store=SqlAgentHandoffStore(),
    )