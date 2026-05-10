from __future__ import annotations

from typing import Any


class AIEngineProjectionNamespace:
    def __init__(self, client: Any) -> None:
        self.client = client

    def render(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.client.request("POST", "/api/projections/render", json=request)

    def get_loga_projection(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.client.request("GET", "/api/operator/projections/home", query=request)
