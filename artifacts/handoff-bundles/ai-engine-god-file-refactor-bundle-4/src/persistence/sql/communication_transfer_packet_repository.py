from __future__ import annotations

from typing import Any


class CommunicationTransferPacketRepository:
    """Domain slice for transfer packet lifecycle and health tracking."""

    def __init__(self, store: Any) -> None:
        self.store = store

    def create_transfer_packet(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.create_communication_transfer_packet(**kwargs)

    def get_transfer_packet(self, work_transfer_packet_id: str) -> dict[str, Any] | None:
        return self.store.get_communication_transfer_packet(work_transfer_packet_id)

    def list_transfer_packets(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.store.list_communication_transfer_packets(**kwargs)

    def update_transfer_packet_status(self, work_transfer_packet_id: str, **kwargs: Any) -> dict[str, Any]:
        return self.store.update_communication_transfer_packet_status(work_transfer_packet_id, **kwargs)

    def record_transfer_receipt(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.record_communication_transfer_receipt(**kwargs)

    def record_transfer_closure(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.record_communication_transfer_closure(**kwargs)

    def close_transfer_packet(self, work_transfer_packet_id: str, **kwargs: Any) -> dict[str, Any]:
        return self.store.close_communication_transfer_packet(work_transfer_packet_id, **kwargs)

    def get_transfer_health(self, work_transfer_packet_id: str) -> dict[str, Any]:
        return self.store.get_communication_transfer_health(work_transfer_packet_id)

    def ensure_transfer_closed(self, work_transfer_packet_id: str, *, closure_reason: str | None = None) -> dict[str, Any]:
        return self.close_transfer_packet(work_transfer_packet_id, closure_reason=closure_reason)
