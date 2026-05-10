from __future__ import annotations

from typing import Any, Protocol


class CommunicationTransferStore(Protocol):
    def list_communication_transfer_packets(self, *, workflow_run_id: str | None = None) -> list[dict[str, Any]]: ...
    def get_communication_transfer_packet(self, work_transfer_packet_id: str) -> dict[str, Any] | None: ...


class CommunicationTransferRepository:
    def __init__(self, store: CommunicationTransferStore) -> None:
        self.store = store

    def list_packets(self, *, workflow_run_id: str | None = None) -> list[dict[str, Any]]:
        return self.store.list_communication_transfer_packets(workflow_run_id=workflow_run_id)

    def get_packet(self, work_transfer_packet_id: str) -> dict[str, Any] | None:
        return self.store.get_communication_transfer_packet(work_transfer_packet_id)
