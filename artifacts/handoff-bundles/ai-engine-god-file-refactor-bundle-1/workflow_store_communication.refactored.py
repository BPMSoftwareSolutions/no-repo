from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timezone
from typing import Any, Protocol


class CommunicationThreadStore(Protocol):
    def open_communication_thread(self, **kwargs: Any) -> dict[str, Any]: ...
    def update_communication_thread_status(self, communication_thread_id: str, *, status: str) -> dict[str, Any]: ...
    def close_communication_thread(self, communication_thread_id: str) -> dict[str, Any]: ...
    def get_communication_thread(self, communication_thread_id: str) -> dict[str, Any] | None: ...
    def list_communication_threads(self, *, limit: int = 100) -> list[dict[str, Any]]: ...


class CommunicationMessageStore(Protocol):
    def create_communication_message(self, **kwargs: Any) -> dict[str, Any]: ...
    def accept_communication_message(self, communication_message_id: str) -> dict[str, Any]: ...
    def respond_with_evidence(self, **kwargs: Any) -> dict[str, Any]: ...
    def attach_message_evidence(self, **kwargs: Any) -> dict[str, Any]: ...
    def list_message_evidence_links(self, communication_message_id: str) -> list[dict[str, Any]]: ...


class CommunicationTransferStore(Protocol):
    def list_communication_transfer_packets(self, *, workflow_run_id: str | None = None) -> list[dict[str, Any]]: ...
    def get_communication_transfer_packet(self, work_transfer_packet_id: str) -> dict[str, Any] | None: ...


@dataclass(frozen=True, slots=True)
class CommunicationRowMappers:
    """Pure row/JSON/UUID helpers extracted from the SQL mixin."""

    @staticmethod
    def clean_text(value: Any) -> str | None:
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None

    @staticmethod
    def normalize_uuid_value(value: Any, *, field_name: str | None = None, allow_none: bool = False) -> str | None:
        if value in (None, "", "null", "None"):
            return None
        try:
            return str(uuid.UUID(str(value)))
        except (TypeError, ValueError, AttributeError) as exc:
            if allow_none:
                return None
            if field_name:
                raise ValueError(f"{field_name} must be a valid UUID.") from exc
            raise ValueError(f"{value!r} is not a valid UUID.") from exc

    @staticmethod
    def serialize_json(value: Any) -> str | None:
        if value in (None, "", [], {}):
            return None
        return json.dumps(value, ensure_ascii=True, sort_keys=True, default=str)

    @staticmethod
    def json_payload(value: Any) -> Any:
        if value in (None, ""):
            return None
        if isinstance(value, (dict, list)):
            return value
        if isinstance(value, str):
            try:
                return json.loads(value)
            except ValueError:
                return value
        return value

    @staticmethod
    def timestamp(value: Any) -> str | None:
        if value is None:
            return None
        return value.isoformat() if hasattr(value, "isoformat") else str(value)


class CommunicationThreadRepository:
    def __init__(self, store: CommunicationThreadStore, mappers: CommunicationRowMappers | None = None) -> None:
        self.store = store
        self.mappers = mappers or CommunicationRowMappers()

    def open_thread(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.open_communication_thread(**kwargs)

    def get_thread(self, communication_thread_id: str) -> dict[str, Any] | None:
        return self.store.get_communication_thread(communication_thread_id)


class CommunicationMessageRepository:
    def __init__(self, store: CommunicationMessageStore) -> None:
        self.store = store

    def create_message(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.create_communication_message(**kwargs)

    def respond_with_evidence(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.respond_with_evidence(**kwargs)


class SqlWorkflowStoreCommunicationFacade:
    def __init__(
        self,
        *,
        thread_repository: CommunicationThreadRepository,
        message_repository: CommunicationMessageRepository,
    ) -> None:
        self.thread_repository = thread_repository
        self.message_repository = message_repository

    def open_communication_thread(self, **kwargs: Any) -> dict[str, Any]:
        return self.thread_repository.open_thread(**kwargs)

    def create_communication_message(self, **kwargs: Any) -> dict[str, Any]:
        return self.message_repository.create_message(**kwargs)

    def respond_with_evidence(self, **kwargs: Any) -> dict[str, Any]:
        return self.message_repository.respond_with_evidence(**kwargs)


def build_default_workflow_store_communication_facade(
    *,
    thread_repository: CommunicationThreadRepository,
    message_repository: CommunicationMessageRepository,
) -> SqlWorkflowStoreCommunicationFacade:
    return SqlWorkflowStoreCommunicationFacade(
        thread_repository=thread_repository,
        message_repository=message_repository,
    )
