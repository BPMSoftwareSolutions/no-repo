from __future__ import annotations

import os
import re
from contextlib import contextmanager
from contextvars import ContextVar
from collections.abc import Mapping, Sequence
from typing import Any

from persistence.sql.security_governance_store import (
    GovernedMutationValidationError,
    SqlSecurityGovernanceStore,
)


_GOVERNED_MUTATION_CONTEXT: ContextVar[dict[str, Any] | None] = ContextVar(
    'governed_mutation_context',
    default=None,
)
_EXEC_PATTERN = re.compile(r'^\s*EXEC(?:UTE)?\s+([A-Za-z0-9_\.\[\]]+)', re.IGNORECASE)
_EXEC_CALL_PATTERN = re.compile(
    r'^\s*EXEC(?:UTE)?\s+([A-Za-z0-9_\.\[\]]+)(?:\s+(.*?))?\s*$',
    re.IGNORECASE | re.DOTALL,
)
_QMARK_PARAM_RE = re.compile(r'\?')


def _is_truthy_env(value: str | None) -> bool:
    return str(value or '').strip().lower() in {'1', 'true', 'yes', 'on'}


def _runtime_environment() -> str:
    for key in ('AI_ENGINE_ENVIRONMENT', 'WORKFLOW_ENVIRONMENT', 'APP_ENV', 'ENVIRONMENT'):
        value = os.getenv(key)
        if value:
            return value.strip().lower()
    return 'local'


def _to_snake_case(name: str) -> str:
    normalized = str(name or '').strip().replace('[', '').replace(']', '')
    if not normalized:
        return normalized
    normalized = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', normalized)
    normalized = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', normalized)
    normalized = normalized.replace('-', '_')
    return normalized.lower()


def _translate_exec_to_pg_select(query: str) -> str:
    match = _EXEC_CALL_PATTERN.match(str(query or ''))
    if not match:
        return query

    procedure_name = match.group(1) or ''
    raw_args = (match.group(2) or '').strip()
    qualified_parts = [_to_snake_case(part) for part in procedure_name.split('.') if part]
    if not qualified_parts:
        return query

    translated_name = '.'.join(qualified_parts)
    if not raw_args:
        return f"SELECT * FROM {translated_name}()"

    placeholders = _QMARK_PARAM_RE.findall(raw_args)
    if not placeholders:
        return f"SELECT * FROM {translated_name}()"

    translated_args = ', '.join('%s' for _ in placeholders)
    return f"SELECT * FROM {translated_name}({translated_args})"


@contextmanager
def governed_mutation_context(
    *,
    mutation_record_key: str,
    workflow_run_id: str | None = None,
    agent_session_id: str | None = None,
    promotion_packet_key: str | None = None,
    caller_identity: str | None = None,
    require_promotion_evidence: bool = False,
) -> Any:
    token = _GOVERNED_MUTATION_CONTEXT.set(
        {
            'mutation_record_key': mutation_record_key,
            'workflow_run_id': workflow_run_id,
            'agent_session_id': agent_session_id,
            'promotion_packet_key': promotion_packet_key,
            'caller_identity': caller_identity,
            'require_promotion_evidence': require_promotion_evidence,
        }
    )
    try:
        yield
    finally:
        _GOVERNED_MUTATION_CONTEXT.reset(token)


class _GovernedMutationMixin:
    """Shared governed-mutation enforcement logic for all SQL clients.

    Subclasses must set ``self._security_governance_store`` in ``__init__``.
    """

    _security_governance_store: SqlSecurityGovernanceStore

    def _enforce_governed_mutation(self, *, query: str) -> None:
        if not self._should_enforce_governed_mutations(query):
            return

        context = self._resolve_governed_mutation_context()
        procedure_name = self._extract_procedure_name(query)
        target_schema, target_object = self._resolve_target_identifiers(procedure_name)
        caller_identity = str(
            context.get('caller_identity')
            or os.getenv('AI_ENGINE_RUNTIME_IDENTITY')
            or os.getenv('AI_ENGINE_SQL_USERNAME')
            or 'unknown'
        )
        workflow_run_id = context.get('workflow_run_id')
        agent_session_id = context.get('agent_session_id')
        mutation_record_key = context.get('mutation_record_key')
        raw_context = {
            'environment': _runtime_environment(),
            'procedure_name': procedure_name,
            'caller_identity': caller_identity,
            'workflow_run_id': workflow_run_id,
            'agent_session_id': agent_session_id,
            'governed_mutation_context': context,
        }

        if not mutation_record_key:
            self._security_governance_store.record_blocked_mutation(
                caller_identity=caller_identity,
                attempted_operation=procedure_name or query.strip(),
                target_schema=target_schema,
                target_object=target_object,
                block_reason='governed_mutation_record_required',
                workflow_run_id=workflow_run_id,
                agent_session_id=agent_session_id,
                raw_context=raw_context,
            )
            raise GovernedMutationValidationError(
                'Production mutation blocked: no governed mutation record key was supplied for the write operation.'
            )

        validation = self._security_governance_store.validate_governed_mutation(
            caller_identity=caller_identity,
            environment='production',
            mutation_record_key=str(mutation_record_key),
            promotion_packet_key=context.get('promotion_packet_key'),
            require_promotion_evidence=bool(context.get('require_promotion_evidence')),
        )
        if validation.get('allowed'):
            return

        reason = str(validation.get('reason') or 'Production mutation blocked by governed mutation policy.')
        declared_mutation_scope = str(validation.get('declared_mutation_scope') or 'unknown')
        attempted_scope = str(validation.get('attempted_scope') or 'approved_procedure')
        if validation.get('failure_category') == 'mutation_scope_violation':
            self._security_governance_store.record_mutation_scope_violation(
                caller_identity=caller_identity,
                declared_mutation_scope=declared_mutation_scope,
                attempted_scope=attempted_scope,
                attempted_operation=procedure_name or query.strip(),
                target_schema=target_schema,
                target_object=target_object,
                violation_reason=reason,
                workflow_run_id=workflow_run_id,
                agent_session_id=agent_session_id,
                raw_context=raw_context,
            )
        else:
            self._security_governance_store.record_blocked_mutation(
                caller_identity=caller_identity,
                attempted_operation=procedure_name or query.strip(),
                target_schema=target_schema,
                target_object=target_object,
                block_reason=reason,
                workflow_run_id=workflow_run_id,
                agent_session_id=agent_session_id,
                raw_context=raw_context,
            )
        raise GovernedMutationValidationError(reason)

    def _should_enforce_governed_mutations(self, query: str) -> bool:
        if not self._extract_procedure_name(query):
            return False

        explicit_setting = os.getenv('AI_ENGINE_ENFORCE_GOVERNED_MUTATIONS')
        if explicit_setting is not None:
            return _is_truthy_env(explicit_setting)
        return _runtime_environment() in {'production', 'prod'}

    def _resolve_governed_mutation_context(self) -> dict[str, Any]:
        context = _GOVERNED_MUTATION_CONTEXT.get()
        if context:
            return context
        return {
            'mutation_record_key': os.getenv('AI_ENGINE_GOVERNED_MUTATION_KEY'),
            'workflow_run_id': os.getenv('AI_ENGINE_GOVERNED_MUTATION_WORKFLOW_RUN_ID'),
            'agent_session_id': os.getenv('AI_ENGINE_GOVERNED_MUTATION_AGENT_SESSION_ID'),
            'promotion_packet_key': os.getenv('AI_ENGINE_PROMOTION_PACKET_KEY'),
            'caller_identity': os.getenv('AI_ENGINE_RUNTIME_IDENTITY'),
            'require_promotion_evidence': _is_truthy_env(os.getenv('AI_ENGINE_REQUIRE_PROMOTION_EVIDENCE')),
        }

    def _extract_procedure_name(self, query: str) -> str | None:
        match = _EXEC_PATTERN.match(str(query or ''))
        if not match:
            return None
        return match.group(1)

    def _resolve_target_identifiers(self, procedure_name: str | None) -> tuple[str | None, str | None]:
        if not procedure_name:
            return None, None
        normalized = procedure_name.replace('[', '').replace(']', '')
        parts = [part for part in normalized.split('.') if part]
        if len(parts) >= 2:
            return parts[-2], parts[-1]
        return None, parts[-1] if parts else None


class PyodbcSqlClient(_GovernedMutationMixin):
    def __init__(self, connection_factory) -> None:
        self._connection_factory = connection_factory
        self._security_governance_store = SqlSecurityGovernanceStore()

    def fetch_one(self, query: str, parameters: Sequence[Any] | Mapping[str, Any]) -> dict[str, Any] | None:
        rows = self._fetch(query, parameters)
        return rows[0] if rows else None

    def fetch_all(self, query: str, parameters: Sequence[Any] | Mapping[str, Any]) -> list[dict[str, Any]]:
        return self._fetch(query, parameters)

    def execute(self, query: str, parameters: Sequence[Any] | Mapping[str, Any]) -> Any:
        self._enforce_governed_mutation(query=query)
        with self._connection_factory() as connection:
            cursor = connection.cursor()
            if isinstance(parameters, Mapping):
                ordered_values = [parameters[key] for key in parameters]
                cursor.execute(query, *ordered_values)
            else:
                cursor.execute(query, *parameters)
            connection.commit()
            if cursor.description:
                row = cursor.fetchone()
                return self._row_to_dict(cursor, row) if row is not None else None
            return None

    def _fetch(self, query: str, parameters: Sequence[Any] | Mapping[str, Any]) -> list[dict[str, Any]]:
        with self._connection_factory() as connection:
            cursor = connection.cursor()
            if isinstance(parameters, Mapping):
                ordered_values = [parameters[key] for key in parameters]
                cursor.execute(query, *ordered_values)
            else:
                cursor.execute(query, *parameters)
            rows = cursor.fetchall()
            return [self._row_to_dict(cursor, row) for row in rows]

    def _row_to_dict(self, cursor: Any, row: Any) -> dict[str, Any]:
        columns = [column[0] for column in cursor.description or []]
        return {
            columns[index]: self._normalize_value(value)
            for index, value in enumerate(row)
        }

    def _normalize_value(self, value: Any) -> Any:
        isoformat = getattr(value, 'isoformat', None)
        if callable(isoformat):
            try:
                return isoformat()
            except TypeError:
                return value
        return value


_PG_CUTOVER_ACTIVE = True


class Psycopg2SqlClient(_GovernedMutationMixin):
    """PostgreSQL SQL client using psycopg2.

    Mirrors the PyodbcSqlClient interface for legacy callers. Accepts both
    pyodbc-style ``?`` placeholders and psycopg2-style ``%s`` placeholders;
    ``?`` is automatically translated to ``%s`` before execution.
    Parameters are passed as a sequence, never unpacked with ``*``.
    PostgreSQL is the engine runtime source of truth.

    Governed-mutation enforcement (inherited from _GovernedMutationMixin) is
    enforced on every execute() call identically to PyodbcSqlClient.
    """

    def __init__(self, connection_factory) -> None:
        self._connection_factory = connection_factory
        self._security_governance_store = SqlSecurityGovernanceStore()

    def fetch_one(self, query: str, parameters: Sequence[Any] | Mapping[str, Any]) -> dict[str, Any] | None:
        rows = self._fetch(query, parameters)
        return rows[0] if rows else None

    def fetch_all(self, query: str, parameters: Sequence[Any] | Mapping[str, Any]) -> list[dict[str, Any]]:
        return self._fetch(query, parameters)

    def execute(self, query: str, parameters: Sequence[Any] | Mapping[str, Any]) -> Any:
        self._enforce_governed_mutation(query=query)
        with self._connection_factory() as connection:
            cursor = connection.cursor()
            params = self._coerce_params(parameters)
            cursor.execute(self._normalize_query(query), params)
            connection.commit()
            if cursor.description:
                row = cursor.fetchone()
                return self._row_to_dict(cursor, row) if row is not None else None
            return None

    def _fetch(self, query: str, parameters: Sequence[Any] | Mapping[str, Any]) -> list[dict[str, Any]]:
        with self._connection_factory() as connection:
            cursor = connection.cursor()
            params = self._coerce_params(parameters)
            cursor.execute(self._normalize_query(query), params)
            rows = cursor.fetchall()
            return [self._row_to_dict(cursor, row) for row in rows]

    def _normalize_query(self, query: str) -> str:
        """Translate EXEC calls and pyodbc placeholders to PostgreSQL-safe SQL."""
        normalized = _translate_exec_to_pg_select(query)
        if '?' in normalized:
            return _QMARK_PARAM_RE.sub('%s', normalized)
        return normalized

    def _coerce_params(self, parameters: Sequence[Any] | Mapping[str, Any]) -> list[Any]:
        if isinstance(parameters, Mapping):
            return [parameters[key] for key in parameters]
        return list(parameters)

    def _row_to_dict(self, cursor: Any, row: Any) -> dict[str, Any]:
        columns = [col.name for col in (cursor.description or [])]
        return {
            columns[index]: self._normalize_value(value)
            for index, value in enumerate(row)
        }

    def _normalize_value(self, value: Any) -> Any:
        isoformat = getattr(value, 'isoformat', None)
        if callable(isoformat):
            try:
                return isoformat()
            except TypeError:
                return value
        return value