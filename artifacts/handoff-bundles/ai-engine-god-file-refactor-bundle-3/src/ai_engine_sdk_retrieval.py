from __future__ import annotations

from typing import Any


class AIEngineRetrievalNamespace:
    def __init__(self, client: Any) -> None:
        self.client = client

    def get_symbol_definition(self, **kwargs: Any) -> dict[str, Any] | None:
        return self.client.request("GET", "/api/repo/symbols/definition", query=kwargs)

    def get_related_code(self, **kwargs: Any) -> dict[str, Any] | None:
        return self.client.request("GET", "/api/repo/symbols/related", query=kwargs)

    def get_command_card(self, **kwargs: Any) -> dict[str, Any] | None:
        return self.client.request("GET", "/api/commands/card", query=kwargs)

    def resolve_operating_procedure(self, **kwargs: Any) -> dict[str, Any] | None:
        return self.client.request("GET", "/api/commands/procedure", query=kwargs)
