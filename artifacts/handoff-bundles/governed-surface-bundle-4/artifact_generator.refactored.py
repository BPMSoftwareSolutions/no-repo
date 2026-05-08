from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from contracts.data_access.models import DataAccessContract
from orchestration.data_access_generation.contract_validator import split_fields_by_writability


REPO_ROOT = Path(__file__).resolve().parents[3]
SQL_GENERATED_ROOT = REPO_ROOT / 'src' / 'persistence' / 'sql' / 'generated'
REPOSITORY_GENERATED_ROOT = REPO_ROOT / 'src' / 'persistence' / 'repositories' / 'generated'
VALIDATION_GENERATED_ROOT = REPO_ROOT / 'src' / 'validation' / 'generated'
REVIEW_PACKET_ROOT = REPO_ROOT / 'generated' / 'data-access-generation'
SQL_ARTIFACT_CLASSIFICATION = 'generated_sql_artifact'


@dataclass(slots=True)
class GeneratedArtifactBundle:
    run_id: str
    entity_key: str
    sql_artifacts: dict[str, str]
    repository_artifact: str
    validation_artifact: str
    manifest: dict[str, Any]
    review_packet: str
    artifact_paths: dict[str, str]


def generate_sql_procedure(contract: DataAccessContract, operation_profile: str) -> str:
    entity_name = _pascal_case(contract.entity_name)
    proc_name = _sql_procedure_name(entity_name, operation_profile)
    select_fields = _select_fields(contract, operation_profile)
    primary_key = next((field for field in contract.key_fields if field.kind == 'primary'), contract.key_fields[0])
    primary_param = _sql_parameter_name(primary_key.dto_field)
    primary_column = _sql_column_reference(primary_key.column_path)
    primary_type = _field_sql_type(contract, primary_key.dto_field)
    primary_alias = _binding_alias_for_column_path(contract, primary_key.column_path) or 't'

    if operation_profile == 'get_by_id':
        return (
            f'CREATE OR ALTER PROCEDURE ui.{proc_name}\n'
            f'  @{primary_param} {primary_type.upper()}\n'
            'AS\n'
            'BEGIN\n'
            '  SET NOCOUNT ON;\n\n'
            f'  SELECT\n{_indent_lines(select_fields, 4)}\n'
            f'  FROM {_from_clause(contract)}\n'
            f'  WHERE {primary_alias}.{_column_name(primary_column)} = @{primary_param};\n'
            'END\n'
        )

    if operation_profile == 'list':
        filter_params = _list_filter_parameters(contract)
        where_clause = _list_where_clause(contract)
        return (
            f'CREATE OR ALTER PROCEDURE ui.{proc_name}\n'
            f'{filter_params}\n'
            'AS\n'
            'BEGIN\n'
            '  SET NOCOUNT ON;\n\n'
            f'  SELECT\n{_indent_lines(select_fields, 4)}\n'
            f'  FROM {_from_clause(contract)}\n'
            f'{where_clause}\n'
            'END\n'
        )

    if operation_profile == 'projection_read':
        return (
            f'CREATE OR ALTER PROCEDURE ui.{proc_name}\n'
            'AS\n'
            'BEGIN\n'
            '  SET NOCOUNT ON;\n\n'
            f'  SELECT\n{_indent_lines(select_fields, 4)}\n'
            f'  FROM {_from_clause(contract)}\n'
            'END\n'
        )

    writable_fields = split_fields_by_writability(contract)['writable_fields']
    if operation_profile == 'create':
        params = ',\n'.join(
            f'  @{_sql_parameter_name(field.dto_field)} {(field.sql_type or "nvarchar(max)").upper()}'
            for field in writable_fields
        )
        insert_columns = ', '.join(_column_name(_sql_column_reference(field.column_path)) for field in writable_fields)
        insert_values = ', '.join(f'@{_sql_parameter_name(field.dto_field)}' for field in writable_fields)
        primary_select = f'SELECT SCOPE_IDENTITY() AS {_column_name(primary_column)};' if primary_key else ''
        return (
            f'CREATE OR ALTER PROCEDURE ui.{proc_name}\n'
            f'{params}\n'
            'AS\n'
            'BEGIN\n'
            '  SET NOCOUNT ON;\n\n'
            f'  INSERT INTO {_primary_table_name(contract)} ({insert_columns})\n'
            f'  VALUES ({insert_values});\n\n'
            f'  {primary_select}\n'
            'END\n'
        )

    if operation_profile == 'update':
        params = ',\n'.join(
            [f'  @{primary_param} {primary_type.upper()}'] +
            [f'  @{_sql_parameter_name(field.dto_field)} {(field.sql_type or "nvarchar(max)").upper()}' for field in writable_fields]
        )
        set_clause = ',\n'.join(
            f'      {_column_name(_sql_column_reference(field.column_path))} = @{_sql_parameter_name(field.dto_field)}'
            for field in writable_fields
        )
        return (
            f'CREATE OR ALTER PROCEDURE ui.{proc_name}\n'
            f'{params}\n'
            'AS\n'
            'BEGIN\n'
            '  SET NOCOUNT ON;\n\n'
            f'  UPDATE {_primary_table_name(contract)}\n'
            '  SET\n'
            f'{set_clause}\n'
            f'  WHERE {_column_name(primary_column)} = @{primary_param};\n'
            'END\n'
        )

    raise ValueError(f'Unsupported operation profile: {operation_profile}')


def generate_repository_adapter(contract: DataAccessContract) -> str:
    entity_name = _pascal_case(contract.entity_name)
    dto_name = f'{entity_name}Dto'
    repository_name = f'{entity_name}Repository'
    dto_fields = '\n'.join(
        f'    {field.dto_field}: {_python_type(field)}'
        for field in contract.field_map
    )
    mapper_fields = ',\n'.join(
        f'            {field.dto_field}=row.get("{field.dto_field}")'
        for field in contract.field_map
    )
    methods = '\n\n'.join(_repository_method(contract, profile, dto_name) for profile in contract.operation_profiles)
    return (
        'from __future__ import annotations\n\n'
        'from dataclasses import dataclass\n'
        'from typing import Any\n\n'
        'from orchestration.data_access_runtime.executor import execute_runtime_query\n'
        'from orchestration.data_access_runtime.mutation_executor import execute_runtime_mutation\n\n\n'
        '@dataclass(slots=True)\n'
        f'class {dto_name}:\n'
        f'{dto_fields}\n\n\n'
        f'class {repository_name}:\n'
        '    def __init__(self, sql_client: Any | None = None) -> None:\n'
        '        self._sql_client = sql_client\n\n'
        '    def _fetch_one(self, contract_key: str, parameters: dict[str, Any]) -> dict[str, Any] | None:\n'
        '        if self._sql_client is not None:\n'
        '            return self._sql_client.fetch_one(contract_key, parameters)\n'
        '        return execute_runtime_query(contract_key, parameters)\n\n'
        '    def _fetch_all(self, contract_key: str, parameters: dict[str, Any]) -> list[dict[str, Any]]:\n'
        '        if self._sql_client is not None:\n'
        '            return self._sql_client.fetch_all(contract_key, parameters)\n'
        '        return execute_runtime_query(contract_key, parameters)\n\n'
        f'    def _row_to_dto(self, row: dict[str, Any]) -> {dto_name}:\n'
        f'        return {dto_name}(\n{mapper_fields}\n        )\n\n'
        f'{methods}\n'
    )


def generate_validation_schema(contract: DataAccessContract) -> str:
    entity_key = _snake_case(contract.entity_name)
    writable_fields = split_fields_by_writability(contract)['writable_fields']
    required_create = [field for field in writable_fields if not field.nullable]
    create_checks = '\n'.join(
        f'    if payload.get("{field.dto_field}") in (None, ""):\n        errors.append("{field.dto_field} is required")'
        for field in required_create
    )
    update_checks = '\n'.join(
        f'    if "{field.dto_field}" in payload and payload["{field.dto_field}"] is None and {str(not field.nullable)}:\n        errors.append("{field.dto_field} cannot be null")'
        for field in writable_fields
    )
    return (
        'from __future__ import annotations\n\n'
        f'def validate_{entity_key}_create(payload: dict) -> list[str]:\n'
        '    errors: list[str] = []\n'
        f'{create_checks + "\n" if create_checks else ""}'
        '    return errors\n\n\n'
        f'def validate_{entity_key}_update(payload: dict) -> list[str]:\n'
        '    errors: list[str] = []\n'
        f'{update_checks + "\n" if update_checks else ""}'
        '    return errors\n'
    )


def generate_manifest(contract: DataAccessContract, run_id: str, artifact_paths: dict[str, str]) -> dict[str, Any]:
    writable_fields = [field.dto_field for field in split_fields_by_writability(contract)['writable_fields']]
    return {
        'contractId': contract.contract_id,
        'contractVersion': contract.contract_version,
        'generationRunId': run_id,
        'sqlArtifactClassification': SQL_ARTIFACT_CLASSIFICATION,
        'generatedOperations': list(contract.operation_profiles),
        'artifactPaths': artifact_paths,
        'tableBindings': [
            {
                'schema': binding.schema,
                'table': binding.table,
                'alias': binding.alias,
                'role': binding.role,
            }
            for binding in contract.table_bindings
        ],
        'writableFields': writable_fields,
    }


def generate_review_packet(contract: DataAccessContract, run_id: str, findings: list[dict[str, Any]], manifest: dict[str, Any]) -> str:
    writable_split = split_fields_by_writability(contract)
    findings_lines = '\n'.join(
        f'- `{finding.get("severity")}` {finding.get("column_path") or finding.get("field") or "<none>"}: {finding.get("message")}'
        for finding in findings
    ) or '- none'
    operations = '\n'.join(f'- `{operation}`' for operation in contract.operation_profiles)
    bindings = '\n'.join(f'- `{binding.schema}.{binding.table}` ({binding.role})' for binding in contract.table_bindings)
    return (
        f'# Review Packet - {contract.entity_name}\n\n'
        '## Contract Summary\n'
        f'- Contract ID: `{contract.contract_id}`\n'
        f'- Contract Version: `{contract.contract_version}`\n'
        f'- Generation Run ID: `{run_id}`\n\n'
        '## Mapped Tables\n'
        f'{bindings}\n\n'
        '## Read/Write Field Breakdown\n'
        f'- Read-only fields: {len(writable_split["read_only_fields"])}\n'
        f'- Writable fields: {len(writable_split["writable_fields"])}\n\n'
        '## Generated Operations\n'
        f'{operations}\n\n'
        '## Validation Warnings\n'
        f'{findings_lines}\n\n'
        '## Verification Status\n'
        '- Placeholder: verification stage will attach build and execution evidence.\n\n'
        '## Promotion Recommendation\n'
        f'- Recommendation: {"revise" if any(f.get("severity") == "error" for f in findings) else "ready_for_review"}\n\n'
        '## Manifest Snapshot\n'
        f'```json\n{json.dumps(manifest, indent=2)}\n```\n'
    )


def generate_artifact_bundle(
    contract: DataAccessContract,
    *,
    run_id: str,
    findings: list[dict[str, Any]],
    repo_root: Path | None = None,
) -> GeneratedArtifactBundle:
    root = (repo_root or REPO_ROOT).resolve()
    entity_key = _snake_case(contract.entity_name)
    sql_dir = root / 'src' / 'persistence' / 'sql' / 'generated' / entity_key
    sql_artifacts: dict[str, str] = {}
    artifact_paths: dict[str, str] = {}

    for operation_profile in contract.operation_profiles:
        sql_artifacts[operation_profile] = generate_sql_procedure(contract, operation_profile)
        artifact_paths[f'sql_{operation_profile}'] = (sql_dir / f'{entity_key}.{operation_profile}.sql').relative_to(root).as_posix()

    repository_artifact = generate_repository_adapter(contract)
    repository_path = root / 'src' / 'persistence' / 'repositories' / 'generated' / f'{entity_key}_repository.py'
    artifact_paths['repository'] = repository_path.relative_to(root).as_posix()

    validation_artifact = generate_validation_schema(contract)
    validation_path = root / 'src' / 'validation' / 'generated' / f'{entity_key}_validation.py'
    artifact_paths['validation'] = validation_path.relative_to(root).as_posix()

    manifest = generate_manifest(contract, run_id, artifact_paths)
    manifest_path = root / 'generated' / 'data-access-generation' / entity_key / 'manifest.json'
    artifact_paths['manifest'] = manifest_path.relative_to(root).as_posix()

    review_packet = generate_review_packet(contract, run_id, findings, manifest)
    review_packet_path = root / 'generated' / 'data-access-generation' / entity_key / 'review-packet.md'
    artifact_paths['review_packet'] = review_packet_path.relative_to(root).as_posix()

    return GeneratedArtifactBundle(
        run_id=run_id,
        entity_key=entity_key,
        sql_artifacts=sql_artifacts,
        repository_artifact=repository_artifact,
        validation_artifact=validation_artifact,
        manifest=manifest,
        review_packet=review_packet,
        artifact_paths=artifact_paths,
    )


def write_generated_artifacts(bundle: GeneratedArtifactBundle, *, repo_root: Path | None = None) -> dict[str, str]:
    root = (repo_root or REPO_ROOT).resolve()
    written: dict[str, str] = {}
    entity_root = _snake_case(bundle.entity_key)

    sql_dir = root / 'src' / 'persistence' / 'sql' / 'generated' / entity_root
    sql_dir.mkdir(parents=True, exist_ok=True)
    for operation_profile, content in bundle.sql_artifacts.items():
        path = sql_dir / f'{entity_root}.{operation_profile}.sql'
        path.write_text(content, encoding='utf-8')
        written[f'sql_{operation_profile}'] = path.relative_to(root).as_posix()

    repository_path = root / 'src' / 'persistence' / 'repositories' / 'generated' / f'{entity_root}_repository.py'
    repository_path.parent.mkdir(parents=True, exist_ok=True)
    repository_path.write_text(bundle.repository_artifact, encoding='utf-8')
    written['repository'] = repository_path.relative_to(root).as_posix()

    validation_path = root / 'src' / 'validation' / 'generated' / f'{entity_root}_validation.py'
    validation_path.parent.mkdir(parents=True, exist_ok=True)
    validation_path.write_text(bundle.validation_artifact, encoding='utf-8')
    written['validation'] = validation_path.relative_to(root).as_posix()

    manifest_path = root / 'generated' / 'data-access-generation' / entity_root / 'manifest.json'
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(bundle.manifest, indent=2), encoding='utf-8')
    written['manifest'] = manifest_path.relative_to(root).as_posix()

    review_packet_path = root / 'generated' / 'data-access-generation' / entity_root / 'review-packet.md'
    review_packet_path.write_text(bundle.review_packet, encoding='utf-8')
    written['review_packet'] = review_packet_path.relative_to(root).as_posix()
    return written


def persist_generated_outputs(store: Any, bundle: GeneratedArtifactBundle, written_paths: dict[str, str], contract: DataAccessContract) -> dict[str, Any]:
    operations = []
    for operation_profile in contract.operation_profiles:
        operations.append(
            store.add_generated_operation(
                bundle.run_id,
                entity_name=contract.entity_name,
                operation_key=operation_profile,
                operation_profile=operation_profile,
                sql_artifact_path=written_paths.get(f'sql_{operation_profile}'),
                status='generated',
            )
        )

    artifacts = []
    for key, relative_path in written_paths.items():
        content = _artifact_content_for_key(bundle, key)
        artifact_type = key.replace('sql_', 'sql_procedure') if key.startswith('sql_') else key
        artifacts.append(
            store.add_generated_artifact(
                bundle.run_id,
                artifact_type=artifact_type,
                file_path=relative_path,
                content=content,
            )
        )

    manifest_record = store.add_artifact_manifest(
        bundle.run_id,
        entity_name=contract.entity_name,
        contract_version=contract.contract_version,
        operations=operations,
        artifact_paths=written_paths,
        promotion_status='draft',
    )
    return {
        'operations': operations,
        'artifacts': artifacts,
        'manifest': manifest_record,
    }


def _artifact_content_for_key(bundle: GeneratedArtifactBundle, key: str) -> str:
    if key.startswith('sql_'):
        return bundle.sql_artifacts[key.replace('sql_', '')]
    if key == 'repository':
        return bundle.repository_artifact
    if key == 'validation':
        return bundle.validation_artifact
    if key == 'manifest':
        return json.dumps(bundle.manifest, indent=2)
    if key == 'review_packet':
        return bundle.review_packet
    raise KeyError(f'Unsupported artifact key: {key}')


def _select_fields(contract: DataAccessContract, operation_profile: str) -> str:
    projection_fields = None
    if operation_profile == 'projection_read' and contract.projection_profiles:
        projection_fields = set(contract.projection_profiles[0].included_fields)
    lines = []
    for field in contract.field_map:
        if field.pii_class == 'restricted':
            continue
        if projection_fields is not None and field.dto_field not in projection_fields:
            continue
        binding_alias = _binding_alias_for_column_path(contract, field.column_path)
        column_name = _column_name(_sql_column_reference(field.column_path))
        lines.append(f'{binding_alias}.{column_name} AS {field.dto_field}')
    return ',\n'.join(lines)


def _from_clause(contract: DataAccessContract) -> str:
    primary = next(binding for binding in contract.table_bindings if binding.role == 'primary')
    primary_alias = primary.alias or _default_alias(primary.table)
    clauses = [f'{primary.schema}.{primary.table} AS {primary_alias}']
    for binding in contract.table_bindings:
        if binding is primary:
            continue
        binding_alias = binding.alias or _default_alias(binding.table)
        join_clause = _join_clause(contract, primary_alias, binding, binding_alias)
        clauses.append(join_clause)
    return '\n  '.join(clauses)


def _primary_table_name(contract: DataAccessContract) -> str:
    primary = next(binding for binding in contract.table_bindings if binding.role == 'primary')
    return f'{primary.schema}.{primary.table}'


def _field_sql_type(contract: DataAccessContract, dto_field: str) -> str:
    field = next((field for field in contract.field_map if field.dto_field == dto_field), None)
    return _normalize_sql_decl_type(field.sql_type if field is not None else None)


def _binding_alias_for_column_path(contract: DataAccessContract, column_path: str) -> str:
    parts = column_path.split('.')
    if len(parts) == 3:
        schema_name, table_name, _ = parts
        for binding in contract.table_bindings:
            if binding.schema == schema_name and binding.table == table_name:
                return binding.alias or _default_alias(binding.table)
    if len(parts) == 2:
        return parts[0]
    return 't'


def _sql_column_reference(column_path: str) -> str:
    parts = column_path.split('.')
    if len(parts) >= 2:
        return '.'.join(parts[-2:])
    return column_path


def _column_name(column_reference: str) -> str:
    return column_reference.split('.')[-1]


def _sql_parameter_name(dto_field: str) -> str:
    return _pascal_case(dto_field)


def _list_filter_parameters(contract: DataAccessContract) -> str:
    lines = []
    field_map = {field.dto_field: field for field in contract.field_map}
    for contract_filter in contract.filters:
        mapped_field = field_map.get(contract_filter.field)
        if mapped_field is None:
            continue
        lines.append(f'  @{_sql_parameter_name(contract_filter.field)} {_normalize_sql_decl_type(mapped_field.sql_type).upper()} = NULL')
    return ',\n'.join(lines) if lines else '  @Unused BIT = 0'


def _list_where_clause(contract: DataAccessContract) -> str:
    field_map = {field.dto_field: field for field in contract.field_map}
    predicates = []
    for contract_filter in contract.filters:
        mapped_field = field_map.get(contract_filter.field)
        if mapped_field is None:
            continue
        alias = _binding_alias_for_column_path(contract, mapped_field.column_path)
        column_name = _column_name(_sql_column_reference(mapped_field.column_path))
        param_name = _sql_parameter_name(contract_filter.field)
        predicates.append(f'(@{param_name} IS NULL OR {alias}.{column_name} = @{param_name})')
    if not predicates:
        return ''
    return '  WHERE ' + '\n    AND '.join(predicates)


def _repository_method(contract: DataAccessContract, operation_profile: str, dto_name: str) -> str:
    primary_key = next((field for field in contract.key_fields if field.kind == 'primary'), contract.key_fields[0])
    contract_key = _runtime_contract_key(contract, operation_profile)
    if operation_profile == 'get_by_id':
        return (
            f'    def get_by_id(self, {primary_key.dto_field}: str) -> {dto_name} | None:\n'
            f'        row = self._fetch_one("{contract_key}", {{"{primary_key.dto_field}": {primary_key.dto_field}}})\n'
            '        if row is None:\n'
            '            return None\n'
            '        return self._row_to_dto(row)'
        )
    if operation_profile == 'list':
        return (
            f'    def list(self, **filters: Any) -> list[{dto_name}]:\n'
            f'        rows = self._fetch_all("{contract_key}", filters)\n'
            '        return [self._row_to_dto(row) for row in rows]'
        )
    if operation_profile == 'projection_read':
        return (
            f'    def projection_read(self) -> list[{dto_name}]:\n'
            f'        rows = self._fetch_all("{contract_key}", {{}})\n'
            '        return [self._row_to_dto(row) for row in rows]'
        )
    if operation_profile == 'create':
        return (
            '    def create(self, payload: dict[str, Any]) -> Any:\n'
            f'        return execute_runtime_mutation("{contract_key}", payload)'
        )
    return (
        f'    def update(self, {primary_key.dto_field}: str, payload: dict[str, Any]) -> Any:\n'
        f'        parameters = {{"{primary_key.dto_field}": {primary_key.dto_field}, **payload}}\n'
        f'        return execute_runtime_mutation("{contract_key}", parameters)'
    )


def _runtime_contract_key(contract: DataAccessContract, operation_profile: str) -> str:
    return f'{contract.contract_id}_{operation_profile}'


def _sql_procedure_name(entity_name: str, operation_profile: str) -> str:
    suffix_map = {
        'get_by_id': 'GetById',
        'list': 'List',
        'projection_read': 'ProjectionRead',
        'create': 'Create',
        'update': 'Update',
    }
    return f'{entity_name}{suffix_map[operation_profile]}'


def _python_type(field: Any) -> str:
    sql_type = (field.sql_type or '').lower()
    if sql_type in {'int', 'bigint', 'smallint'}:
        base = 'int'
    elif sql_type in {'bit'}:
        base = 'bool'
    elif sql_type in {'uniqueidentifier'}:
        base = 'str'
    else:
        base = 'str'
    return f'{base} | None' if field.nullable else base


def _snake_case(value: str) -> str:
    if '_' in value:
        return value.lower()
    converted = re.sub(r'(?<!^)(?=[A-Z])', '_', value).lower()
    return converted


def _pascal_case(value: str) -> str:
    parts = re.split(r'[_\s]+', value)
    return ''.join(part[:1].upper() + part[1:] for part in parts if part)


def _default_alias(table_name: str) -> str:
    normalized = _snake_case(table_name)
    return ''.join(part[0] for part in normalized.split('_') if part)[:3] or 't'


def _join_clause(contract: DataAccessContract, primary_alias: str, binding: Any, binding_alias: str) -> str:
    foreign_key = next((key for key in contract.key_fields if key.kind == 'foreign'), None)
    if foreign_key is None:
        return f'LEFT JOIN {binding.schema}.{binding.table} AS {binding_alias} ON 1 = 0'

    primary_column = _column_name(_sql_column_reference(foreign_key.column_path))
    lookup_column = primary_column
    return (
        f'LEFT JOIN {binding.schema}.{binding.table} AS {binding_alias} '
        f'ON {primary_alias}.{primary_column} = {binding_alias}.{lookup_column}'
    )


def _normalize_sql_decl_type(sql_type: str | None) -> str:
    normalized = str(sql_type or 'nvarchar(max)').strip().lower()
    if '(' in normalized:
        return normalized
    if normalized in {'nvarchar', 'varchar', 'varbinary'}:
        return f'{normalized}(max)'
    if normalized in {'nchar', 'char', 'binary'}:
        return f'{normalized}(1)'
    return normalized


def _indent_lines(text: str, spaces: int) -> str:
    prefix = ' ' * spaces
    return '\n'.join(f'{prefix}{line}' for line in text.splitlines())