from __future__ import annotations

from typing import Any, Protocol


class CommunicationMessageStore(Protocol):
    def create_communication_message(self, **kwargs: Any) -> dict[str, Any]: ...
    def accept_communication_message(self, communication_message_id: str) -> dict[str, Any]: ...
    def respond_with_evidence(self, **kwargs: Any) -> dict[str, Any]: ...
    def attach_message_evidence(self, **kwargs: Any) -> dict[str, Any]: ...
    def list_message_evidence_links(self, communication_message_id: str) -> list[dict[str, Any]]: ...
    def list_communication_messages(self, *, limit: int = 100) -> list[dict[str, Any]]: ...
    def list_communication_inbox(self, **kwargs: Any) -> list[dict[str, Any]]: ...


class CommunicationMessageRepository:
    """Message lifecycle operations split out of the workflow communication store."""

    def __init__(self, store: CommunicationMessageStore) -> None:
        self.store = store

    def create_message(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.create_communication_message(**kwargs)

    def accept_message(self, communication_message_id: str) -> dict[str, Any]:
        return self.store.accept_communication_message(communication_message_id)

    def respond_with_evidence(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.respond_with_evidence(**kwargs)

    def attach_evidence(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.attach_message_evidence(**kwargs)

    def list_messages(self, *, limit: int = 100) -> list[dict[str, Any]]:
        return self.store.list_communication_messages(limit=limit)

    def list_inbox(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.store.list_communication_inbox(**kwargs)

    def get_message_evidence_links(self, communication_message_id: str) -> list[dict[str, Any]]:
        return self.store.list_message_evidence_links(communication_message_id)

    def acknowledge_message(self, communication_message_id: str) -> dict[str, Any]:
        return self.accept_message(communication_message_id)
