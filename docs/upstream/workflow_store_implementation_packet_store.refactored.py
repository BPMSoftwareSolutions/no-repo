from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from typing import Any

from orchestration.data_access_runtime.executor import execute_runtime_query
from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation
from orchestration.implementation_packet_models import (
    ImplementationAcceptanceCheckRecord,
    ImplementationEvidenceLinkRecord,
    ImplementationGateBundleRecord,
    ImplementationGateDecisionRecord,
    ImplementationPacketItemRecord,
    ImplementationPacketRecord,
)


@dataclass(frozen=True, slots=True)
class WorkflowStoreImplementationPacketContracts:
    lookup_packet_by_packet_id: str = 'implementation_packet_lookup_by_packet_id'
    list_packets: str = 'implementation_packets_list'
    packet_items_by_packet_id: str = 'implementation_packet_items_list_by_packet_id'
    item_dependencies_by_packet_id: str = 'implementation_item_dependencies_list_by_packet_id'
    acceptance_checks_by_packet_id: str = 'implementation_acceptance_checks_list_by_packet_id'
    evidence_links_by_packet_id: str = 'implementation_evidence_links_list_by_packet_id'
    gate_bundles_by_packet_id: str = 'implementation_gate_bundles_list_by_packet_id'
    gate_decisions_by_packet_id: str = 'implementation_gate_decisions_list_by_packet_id'
    item_detail_lookup: str = 'implementation_item_packet_lookup_detail'
    item_acceptance_checks: str = 'implementation_item_acceptance_checks_list'
    evidence_links_for_item: str = 'implementation_evidence_links_for_item'
    latest_run_verification_result: str = 'workflow_run_latest_verification_result'
    create_packet: str = 'create_implementation_packet'
    create_item: str = 'create_implementation_packet_item'
    create_acceptance_check: str = 'create_implementation_acceptance_check'
    create_item_dependency: str = 'create_implementation_item_dependency'
    create_gate_bundle: str = 'create_implementation_gate_bundle'
    create_item_domain_transition: str = 'create_implementation_item_domain_transition'


class SqlWorkflowStoreImplementationPacketStoreMixin:
    contracts = WorkflowStoreImplementationPacketContracts()

    @staticmethod
    def _row_value(row: object, key: str) -> object | None:
        if isinstance(row, dict):
            return row.get(key)
        getter = getattr(row, 'get', None)
        if callable(getter):
            try:
                return getter(key)
            except TypeError:
                pass
        return getattr(row, key, None)

    @staticmethod
    def _json_loads(value: object) -> object | None:
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

    @staticmethod
    def _json_load_list(value: object) -> list[object]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        loaded = SqlWorkflowStoreImplementationPacketStoreMixin._json_loads(value)
        return loaded if isinstance(loaded, list) else []

    @staticmethod
    def _normalize_rows(value: object) -> list[object]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, dict):
            rows = value.get('rows')
            return rows if isinstance(rows, list) else [value]
        return [value]

    def import_implementation_packet(
        self,
        *,
        packet_payload: dict[str, object],
        imported_by: str,
    ) -> ImplementationPacketRecord:
        implementation_packet_id = str(uuid.uuid4())
        packet_id = str(packet_payload['packetId'])
        created_by = packet_payload.get('createdBy') if isinstance(packet_payload.get('createdBy'), dict) else {}
        source_model = packet_payload.get('sourceModel') if isinstance(packet_payload.get('sourceModel'), dict) else {}
        lineage = packet_payload.get('lineage') if isinstance(packet_payload.get('lineage'), dict) else {}
        system = packet_payload.get('system') if isinstance(packet_payload.get('system'), dict) else {}
        scope = packet_payload.get('scope') if isinstance(packet_payload.get('scope'), dict) else {}
        governance = packet_payload.get('governance') if isinstance(packet_payload.get('governance'), dict) else {}
        completion_policy = packet_payload.get('completionPolicy') if isinstance(packet_payload.get('completionPolicy'), dict) else {}
        north_star = packet_payload.get('northStar') if isinstance(packet_payload.get('northStar'), dict) else {}

        existing = execute_runtime_query(self.contracts.lookup_packet_by_packet_id, {'packet_id': packet_id})
        if existing:
            existing_packet = self.get_implementation_packet(packet_id)
            if existing_packet is not None:
                return existing_packet

        execute_runtime_mutation(
            self.contracts.create_packet,
            {
                'implementation_packet_id': implementation_packet_id,
                'packet_id': packet_id,
                'packet_type': packet_payload['packetType'],
                'packet_version': packet_payload['packetVersion'],
                'title': packet_payload['title'],
                'status': packet_payload.get('status') or 'draft',
                'system_slug': system.get('slug') or scope.get('productArea'),
                'system_domain': system.get('domain') or scope.get('targetSurface'),
                'parent_packet_id': packet_payload.get('parentPacketId') or lineage.get('parentPacketId'),
                'root_packet_id': packet_payload.get('rootPacketId') or lineage.get('rootPacketId'),
                'created_by_kind': created_by.get('kind') or 'ai_model',
                'created_by_name': created_by.get('name') or source_model.get('producer') or imported_by,
                'imported_by': imported_by,
                'north_star_summary': north_star.get('summary'),
                'scope_json': scope,
                'governance_json': governance,
                'lineage_json': lineage,
                'completion_policy_json': completion_policy,
                'source_payload_json': packet_payload,
            },
        )

        item_ids_by_key: dict[str, str] = {}
        for phase in packet_payload.get('phases', []):
            if not isinstance(phase, dict):
                continue
            phase_key = str(phase['phaseKey'])
            phase_title = str(phase['title'])
            for item in phase.get('items', []):
                if not isinstance(item, dict):
                    continue
                implementation_item_id = str(uuid.uuid4())
                item_key = str(item['itemKey'])
                item_ids_by_key[item_key] = implementation_item_id
                execute_runtime_mutation(
                    self.contracts.create_item,
                    {
                        'implementation_item_id': implementation_item_id,
                        'implementation_packet_id': implementation_packet_id,
                        'phase_key': phase_key,
                        'phase_title': phase_title,
                        'item_key': item_key,
                        'stable_item_key': item.get('stableItemKey') or item_key,
                        'item_type': item.get('type'),
                        'priority': item.get('priority'),
                        'title': item.get('title'),
                        'description': item.get('description'),
                        'status': item.get('status') or 'not_started',
                        'artifacts_expected_json': item.get('artifactsExpected') or [],
                        'origin_domain': item.get('originDomain'),
                        'current_domain': item.get('currentDomain'),
                        'target_domain': item.get('targetDomain'),
                        'domain_status': item.get('domainStatus'),
                        'routing_strategy': item.get('routingStrategy'),
                        'current_owner_type': item.get('currentOwnerType'),
                        'current_owner_id': item.get('currentOwnerId'),
                        'status_reason': None,
                        'updated_by': imported_by,
                    },
                )
                for index, check in enumerate(item.get('acceptanceChecks', []), start=1):
                    acceptance_check_id = str(uuid.uuid4())
                    check_payload = check if isinstance(check, dict) else {'text': str(check), 'status': 'not_run'}
                    execute_runtime_mutation(
                        self.contracts.create_acceptance_check,
                        {
                            'acceptance_check_id': acceptance_check_id,
                            'implementation_item_id': implementation_item_id,
                            'sort_order': index,
                            'check_text': check_payload.get('text'),
                            'status': check_payload.get('status') or 'not_run',
                        },
                    )

        for phase in packet_payload.get('phases', []):
            if not isinstance(phase, dict):
                continue
            for item in phase.get('items', []):
                if not isinstance(item, dict):
                    continue
                implementation_item_id = item_ids_by_key[str(item['itemKey'])]
                for depends_on_key in item.get('dependsOn', []):
                    execute_runtime_mutation(
                        self.contracts.create_item_dependency,
                        {
                            'implementation_item_dependency_id': str(uuid.uuid4()),
                            'implementation_item_id': implementation_item_id,
                            'depends_on_item_key': depends_on_key,
                            'depends_on_implementation_item_id': item_ids_by_key.get(str(depends_on_key)),
                        },
                    )

        for gate_type in governance.get('requiredGates', []):
            execute_runtime_mutation(
                self.contracts.create_gate_bundle,
                {
                    'implementation_gate_bundle_id': str(uuid.uuid4()),
                    'implementation_packet_id': implementation_packet_id,
                    'gate_type': gate_type,
                    'status': 'not_started',
                    'summary_json': {'gate_type': gate_type, 'source_packet_id': packet_id},
                    'evidence_manifest_json': {'evidence_refs': [], 'remediation_actions': []},
                },
            )

        for phase in packet_payload.get('phases', []):
            if not isinstance(phase, dict):
                continue
            for item in phase.get('items', []):
                if not isinstance(item, dict):
                    continue
                implementation_item_id = item_ids_by_key[str(item['itemKey'])]
                execute_runtime_mutation(
                    self.contracts.create_item_domain_transition,
                    {
                        'implementation_item_domain_transition_id': str(uuid.uuid4()),
                        'implementation_item_id': implementation_item_id,
                        'implementation_packet_id': implementation_packet_id,
                        'workflow_run_id': None,
                        'from_domain': None,
                        'to_domain': item.get('currentDomain') or item.get('targetDomain') or item.get('originDomain') or 'unassigned',
                        'from_domain_status': None,
                        'to_domain_status': item.get('domainStatus') or 'accepted',
                        'transition_reason': 'Initial routing state recorded during implementation packet import.',
                        'triggered_by': imported_by,
                        'routing_strategy': item.get('routingStrategy') or 'manual',
                        'current_owner_type': item.get('currentOwnerType'),
                        'current_owner_id': item.get('currentOwnerId'),
                    },
                )

        packet = self.get_implementation_packet(packet_id)
        if packet is None:
            raise RuntimeError('Implementation packet import did not persist.')
        return packet

    def list_implementation_packets(
        self,
        *,
        status: str | None = None,
        packet_type: str | None = None,
    ) -> list[ImplementationPacketRecord]:
        rows = self._normalize_rows(
            execute_runtime_query(
                self.contracts.list_packets,
                {
                    'has_status': 1 if status is not None else 0,
                    'status': status,
                    'has_packet_type': 1 if packet_type is not None else 0,
                    'packet_type': packet_type,
                },
            )
        )
        return [self._implementation_packet_summary_from_row(row) for row in rows]

    def get_implementation_packet(self, packet_id: str) -> ImplementationPacketRecord | None:
        packet_row = execute_runtime_query(self.contracts.lookup_packet_by_packet_id, {'packet_id': packet_id})
        if packet_row is None:
            return None

        implementation_packet_id = str(self._row_value(packet_row, 'implementation_packet_id'))
        item_rows = self._normalize_rows(
            execute_runtime_query(self.contracts.packet_items_by_packet_id, {'implementation_packet_id': implementation_packet_id})
        )
        dependency_rows = self._normalize_rows(
            execute_runtime_query(self.contracts.item_dependencies_by_packet_id, {'implementation_packet_id': implementation_packet_id})
        )
        check_rows = self._normalize_rows(
            execute_runtime_query(self.contracts.acceptance_checks_by_packet_id, {'implementation_packet_id': implementation_packet_id})
        )
        evidence_rows = self._normalize_rows(
            execute_runtime_query(self.contracts.evidence_links_by_packet_id, {'implementation_packet_id': implementation_packet_id})
        )
        bundle_rows = self._normalize_rows(
            execute_runtime_query(self.contracts.gate_bundles_by_packet_id, {'implementation_packet_id': implementation_packet_id})
        )
        decision_rows = self._normalize_rows(
            execute_runtime_query(self.contracts.gate_decisions_by_packet_id, {'implementation_packet_id': implementation_packet_id})
        )

        dependencies_by_item_id: dict[str, list[str]] = {}
        for row in dependency_rows:
            implementation_item_id = str(self._row_value(row, 'implementation_item_id'))
            depends_on_item_key = str(self._row_value(row, 'depends_on_item_key'))
            dependencies_by_item_id.setdefault(implementation_item_id, []).append(depends_on_item_key)

        checks_by_item_id: dict[str, list[ImplementationAcceptanceCheckRecord]] = {}
        for row in check_rows:
            check = self._implementation_acceptance_check_from_row(row)
            checks_by_item_id.setdefault(check.implementation_item_id, []).append(check)

        evidence_links = [self._implementation_evidence_link_from_row(row) for row in evidence_rows]
        evidence_by_item_id: dict[str, list[ImplementationEvidenceLinkRecord]] = {}
        for evidence in evidence_links:
            if evidence.implementation_item_id is not None:
                evidence_by_item_id.setdefault(evidence.implementation_item_id, []).append(evidence)

        items: list[ImplementationPacketItemRecord] = []
        for row in item_rows:
            item = self._implementation_packet_item_from_row(row)
            item.depends_on = dependencies_by_item_id.get(item.implementation_item_id, [])
            item.acceptance_checks = checks_by_item_id.get(item.implementation_item_id, [])
            item.evidence_links = evidence_by_item_id.get(item.implementation_item_id, [])
            items.append(item)

        decisions_by_bundle_id: dict[str, list[ImplementationGateDecisionRecord]] = {}
        for row in decision_rows:
            decision = self._implementation_gate_decision_from_row(row)
            decisions_by_bundle_id.setdefault(decision.implementation_gate_bundle_id, []).append(decision)

        bundles: list[ImplementationGateBundleRecord] = []
        for row in bundle_rows:
            bundle = self._implementation_gate_bundle_from_row(row)
            bundle.decisions = decisions_by_bundle_id.get(bundle.implementation_gate_bundle_id, [])
            bundles.append(bundle)

        packet = self._implementation_packet_summary_from_row(packet_row)
        packet.items = items
        packet.gate_bundles = bundles
        packet.evidence_links = evidence_links
        return packet

    def get_implementation_item_acceptance_checks(self, implementation_item_id: str) -> dict[str, object] | None:
        item_row = execute_runtime_query(
            self.contracts.item_detail_lookup,
            {'implementation_item_id': implementation_item_id},
        )
        if item_row is None:
            return None
        check_rows = self._normalize_rows(
            execute_runtime_query(self.contracts.item_acceptance_checks, {'implementation_item_id': implementation_item_id})
        )
        checks = [self._implementation_acceptance_check_from_row(row) for row in check_rows]
        return {
            'implementation_item_id': str(self._row_value(item_row, 'implementation_item_id')),
            'implementation_packet_id': str(self._row_value(item_row, 'implementation_packet_id')),
            'packet_id': str(self._row_value(item_row, 'packet_id')),
            'item_key': str(self._row_value(item_row, 'item_key')),
            'acceptance_check_count': int(len(checks)),
            'acceptance_checks': [
                {
                    'acceptance_check_id': check.acceptance_check_id,
                    'acceptance_check_text': check.check_text,
                    'status': check.status,
                    'provenance': {
                        'table': 'decisioning.implementation_acceptance_checks',
                        'item_id': check.implementation_item_id,
                    },
                }
                for check in checks
            ],
        }

    def list_implementation_evidence_links_for_item(self, implementation_item_id: str) -> list[dict[str, object]]:
        rows = self._normalize_rows(
            execute_runtime_query(self.contracts.evidence_links_for_item, {'implementation_item_id': implementation_item_id})
        )
        return [
            {
                'evidence_link_id': link.evidence_link_id,
                'implementation_packet_id': link.implementation_packet_id,
                'implementation_item_id': link.implementation_item_id,
                'acceptance_check_id': link.acceptance_check_id,
                'evidence_type': link.evidence_type,
                'evidence_ref': link.evidence_ref,
                'title': link.title,
                'metadata': link.metadata,
                'recorded_by': link.recorded_by,
                'created_at': link.created_at,
            }
            for link in [self._implementation_evidence_link_from_row(row) for row in rows]
        ]

    def get_latest_run_verification_result(self, workflow_run_id: str) -> dict[str, object] | None:
        row = execute_runtime_query(self.contracts.latest_run_verification_result, {'workflow_run_id': workflow_run_id})
        if row is None:
            return None
        return {
            'run_verification_result_id': str(self._row_value(row, 'run_verification_result_id')),
            'workflow_run_id': str(self._row_value(row, 'workflow_run_id')),
            'verification_status': str(self._row_value(row, 'verification_status')),
            'verification_checks': self._json_loads(self._row_value(row, 'verification_checks_json')) or [],
            'verification_artifact_refs': self._json_loads(self._row_value(row, 'verification_artifact_refs_json')) or [],
            'verified_by': self._row_value(row, 'verified_by'),
            'verified_at': self._row_value(row, 'verified_at').isoformat() if self._row_value(row, 'verified_at') else None,
        }

    def _implementation_packet_summary_from_row(self, row: object) -> ImplementationPacketRecord:
        return ImplementationPacketRecord(
            implementation_packet_id=str(self._row_value(row, 'implementation_packet_id')),
            packet_id=str(self._row_value(row, 'packet_id')),
            packet_type=str(self._row_value(row, 'packet_type')),
            packet_version=str(self._row_value(row, 'packet_version')),
            title=str(self._row_value(row, 'title')),
            status=str(self._row_value(row, 'status')),
            system_slug=self._row_value(row, 'system_slug'),
            system_domain=self._row_value(row, 'system_domain'),
            parent_packet_id=self._row_value(row, 'parent_packet_id'),
            root_packet_id=self._row_value(row, 'root_packet_id'),
            created_by_kind=self._row_value(row, 'created_by_kind'),
            created_by_name=self._row_value(row, 'created_by_name'),
            north_star_summary=self._row_value(row, 'north_star_summary'),
            scope=self._json_loads(self._row_value(row, 'scope_json')) or {},
            governance=self._json_loads(self._row_value(row, 'governance_json')) or {},
            lineage=self._json_loads(self._row_value(row, 'lineage_json')) or {},
            completion_policy=self._json_loads(self._row_value(row, 'completion_policy_json')) or {},
            source_payload=self._json_loads(self._row_value(row, 'source_payload_json')) or {},
            items=[],
            gate_bundles=[],
            evidence_links=[],
        )

    def _implementation_packet_item_from_row(self, row: object) -> ImplementationPacketItemRecord:
        return ImplementationPacketItemRecord(
            implementation_item_id=str(self._row_value(row, 'implementation_item_id')),
            implementation_packet_id=str(self._row_value(row, 'implementation_packet_id')),
            phase_key=str(self._row_value(row, 'phase_key')),
            phase_title=str(self._row_value(row, 'phase_title')),
            item_key=str(self._row_value(row, 'item_key')),
            stable_item_key=str(self._row_value(row, 'stable_item_key')),
            item_type=self._row_value(row, 'item_type'),
            priority=self._row_value(row, 'priority'),
            title=self._row_value(row, 'title'),
            description=self._row_value(row, 'description'),
            status=self._row_value(row, 'status'),
            origin_domain=self._row_value(row, 'origin_domain'),
            current_domain=self._row_value(row, 'current_domain'),
            target_domain=self._row_value(row, 'target_domain'),
            domain_status=self._row_value(row, 'domain_status'),
            routing_strategy=self._row_value(row, 'routing_strategy'),
            current_owner_type=self._row_value(row, 'current_owner_type'),
            current_owner_id=self._row_value(row, 'current_owner_id'),
            status_reason=self._row_value(row, 'status_reason'),
            artifacts_expected=self._json_loads(self._row_value(row, 'artifacts_expected_json')) or [],
            created_at=self._row_value(row, 'created_at').isoformat() if self._row_value(row, 'created_at') else None,
            updated_at=self._row_value(row, 'updated_at').isoformat() if self._row_value(row, 'updated_at') else None,
            depends_on=[],
            acceptance_checks=[],
            evidence_links=[],
        )

    def _implementation_acceptance_check_from_row(self, row: object) -> ImplementationAcceptanceCheckRecord:
        return ImplementationAcceptanceCheckRecord(
            acceptance_check_id=str(self._row_value(row, 'acceptance_check_id')),
            implementation_item_id=str(self._row_value(row, 'implementation_item_id')),
            sort_order=int(self._row_value(row, 'sort_order') or 0),
            check_text=str(self._row_value(row, 'check_text')),
            status=str(self._row_value(row, 'status')),
            created_at=self._row_value(row, 'created_at').isoformat() if self._row_value(row, 'created_at') else None,
            updated_at=self._row_value(row, 'updated_at').isoformat() if self._row_value(row, 'updated_at') else None,
        )

    def _implementation_evidence_link_from_row(self, row: object) -> ImplementationEvidenceLinkRecord:
        return ImplementationEvidenceLinkRecord(
            evidence_link_id=str(self._row_value(row, 'evidence_link_id')),
            implementation_packet_id=str(self._row_value(row, 'implementation_packet_id')),
            implementation_item_id=self._row_value(row, 'implementation_item_id'),
            acceptance_check_id=self._row_value(row, 'acceptance_check_id'),
            evidence_type=str(self._row_value(row, 'evidence_type')),
            evidence_ref=str(self._row_value(row, 'evidence_ref')),
            title=self._row_value(row, 'title'),
            metadata=self._json_loads(self._row_value(row, 'metadata_json')) or {},
            recorded_by=self._row_value(row, 'recorded_by'),
            created_at=self._row_value(row, 'created_at').isoformat() if self._row_value(row, 'created_at') else None,
        )

    def _implementation_gate_bundle_from_row(self, row: object) -> ImplementationGateBundleRecord:
        return ImplementationGateBundleRecord(
            implementation_gate_bundle_id=str(self._row_value(row, 'implementation_gate_bundle_id')),
            implementation_packet_id=str(self._row_value(row, 'implementation_packet_id')),
            gate_type=str(self._row_value(row, 'gate_type')),
            status=str(self._row_value(row, 'status')),
            summary=self._json_loads(self._row_value(row, 'summary_json')) or {},
            evidence_manifest=self._json_loads(self._row_value(row, 'evidence_manifest_json')) or {},
            created_at=self._row_value(row, 'created_at').isoformat() if self._row_value(row, 'created_at') else None,
            updated_at=self._row_value(row, 'updated_at').isoformat() if self._row_value(row, 'updated_at') else None,
            decisions=[],
        )

    def _implementation_gate_decision_from_row(self, row: object) -> ImplementationGateDecisionRecord:
        return ImplementationGateDecisionRecord(
            implementation_gate_decision_id=str(self._row_value(row, 'implementation_gate_decision_id')),
            implementation_gate_bundle_id=str(self._row_value(row, 'implementation_gate_bundle_id')),
            decision=str(self._row_value(row, 'decision')),
            rationale=self._row_value(row, 'rationale'),
            evidence_refs=self._json_load_list(self._row_value(row, 'evidence_refs_json')),
            remediation_actions=self._json_load_list(self._row_value(row, 'remediation_actions_json')),
            decided_by=self._row_value(row, 'decided_by'),
            decided_at=self._row_value(row, 'decided_at').isoformat() if self._row_value(row, 'decided_at') else None,
        )
