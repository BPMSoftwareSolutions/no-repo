from __future__ import annotations

from typing import Any


class AIEngineAgentCommsNamespace:
    def __init__(self, client: Any) -> None:
        self.client = client

    def open_thread(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.client.request("POST", "/api/communications/threads", json=request)

    def send_message(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.client.request("POST", "/api/communications/messages", json=request)
