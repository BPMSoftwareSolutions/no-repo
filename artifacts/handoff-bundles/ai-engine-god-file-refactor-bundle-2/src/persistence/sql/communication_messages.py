from __future__ import annotations

from typing import Any, Protocol


class CommunicationMessageStore(Protocol):
    def create_communication_message(self, **kwargs: Any) -> dict[str, Any]: ...
    def accept_communication_message(self, communication_message_id: str) -> dict[str, Any]: ...
    def respond_with_evidence(self, **kwargs: Any) -> dict[str, Any]: ...
    def attach_message_evidence(self, **kwargs: Any) -> dict[str, Any]: ...
    def list_message_evidence_links(self, communication_message_id: str) -> list[dict[str, Any]]: ...


class CommunicationMessageRepository:
    def __init__(self, store: CommunicationMessageStore) -> None:
        self.store = store

    def create_message(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.create_communication_message(**kwargs)

    def respond_with_evidence(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.respond_with_evidence(**kwargs)

    def attach_evidence(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.attach_message_evidence(**kwargs)
