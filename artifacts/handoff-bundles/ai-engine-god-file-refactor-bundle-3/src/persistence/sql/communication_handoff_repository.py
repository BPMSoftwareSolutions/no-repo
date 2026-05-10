from __future__ import annotations

from typing import Any, Protocol


class CommunicationHandoffStore(Protocol):
    def create_handoff(self, **kwargs: Any) -> dict[str, Any]: ...
    def get_pending_handoff(self, handoff_id: str) -> dict[str, Any] | None: ...
    def acknowledge_handoff(self, handoff_id: str) -> dict[str, Any]: ...
    def accept_handoff(self, handoff_id: str) -> dict[str, Any]: ...
    def complete_handoff(self, handoff_id: str) -> dict[str, Any]: ...
    def cancel_handoff(self, handoff_id: str) -> dict[str, Any]: ...


class CommunicationHandoffRepository:
    def __init__(self, store: CommunicationHandoffStore) -> None:
        self.store = store

    def create_handoff(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.create_handoff(**kwargs)

    def get_pending_handoff(self, handoff_id: str) -> dict[str, Any] | None:
        return self.store.get_pending_handoff(handoff_id)

    def acknowledge_handoff(self, handoff_id: str) -> dict[str, Any]:
        return self.store.acknowledge_handoff(handoff_id)

    def accept_handoff(self, handoff_id: str) -> dict[str, Any]:
        return self.store.accept_handoff(handoff_id)

    def complete_handoff(self, handoff_id: str) -> dict[str, Any]:
        return self.store.complete_handoff(handoff_id)

    def cancel_handoff(self, handoff_id: str) -> dict[str, Any]:
        return self.store.cancel_handoff(handoff_id)
