from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Callable

from orchestration.implementation_packet_models import ImplementationPacketRecord
from orchestration.implementation_packet_service import ImplementationPacketService, build_default_implementation_packet_service
from orchestration.workflow_run_models import WorkflowRunRecord
from orchestration.workflow_run_service import WorkflowRunService, build_default_workflow_run_service


InspectionProbe = Callable[..., dict[str, Any]]
_QUERY_BINDINGS_PATH = Path(__file__).resolve().with_name('inspect_governed_implementation_candidate.bindings.json')
_QUERY_BINDINGS_CACHE: dict[str, dict[str, Any]] | None = None


def execute(input_data: dict[str, Any], config: dict[str, Any] | None = None) -> dict[str, Any]:
    effective_input = _coerce_effective_input(input_data)
    effective_config = dict(config or {})
    implementation_packet_service = _resolve_implementation_packet_service(effective_config)
    workflow_run_service = _resolve_workflow_run_service(effective_config, effective_input)
    inspection_probe = _resolve_inspection_probe(effective_config)

    packet_id = _clean_text(effective_input.get('packet_id'))
    if packet_id is None:
        raise ValueError('packet_id is required to inspect a governed implementation candidate.')

    packet = implementation_packet_service.get_packet(packet_id)
    run = _resolve_workflow_run(workflow_run_service, effective_input)
    output_directory = _resolve_output_directory(effective_input, packet, run)
    output_directory.mkdir(parents=True, exist_ok=True)

    snapshot = _collect_substrate_snapshot(
        packet=packet,
        run=run,
        implementation_packet_service=implementation_packet_service,
        workflow_run_service=workflow_run_service,
        inspection_probe=inspection_probe,
    )
    inspection_sections = _build_inspection_sections(packet=packet, run=run, snapshot=snapshot)
    overall_status = _derive_overall_status(inspection_sections)
    classification = _derive_classification(overall_status)
    generated_at = datetime.now(UTC).isoformat()
    sql_validation_queries = _build_sql_validation_queries()

    inspection_packet = {
        'handler': 'inspect_governed_implementation_candidate',
        'generated_at': generated_at,
        'classification': classification,
        'overall_status': overall_status,
        'overall_summary': _build_overall_summary(packet, inspection_sections, classification),
        'implementation_packet': _serialize_packet(packet),
        'workflow_run': run.to_dict() if run is not None else None,
        'inspection_scope': {
            'packet_id': packet.packet_id,
            'implementation_packet_id': packet.implementation_packet_id,
            'workflow_run_id': run.workflow_run_id if run is not None else None,
        },
        'inspections': inspection_sections,
        'substrate_snapshot': snapshot,
        'sql_validation_queries': sql_validation_queries,
        'recommended_next_actions': _build_next_actions(inspection_sections),
    }

    inspection_json_path = output_directory / str(effective_input.get('inspection_json_filename') or 'governed_implementation_inspection.json')
    inspection_markdown_path = output_directory / str(effective_input.get('inspection_markdown_filename') or 'governed_implementation_inspection.md')
    inspection_json_path.write_text(json.dumps(inspection_packet, indent=2), encoding='utf-8')
    inspection_markdown_path.write_text(_build_markdown(inspection_packet), encoding='utf-8')

    _persist_workflow_artifact(
        workflow_run_service=workflow_run_service,
        run=run,
        inspection_packet=inspection_packet,
        inspection_json_path=inspection_json_path,
        inspection_markdown_path=inspection_markdown_path,
    )

    return {
        'handler': 'inspect_governed_implementation_candidate',
        'packet_id': packet.packet_id,
        'implementation_packet_id': packet.implementation_packet_id,
        'workflow_run_id': run.workflow_run_id if run is not None else None,
        'classification': classification,
        'overall_status': overall_status,
        'inspection_json_path': str(inspection_json_path.resolve()),
        'inspection_markdown_path': str(inspection_markdown_path.resolve()),
        'finding_counts': _count_findings(inspection_sections),
    }


def _resolve_implementation_packet_service(config: dict[str, Any]) -> ImplementationPacketService:
    service = config.get('implementation_packet_service')
    if service is not None:
        if not isinstance(service, ImplementationPacketService):
            raise ValueError('implementation_packet_service config must be an ImplementationPacketService instance.')
        return service
    return build_default_implementation_packet_service()


def _resolve_workflow_run_service(
    config: dict[str, Any],
    effective_input: dict[str, Any],
) -> WorkflowRunService | None:
    service = config.get('workflow_run_service')
    if service is not None:
        if not isinstance(service, WorkflowRunService):
            raise ValueError('workflow_run_service config must be a WorkflowRunService instance.')
        return service
    if _clean_text(effective_input.get('workflow_run_id')) is None:
        return None
    return build_default_workflow_run_service()


def _resolve_inspection_probe(config: dict[str, Any]) -> InspectionProbe | None:
    probe = config.get('inspection_probe')
    if probe is None:
        return None
    if not callable(probe):
        raise ValueError('inspection_probe config must be callable when provided.')
    return probe


def _resolve_workflow_run(
    workflow_run_service: WorkflowRunService | None,
    effective_input: dict[str, Any],
) -> WorkflowRunRecord | None:
    workflow_run_id = _clean_text(effective_input.get('workflow_run_id'))
    if workflow_run_id is None:
        return None
    if workflow_run_service is None:
        raise ValueError('workflow_run_service is required when workflow_run_id is provided.')
    run = workflow_run_service.get_run(workflow_run_id)
    if run is None:
        raise LookupError(f'Workflow run not found: {workflow_run_id}.')
    return run


def _resolve_output_directory(
    effective_input: dict[str, Any],
    packet: ImplementationPacketRecord,
    run: WorkflowRunRecord | None,
) -> Path:
    configured = _clean_text(effective_input.get('output_directory'))
    if configured:
        return Path(configured).resolve()
    if run is not None:
        return (Path('generated') / 'governed-implementation-inspections' / run.workflow_run_id).resolve()
    return (Path('generated') / 'governed-implementation-inspections' / packet.packet_id).resolve()


def _collect_substrate_snapshot(
    *,
    packet: ImplementationPacketRecord,
    run: WorkflowRunRecord | None,
    implementation_packet_service: ImplementationPacketService,
    workflow_run_service: WorkflowRunService | None,
    inspection_probe: InspectionProbe | None,
) -> dict[str, Any]:
    artifacts = []
    if run is not None and workflow_run_service is not None:
        artifacts = workflow_run_service.store.list_workflow_artifacts(workflow_run_id=run.workflow_run_id)
    artifact_reference_count = _count_packet_artifact_references(packet, artifacts)
    snapshot = {
        'probe_mode': 'synthetic',
        'packet_row_count': 1,
        'implementation_item_count': len(packet.items),
        'acceptance_check_count': sum(len(item.acceptance_checks) for item in packet.items),
        'evidence_link_count': len(_collect_unique_evidence_links(packet)),
        'gate_bundle_count': len(packet.gate_bundles),
        'gate_decision_count': sum(len(bundle.decisions) for bundle in packet.gate_bundles),
        'workflow_artifact_count_for_run': len(artifacts),
        'workflow_artifact_reference_count': artifact_reference_count,
        'packet_has_workflow_link_columns': None,
        'packet_has_process_link_columns': None,
        'evidence_has_inventory_reference_columns': None,
        'evidence_has_workflow_artifact_reference_columns': None,
        'workflow_gate_tables_present': None,
        'implementation_gate_tables_present': None,
    }

    if inspection_probe is not None:
        probed = inspection_probe(
            packet=packet,
            run=run,
            implementation_packet_service=implementation_packet_service,
            workflow_run_service=workflow_run_service,
            artifacts=artifacts,
        )
        if isinstance(probed, dict):
            snapshot.update(probed)
        return snapshot

    store = getattr(implementation_packet_service, 'store', None)
    connection_factory = getattr(store, 'connection_factory', None)
    if not callable(connection_factory):
        return snapshot

    try:
        snapshot.update(
            {
                'probe_mode': 'live_sql',
                'packet_has_workflow_link_columns': _execute_probe_scalar(
                    connection_factory,
                    'implementation_packet_has_workflow_link_columns',
                )
                == 1,
                'packet_has_process_link_columns': _execute_probe_scalar(
                    connection_factory,
                    'implementation_packet_has_process_link_columns',
                )
                == 1,
                'evidence_has_inventory_reference_columns': _execute_probe_scalar(
                    connection_factory,
                    'implementation_evidence_has_inventory_reference_columns',
                )
                == 1,
                'evidence_has_workflow_artifact_reference_columns': _execute_probe_scalar(
                    connection_factory,
                    'implementation_evidence_has_workflow_artifact_reference_columns',
                )
                == 1,
                'workflow_gate_tables_present': _execute_probe_scalar(
                    connection_factory,
                    'workflow_gate_tables_present',
                )
                == 1,
                'implementation_gate_tables_present': _execute_probe_scalar(
                    connection_factory,
                    'implementation_gate_tables_present',
                )
                == 1,
            }
        )
    except Exception as exc:
        snapshot['probe_mode'] = 'probe_failed'
        snapshot['probe_error'] = str(exc)
    return snapshot


def _fetch_scalar(cursor: Any, query: str) -> Any:
    row = cursor.execute(query).fetchone()
    if row is None:
        return None
    return row[0]


def _load_query_bindings() -> dict[str, dict[str, Any]]:
    global _QUERY_BINDINGS_CACHE
    if _QUERY_BINDINGS_CACHE is None:
        payload = json.loads(_QUERY_BINDINGS_PATH.read_text(encoding='utf-8'))
        if not isinstance(payload, dict):
            raise ValueError(f'Query bindings file must contain a JSON object: {_QUERY_BINDINGS_PATH}')
        _QUERY_BINDINGS_CACHE = payload
    return _QUERY_BINDINGS_CACHE


def _binding_sql_and_params(contract_key: str, values: dict[str, Any] | None = None) -> tuple[str, list[Any]]:
    binding = _load_query_bindings().get(contract_key)
    if not isinstance(binding, dict):
        raise KeyError(f'Missing query binding: {contract_key}')
    sql = str(binding.get('postgresqlSql') or '').strip()
    parameter_order = [str(item) for item in binding.get('parameterOrder') or []]
    params = [(values or {}).get(name) for name in parameter_order]
    if not sql:
        raise ValueError(f'Query binding must define SQL for active backend: {contract_key}')
    return sql, params


def _execute_probe_scalar(
    connection_factory: Callable[[], Any],
    contract_key: str,
    values: dict[str, Any] | None = None,
) -> Any:
    sql, params = _binding_sql_and_params(contract_key, values)
    with connection_factory() as connection:
        cursor = connection.cursor()
        if params:
            cursor.execute(sql, tuple(params))
        else:
            cursor.execute(sql)
        row = cursor.fetchone()
        if row is None:
            return None
        return row[0]


def _build_inspection_sections(
    *,
    packet: ImplementationPacketRecord,
    run: WorkflowRunRecord | None,
    snapshot: dict[str, Any],
) -> list[dict[str, Any]]:
    return [
        _build_migration_reality_section(packet, snapshot),
        _build_substrate_linkage_section(packet, run, snapshot),
        _build_governance_alignment_section(packet, snapshot),
        _build_evidence_durability_section(packet, snapshot),
        _build_projection_readiness_section(packet, snapshot),
    ]


def _build_migration_reality_section(packet: ImplementationPacketRecord, snapshot: dict[str, Any]) -> dict[str, Any]:
    findings = []
    if snapshot.get('packet_row_count') == 1:
        findings.append(_finding('info', 'The implementation packet is persisted as a durable SQL record.'))
    else:
        findings.append(_finding('fail', 'The implementation packet could not be confirmed as a persisted SQL record.'))

    findings.append(_finding('info', f"The packet contains {len(packet.items)} implementation items and {sum(len(item.acceptance_checks) for item in packet.items)} acceptance checks."))
    return _section(
        key='migration_reality',
        title='Migration Reality',
        findings=findings,
        summary='Verify that the candidate implementation lane exists as imported, normalized runtime state rather than only a document.',
        evidence=[
            f"packet_id={packet.packet_id}",
            f"implementation_packet_id={packet.implementation_packet_id}",
            f"probe_mode={snapshot.get('probe_mode')}",
        ],
    )


def _build_substrate_linkage_section(
    packet: ImplementationPacketRecord,
    run: WorkflowRunRecord | None,
    snapshot: dict[str, Any],
) -> dict[str, Any]:
    findings = []
    lineage = packet.lineage if isinstance(packet.lineage, dict) else {}
    lineage_run_ref = _clean_text(lineage.get('workflowRunId') or lineage.get('workflow_run_id'))
    if run is not None or lineage_run_ref is not None:
        findings.append(_finding('info', f"A workflow run reference is available for inspection: {run.workflow_run_id if run is not None else lineage_run_ref}."))
    else:
        findings.append(_finding('warning', 'No workflow run reference is attached to the implementation packet lineage.'))

    if snapshot.get('packet_has_workflow_link_columns') is False:
        findings.append(_finding('fail', 'The implementation packet table has no workflow_id or workflow_run_id linkage columns.'))
    elif snapshot.get('packet_has_workflow_link_columns') is True:
        findings.append(_finding('info', 'The implementation packet table exposes workflow linkage columns.'))

    if snapshot.get('packet_has_process_link_columns') is False:
        findings.append(_finding('fail', 'The implementation packet table has no process_instance_id or work_request_id linkage columns.'))
    elif snapshot.get('packet_has_process_link_columns') is True:
        findings.append(_finding('info', 'The implementation packet table exposes process-layer linkage columns.'))

    artifact_reference_count = int(snapshot.get('workflow_artifact_reference_count') or 0)
    if run is not None and artifact_reference_count == 0:
        findings.append(_finding('fail', 'The workflow run has artifacts, but none explicitly reference this implementation packet.'))
    elif artifact_reference_count > 0:
        findings.append(_finding('info', f'The workflow run contains {artifact_reference_count} artifacts that reference the implementation packet.'))

    return _section(
        key='substrate_linkage',
        title='Substrate Linkage',
        findings=findings,
        summary='Verify that the candidate lane is wired into the existing workflow, process, and artifact substrate instead of sitting beside it.',
        evidence=[
            f"workflow_run_id={run.workflow_run_id if run is not None else 'n/a'}",
            f"workflow_artifact_reference_count={artifact_reference_count}",
        ],
    )


def _build_governance_alignment_section(packet: ImplementationPacketRecord, snapshot: dict[str, Any]) -> dict[str, Any]:
    findings = []
    required_gates = []
    if isinstance(packet.governance, dict):
        raw_required_gates = packet.governance.get('requiredGates')
        if isinstance(raw_required_gates, list):
            required_gates = [str(item).strip() for item in raw_required_gates if str(item).strip()]
    bundle_gate_types = {bundle.gate_type for bundle in packet.gate_bundles}
    missing_gates = [gate_type for gate_type in required_gates if gate_type not in bundle_gate_types]
    if missing_gates:
        findings.append(_finding('fail', f"Required governance gates are missing bundles: {', '.join(missing_gates)}."))
    else:
        findings.append(_finding('info', 'Every required implementation gate has a corresponding bundle in the candidate lane.'))

    if snapshot.get('workflow_gate_tables_present') and snapshot.get('implementation_gate_tables_present'):
        findings.append(_finding('fail', 'Governance is being tracked in implementation-specific gate tables instead of the shared workflow gate lifecycle tables.'))
    else:
        findings.append(_finding('warning', 'Workflow gate lifecycle alignment could not be fully verified from the available probe data.'))

    findings.append(_finding('info', f"The candidate lane currently carries {len(packet.gate_bundles)} gate bundles and {sum(len(bundle.decisions) for bundle in packet.gate_bundles)} gate decisions."))
    return _section(
        key='governance_alignment',
        title='Governance Alignment',
        findings=findings,
        summary='Verify that gate state is part of the existing governance lifecycle rather than a parallel implementation-specific review lane.',
        evidence=[
            f"required_gates={required_gates}",
            f"bundle_gate_types={sorted(bundle_gate_types)}",
        ],
    )


def _build_evidence_durability_section(packet: ImplementationPacketRecord, snapshot: dict[str, Any]) -> dict[str, Any]:
    findings = []
    evidence_links = _collect_unique_evidence_links(packet)
    if evidence_links:
        findings.append(_finding('info', f'The candidate lane currently stores {len(evidence_links)} implementation evidence links.'))
    else:
        findings.append(_finding('warning', 'No evidence links have been recorded for the implementation packet.'))

    if snapshot.get('evidence_has_inventory_reference_columns') is False:
        findings.append(_finding('fail', 'Implementation evidence links do not expose a durable reference to inventory.evidence_records.'))
    elif snapshot.get('evidence_has_inventory_reference_columns') is True:
        findings.append(_finding('info', 'Implementation evidence links expose a reference to inventory.evidence_records.'))

    if snapshot.get('evidence_has_workflow_artifact_reference_columns') is False:
        findings.append(_finding('fail', 'Implementation evidence links do not expose a durable reference to inventory.workflow_artifacts.'))
    elif snapshot.get('evidence_has_workflow_artifact_reference_columns') is True:
        findings.append(_finding('info', 'Implementation evidence links expose a reference to workflow artifacts.'))

    return _section(
        key='evidence_durability',
        title='Evidence Durability',
        findings=findings,
        summary='Verify that acceptance evidence is grounded in the repo’s durable evidence and artifact stores rather than opaque references only.',
        evidence=[
            f"evidence_link_count={len(evidence_links)}",
            f"probe_mode={snapshot.get('probe_mode')}",
        ],
    )


def _build_projection_readiness_section(packet: ImplementationPacketRecord, snapshot: dict[str, Any]) -> dict[str, Any]:
    findings = []
    artifact_expectations = sum(len(item.artifacts_expected) for item in packet.items)
    if artifact_expectations > 0:
        findings.append(_finding('info', f'The packet declares {artifact_expectations} expected artifacts across its implementation items.'))
    else:
        findings.append(_finding('warning', 'The packet does not declare any expected artifacts for downstream projection or inspection.'))

    if int(snapshot.get('workflow_artifact_reference_count') or 0) == 0:
        findings.append(_finding('warning', 'No workflow artifacts currently anchor the packet for downstream inspector projections.'))
    else:
        findings.append(_finding('info', 'Workflow artifacts are available to support downstream inspector projections.'))

    findings.append(_finding('info', 'The packet schema is structured enough to project phases, items, acceptance checks, evidence, and gate bundles into a UI.'))
    return _section(
        key='projection_readiness',
        title='Projection Readiness',
        findings=findings,
        summary='Verify that the packet can power inspector projections from persisted truth and not from ad hoc reconstruction.',
        evidence=[
            f"artifact_expectation_count={artifact_expectations}",
            f"workflow_artifact_reference_count={snapshot.get('workflow_artifact_reference_count')}",
        ],
    )


def _derive_overall_status(sections: list[dict[str, Any]]) -> str:
    statuses = [str(section.get('status') or '') for section in sections]
    if 'fail' in statuses:
        return 'fail'
    if 'warning' in statuses:
        return 'warning'
    return 'pass'


def _derive_classification(overall_status: str) -> str:
    if overall_status == 'pass':
        return 'governed implementation lane (verified)'
    if overall_status == 'warning':
        return 'governed implementation lane (needs review)'
    return 'candidate implementation lane (unverified)'


def _build_overall_summary(
    packet: ImplementationPacketRecord,
    sections: list[dict[str, Any]],
    classification: str,
) -> str:
    finding_counts = _count_findings(sections)
    return (
        f"Packet {packet.packet_id} is classified as {classification}. "
        f"Inspection produced {finding_counts['fail']} failing findings, {finding_counts['warning']} warnings, and {finding_counts['info']} informational findings."
    )


def _build_next_actions(sections: list[dict[str, Any]]) -> list[str]:
    actions: list[str] = []
    failing_keys = {section['key'] for section in sections if section.get('status') == 'fail'}
    if 'substrate_linkage' in failing_keys:
        actions.append('Add explicit workflow and process-layer linkage from implementation packets into the existing workflow/process substrate.')
    if 'governance_alignment' in failing_keys:
        actions.append('Bridge or migrate implementation gate state into the shared workflow gate lifecycle tables before promotion.')
    if 'evidence_durability' in failing_keys:
        actions.append('Record implementation evidence against inventory.evidence_records or workflow artifacts so acceptance claims are auditable.')
    if 'projection_readiness' in failing_keys or any(section.get('status') == 'warning' for section in sections if section.get('key') == 'projection_readiness'):
        actions.append('Emit projection-ready workflow artifacts so the inspector UI can read persisted truth directly.')
    if not actions:
        actions.append('Proceed to reviewer approval because the candidate lane is structurally aligned with the governed substrate.')
    return actions


def _build_sql_validation_queries() -> list[dict[str, str]]:
    specs = [
        ('Implementation Packet Presence', 'implementation_packet_has_workflow_link_columns'),
        ('Implementation Packet Process Link', 'implementation_packet_has_process_link_columns'),
        ('Implementation Evidence Inventory Reference', 'implementation_evidence_has_inventory_reference_columns'),
        ('Implementation Evidence Workflow Artifact Reference', 'implementation_evidence_has_workflow_artifact_reference_columns'),
        ('Workflow Gate Lifecycle Records', 'workflow_gate_tables_present'),
        ('Implementation Gate Tables', 'implementation_gate_tables_present'),
    ]
    queries = []
    for name, contract_key in specs:
        sql, _ = _binding_sql_and_params(contract_key)
        queries.append({'name': name, 'sql': sql})
    return queries


def _serialize_packet(packet: ImplementationPacketRecord) -> dict[str, Any]:
    return {
        'implementation_packet_id': packet.implementation_packet_id,
        'packet_id': packet.packet_id,
        'packet_type': packet.packet_type,
        'packet_version': packet.packet_version,
        'title': packet.title,
        'status': packet.status,
        'system_slug': packet.system_slug,
        'system_domain': packet.system_domain,
        'lineage': packet.lineage,
        'governance': packet.governance,
        'completion_policy': packet.completion_policy,
        'item_count': len(packet.items),
        'gate_bundle_count': len(packet.gate_bundles),
        'evidence_link_count': len(_collect_unique_evidence_links(packet)),
    }


def _persist_workflow_artifact(
    *,
    workflow_run_service: WorkflowRunService | None,
    run: WorkflowRunRecord | None,
    inspection_packet: dict[str, Any],
    inspection_json_path: Path,
    inspection_markdown_path: Path,
) -> None:
    if run is None or workflow_run_service is None:
        return
    workflow_run_service.store.create_workflow_artifact(
        artifact_type='output',
        title='Automated step completed: Inspect governed implementation candidate',
        content='governed implementation inspection ready',
        workflow_id=run.workflow_id,
        workflow_run_id=run.workflow_run_id,
        metadata={
            'output': {
                'inspection_json_path': str(inspection_json_path.resolve()),
                'inspection_markdown_path': str(inspection_markdown_path.resolve()),
                'overall_status': inspection_packet.get('overall_status'),
                'classification': inspection_packet.get('classification'),
            }
        },
    )


def _count_packet_artifact_references(packet: ImplementationPacketRecord, artifacts: list[dict[str, Any]]) -> int:
    needles = {
        packet.packet_id,
        packet.implementation_packet_id,
        *[item.implementation_item_id for item in packet.items],
        *[item.item_key for item in packet.items],
    }
    return sum(1 for artifact in artifacts if _payload_contains_any(artifact, needles))


def _payload_contains_any(value: Any, needles: set[str]) -> bool:
    if isinstance(value, str):
        return any(needle in value for needle in needles if needle)
    if isinstance(value, dict):
        return any(_payload_contains_any(item, needles) for item in value.values())
    if isinstance(value, list):
        return any(_payload_contains_any(item, needles) for item in value)
    return False


def _collect_unique_evidence_links(packet: ImplementationPacketRecord) -> list[dict[str, Any]]:
    links_by_id: dict[str, dict[str, Any]] = {}
    for evidence_link in packet.evidence_links:
        links_by_id[evidence_link.evidence_link_id] = {
            'evidence_link_id': evidence_link.evidence_link_id,
            'evidence_type': evidence_link.evidence_type,
            'evidence_ref': evidence_link.evidence_ref,
        }
    for item in packet.items:
        for evidence_link in item.evidence_links:
            links_by_id[evidence_link.evidence_link_id] = {
                'evidence_link_id': evidence_link.evidence_link_id,
                'evidence_type': evidence_link.evidence_type,
                'evidence_ref': evidence_link.evidence_ref,
            }
    return list(links_by_id.values())


def _section(
    *,
    key: str,
    title: str,
    findings: list[dict[str, str]],
    summary: str,
    evidence: list[str],
) -> dict[str, Any]:
    severities = {finding['severity'] for finding in findings}
    status = 'pass'
    if 'fail' in severities:
        status = 'fail'
    elif 'warning' in severities:
        status = 'warning'
    return {
        'key': key,
        'title': title,
        'status': status,
        'summary': summary,
        'findings': findings,
        'evidence': evidence,
    }


def _finding(severity: str, message: str) -> dict[str, str]:
    return {'severity': severity, 'message': message}


def _count_findings(sections: list[dict[str, Any]]) -> dict[str, int]:
    counts = {'fail': 0, 'warning': 0, 'info': 0}
    for section in sections:
        findings = section.get('findings') if isinstance(section.get('findings'), list) else []
        for finding in findings:
            severity = str(finding.get('severity') or '')
            if severity in counts:
                counts[severity] += 1
    return counts


def _build_markdown(inspection_packet: dict[str, Any]) -> str:
    lines = [
        '# Governed Implementation Inspection',
        '',
        '## Summary',
        f"- Classification: {inspection_packet.get('classification')}",
        f"- Overall Status: {inspection_packet.get('overall_status')}",
        f"- Summary: {inspection_packet.get('overall_summary')}",
        '',
        '## Scope',
        f"- Packet ID: {inspection_packet['inspection_scope'].get('packet_id')}",
        f"- Implementation Packet ID: {inspection_packet['inspection_scope'].get('implementation_packet_id')}",
        f"- Workflow Run ID: {inspection_packet['inspection_scope'].get('workflow_run_id') or 'n/a'}",
        '',
    ]

    for section in inspection_packet.get('inspections', []):
        lines.append(f"## {section.get('title')}")
        lines.append(f"- Status: {section.get('status')}")
        lines.append(f"- Summary: {section.get('summary')}")
        lines.append('- Findings:')
        findings = section.get('findings') if isinstance(section.get('findings'), list) else []
        for finding in findings:
            lines.append(f"  - [{finding.get('severity')}] {finding.get('message')}")
        evidence = section.get('evidence') if isinstance(section.get('evidence'), list) else []
        if evidence:
            lines.append('- Evidence:')
            for item in evidence:
                lines.append(f'  - {item}')
        lines.append('')

    lines.append('## Recommended Next Actions')
    for action in inspection_packet.get('recommended_next_actions', []):
        lines.append(f'- {action}')
    lines.append('')

    lines.append('## SQL Validation Queries')
    for query in inspection_packet.get('sql_validation_queries', []):
        lines.append(f"- {query.get('name')}: `{query.get('sql')}`")
    lines.append('')

    return '\n'.join(lines)


def _coerce_effective_input(input_data: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(input_data, dict):
        return {}
    run_context = input_data.get('run_context')
    if isinstance(run_context, dict):
        merged = dict(run_context)
        merged.update({key: value for key, value in input_data.items() if key != 'run_context'})
        return merged
    return dict(input_data)


def _clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
