from __future__ import annotations

from typing import Any


class AIEngineRetrievalNamespace:
    """Repo retrieval and symbol-query surface for the AI Engine SDK."""

    def __init__(self, client: Any) -> None:
        self.client = client

    def get_symbol_definition(self, **kwargs: Any) -> dict[str, Any] | None:
        return self.client.request("GET", "/api/repo/symbols/definition", query=kwargs)

    def get_related_code(self, **kwargs: Any) -> dict[str, Any] | None:
        return self.client.request("GET", "/api/repo/symbols/related", query=kwargs)

    def query(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("POST", "/api/repo/query", json=kwargs)

    def search_symbols(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/repo/symbols/search", query=kwargs)

    def get_code_file(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/repo/code-files/file", query=kwargs)

    def get_code_file_content_window(self, file_id: str, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", f"/api/repo/code-files/{file_id}/window", query=kwargs)

    def search_codebase(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/repo/search", query=kwargs)
