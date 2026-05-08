from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from orchestration.data_access_runtime.executor import execute_runtime_query
from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation
from orchestration.context_assembly_models import ContextAssemblyContract


@dataclass(frozen=True, slots=True)
class WorkflowStoreContextAssemblyContracts:
    persistence_available: str = 'context_assembly_persistence_available'
    upsert_contract: str = 'context_assembly_contract_upsert'
    latest_projection: str = 'context_assembly_latest_projection'


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


class SqlWorkflowStoreContextAssemblyMixin:
    contracts = WorkflowStoreContextAssemblyContracts()

    def context_assembly_persistence_available(self) -> bool:
        row = _first_row(execute_runtime_query(self.contracts.persistence_available, {}))
        if not row:
            return False
        value = row.get('is_available')
        return bool(value)

    def upsert_context_assembly_contract(
        self,
        *,
        contract: dict[str, Any],
        fragments: list[dict[str, Any]],
        gate_decisions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        if not self.context_assembly_persistence_available():
            raise LookupError('Context assembly persistence tables are not available.')

        context_packet = dict(contract.get('context_packet') or {})
        prompt_assembly = dict(contract.get('prompt_assembly') or {})
        reuse_record = dict(contract.get('context_reuse_record') or {})
        budget_policy = dict(contract.get('budget_policy') or {})
        persistence = dict(contract.get('persistence') or {})
        operator_status = dict(contract.get('operator_status') or {})
        execution_handoff = dict(contract.get('execution_handoff') or {})

        context_packet_id = str(context_packet.get('context_packet_id') or '').strip()
        workflow_run_id = str(context_packet.get('workflow_run_id') or '').strip()
        if not context_packet_id:
            raise ValueError('context_packet.context_packet_id is required.')
        if not workflow_run_id:
            raise ValueError('context_packet.workflow_run_id is required.')

        execute_runtime_mutation(
            self.contracts.upsert_contract,
            {
                'contract': asdict(contract) if hasattr(contract, '__dataclass_fields__') else contract,
                'fragments': fragments,
                'gate_decisions': gate_decisions,
            },
        )
        return self.get_latest_context_assembly_projection(
            workflow_run_id=workflow_run_id,
            step_run_id=context_packet.get('step_run_id'),
        ) or {
            'context_packet': context_packet,
            'prompt_assembly': prompt_assembly,
            'persistence': persistence,
            'operator_status': operator_status,
            'execution_handoff': execution_handoff,
            'context_reuse_record': reuse_record,
            'budget_policy': budget_policy,
            'fragments': fragments,
            'gate_decisions': gate_decisions,
        }

    def get_latest_context_assembly_projection(
        self,
        *,
        workflow_run_id: str,
        step_run_id: str | None = None,
    ) -> dict[str, Any] | None:
        if not self.context_assembly_persistence_available():
            return None
        result = execute_runtime_query(
            self.contracts.latest_projection,
            {
                'workflow_run_id': workflow_run_id,
                'step_run_id': step_run_id,
            },
        )
        if result is None:
            return None
        if isinstance(result, dict) and {'context_packet', 'prompt_assembly', 'persistence', 'operator_status', 'execution_handoff', 'context_reuse_record'}.issubset(result.keys()):
            return result
        row = _first_row(result)
        if not row:
            return None
        context_packet = {
            'context_packet_id': row.get('context_packet_id'),
            'workflow_run_id': row.get('workflow_run_id'),
            'step_run_id': row.get('step_run_id'),
            'agent_session_id': row.get('agent_session_id'),
            'work_request_id': row.get('work_request_id'),
            'contract_version': row.get('contract_version'),
            'assembly_hash': row.get('assembly_hash'),
            'workflow_ref': row.get('workflow_ref_json') or {},
            'objective': row.get('objective_json') or {},
            'integrity': row.get('integrity_json') or {},
            'budgeting': row.get('budgeting_json') or {},
            'created_at': row.get('created_at'),
            'persisted_at': row.get('persisted_at'),
            'updated_at': row.get('updated_at'),
        }
        reuse_record = {
            'context_reuse_record_id': row.get('context_reuse_record_id'),
            'workflow_run_id': row.get('workflow_run_id'),
            'step_run_id': row.get('step_run_id'),
            'context_packet_id': row.get('context_packet_id'),
            'assembly_hash': row.get('reuse_assembly_hash'),
            'reusable_hash': row.get('reusable_hash'),
            'cache_strategy': row.get('cache_strategy'),
            'cache_id': row.get('cache_id'),
            'reuse_status': row.get('reuse_status'),
            'invalidation_reason': row.get('invalidation_reason'),
            'invalidation_reasons': row.get('invalidation_reasons_json') or [],
            'invalidation_rules': row.get('invalidation_rules_json') or [],
            'created_at': row.get('reuse_created_at'),
            'invalidated_at': row.get('invalidated_at'),
        }
        budget_policy = {
            'policyId': row.get('policy_id'),
            'budgetStatus': row.get('budget_status'),
            'totalTokenBudget': row.get('total_token_budget'),
            'totalUsedTokens': row.get('total_used_tokens'),
            'totalRemainingTokens': row.get('total_remaining_tokens'),
            'overflowStrategy': row.get('overflow_strategy'),
            'bucketPolicies': row.get('bucket_policies_json') or {},
            'compressionPlan': row.get('compression_plan_json') or {},
        }
        fragments = [
            {
                'bucketKey': fragment.get('bucket_key'),
                'contextFragmentId': fragment.get('context_fragment_id'),
                'fragmentType': fragment.get('fragment_type'),
                'sourceRef': fragment.get('source_ref'),
                'contentHash': fragment.get('content_hash'),
                'summaryHash': fragment.get('summary_hash'),
                'tokenEstimate': fragment.get('token_estimate'),
                'rank': fragment.get('rank'),
                'freshnessStatus': fragment.get('freshness_status'),
                'lineage': fragment.get('lineage_json') or {},
                'createdAt': fragment.get('created_at'),
            }
            for fragment in _normalize_rows(row.get('fragments'))
        ]
        gate_decisions = [
            {
                'gateKey': gate.get('gate_key'),
                'status': gate.get('gate_status'),
                'rationale': gate.get('rationale'),
                'createdAt': gate.get('created_at'),
            }
            for gate in _normalize_rows(row.get('gate_decisions'))
        ]
        return {
            'context_packet': context_packet,
            'prompt_assembly': row.get('prompt_assembly_json') or {},
            'persistence': row.get('persistence_json') or {},
            'operator_status': row.get('operator_status_json') or {},
            'execution_handoff': row.get('execution_handoff_json') or {},
            'raw_contract': row.get('raw_contract_json') or {},
            'context_reuse_record': reuse_record,
            'budget_policy': budget_policy,
            'fragments': fragments,
            'gate_decisions': gate_decisions,
        }
