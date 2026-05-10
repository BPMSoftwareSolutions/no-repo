from __future__ import annotations

from typing import Any


class AIEngineAgentCommsNamespace:
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
