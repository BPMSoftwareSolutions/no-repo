from __future__ import annotations

from typing import Any


class CommunicationFrictionRepository:
    """Domain slice for friction taxonomy and friction-event storage."""

    def __init__(self, store: Any) -> None:
        self.store = store

    def list_friction_taxonomy(self, *, category_group: str | None = None, is_active: bool | None = True) -> list[dict[str, Any]]:
        return self.store.list_communication_friction_taxonomy(category_group=category_group, is_active=is_active)

    def record_friction_event(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.record_communication_friction_event(**kwargs)

    def list_friction_events(self, *, workflow_run_id: str | None = None, work_transfer_packet_id: str | None = None) -> list[dict[str, Any]]:
        return self.store.list_communication_friction_events(
            workflow_run_id=workflow_run_id,
            work_transfer_packet_id=work_transfer_packet_id,
        )

    def summarize_friction(self, *, workflow_run_id: str | None = None, work_transfer_packet_id: str | None = None) -> dict[str, int]:
        events = self.list_friction_events(workflow_run_id=workflow_run_id, work_transfer_packet_id=work_transfer_packet_id)
        return {
            "event_count": len(events),
            "promotion_candidate_count": sum(1 for event in events if event.get("promotion_candidate")),
        }
