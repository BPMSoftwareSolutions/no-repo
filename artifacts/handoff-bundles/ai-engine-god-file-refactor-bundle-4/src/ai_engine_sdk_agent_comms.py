from __future__ import annotations

from typing import Any


class AIEngineAgentCommsNamespace:
    """Agent communication, transfer, inbox, bundle, and handoff surfaces."""

    def __init__(self, client: Any) -> None:
        self.client = client

    def open_thread(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/threads", json=request)

    def get_thread(self, thread_id: str) -> dict[str, Any] | None:
        return self.client.request("GET", f"/api/agent-communications/threads/{thread_id}")

    def list_inbox(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.client.request("GET", "/api/agent-communications/inbox", query=kwargs)

    def send_message(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/messages", json=request)

    def create_bundle(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/bundles", json=request)

    def get_bundle(self, bundle_id: str) -> dict[str, Any] | None:
        return self.client.request("GET", f"/api/agent-communications/bundles/{bundle_id}")

    def list_bundles(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.client.request("GET", "/api/agent-communications/bundles", query=kwargs)

    def add_bundle_item(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/bundles/items", json=kwargs)

    def upload_bundle(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/bundles/upload", json=kwargs)

    def attach_bundle_to_message(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/bundles/attach", json=kwargs)

    def record_bundle_receipt(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/bundles/receipts", json=kwargs)

    def record_bundle_cleanup_event(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/bundles/cleanup-events", json=kwargs)

    def claim_bundle(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/bundles/claim", json=kwargs)

    def send_to_participant(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/participants/send", json=kwargs)

    def send_to_role(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/roles/send", json=kwargs)

    def send_message(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/messages", json=request)

    def accept_transfer_packet(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/transfers/accept", json=kwargs)

    def close_transfer_packet(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/transfers/close", json=kwargs)

    def get_transfer_health(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/agent-communications/transfers/health", query=kwargs)

    def accept_message(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/messages/accept", json=kwargs)

    def respond_to_message(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/messages/respond", json=kwargs)

    def attach_message_evidence(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/messages/evidence", json=kwargs)

    def create_handoff(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/handoffs", json=kwargs)

    def accept_handoff(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/agent-communications/handoffs/accept", json=kwargs)
