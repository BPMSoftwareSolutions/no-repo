from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class _ReportsNamespace:
    client: "AIEngineClient"

    def run(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.client.run_report_definition(request)


@dataclass(slots=True)
class _ProjectionsNamespace:
    client: "AIEngineClient"

    def render(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.client.render_projection(request)


@dataclass(slots=True)
class _RetrievalNamespace:
    client: "AIEngineClient"

    def get_symbol_definition(self, **kwargs: Any) -> dict[str, Any] | None:
        return self.client.get_symbol_definition(**kwargs)

    def get_related_code(self, **kwargs: Any) -> dict[str, Any] | None:
        return self.client.get_related_code(**kwargs)


@dataclass(slots=True)
class _RepoInventoryNamespace:
    client: "AIEngineClient"

    def list_repositories(self, *, limit: int = 50) -> dict[str, Any]:
        return self.client.list_repositories(limit=limit)

    def list_code_files(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.list_code_files(**kwargs)


@dataclass(slots=True)
class _AgentCommsNamespace:
    client: "AIEngineClient"

    def open_thread(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.client.open_communication_thread(request)

    def send_message(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.client.send_communication_message(request)


class AIEngineClient:
    """
    Composition-root draft for the SDK client.

    The backend agent should split the current monolith into smaller modules
    and preserve these namespace surfaces as compatibility shims.
    """

    def __init__(self, **kwargs: Any) -> None:
        self._transport = kwargs.get("transport")
        self._config = kwargs
        self.reports = _ReportsNamespace(self)
        self.projections = _ProjectionsNamespace(self)
        self.retrieval = _RetrievalNamespace(self)
        self.repo_inventory = _RepoInventoryNamespace(self)
        self.agent_comms = _AgentCommsNamespace(self)

    @classmethod
    def fromEnv(cls) -> "AIEngineClient":
        return cls()

    def ping(self) -> dict[str, Any]:
        return self._request("GET", "/api/ping")

    def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        raise NotImplementedError("Wire this draft to the existing client transport.")

    def run_report_definition(self, request: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/api/reports/run", json=request)

    def render_projection(self, request: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/api/projections/render", json=request)

    def get_symbol_definition(self, **kwargs: Any) -> dict[str, Any] | None:
        return self._request("GET", "/api/repo/symbols/definition", query=kwargs)

    def get_related_code(self, **kwargs: Any) -> dict[str, Any] | None:
        return self._request("GET", "/api/repo/symbols/related", query=kwargs)

    def list_repositories(self, *, limit: int = 50) -> dict[str, Any]:
        return self._request("GET", "/api/repo/repositories", query={"limit": limit})

    def list_code_files(self, **kwargs: Any) -> dict[str, Any]:
        return self._request("GET", "/api/repo/code-files", query=kwargs)

    def open_communication_thread(self, request: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/api/communications/threads", json=request)

    def send_communication_message(self, request: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/api/communications/messages", json=request)
