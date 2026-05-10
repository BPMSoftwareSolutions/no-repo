from __future__ import annotations

from typing import Any, Protocol


class CommunicationThreadStore(Protocol):
    def open_communication_thread(self, **kwargs: Any) -> dict[str, Any]: ...
    def update_communication_thread_status(self, communication_thread_id: str, *, status: str) -> dict[str, Any]: ...
    def close_communication_thread(self, communication_thread_id: str) -> dict[str, Any]: ...
    def get_communication_thread(self, communication_thread_id: str) -> dict[str, Any] | None: ...
    def list_communication_threads(self, *, limit: int = 100) -> list[dict[str, Any]]: ...


class CommunicationThreadRepository:
    def __init__(self, store: CommunicationThreadStore) -> None:
        self.store = store

    def open_thread(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.open_communication_thread(**kwargs)

    def update_status(self, communication_thread_id: str, *, status: str) -> dict[str, Any]:
        return self.store.update_communication_thread_status(communication_thread_id, status=status)

    def close_thread(self, communication_thread_id: str) -> dict[str, Any]:
        return self.store.close_communication_thread(communication_thread_id)

    def get_thread(self, communication_thread_id: str) -> dict[str, Any] | None:
        return self.store.get_communication_thread(communication_thread_id)

    def list_threads(self, *, limit: int = 100) -> list[dict[str, Any]]:
        return self.store.list_communication_threads(limit=limit)
