from __future__ import annotations

from typing import Any


class AIEngineRepoInventoryNamespace:
    """Repository inventory and code-file discovery surface."""

    def __init__(self, client: Any) -> None:
        self.client = client

    def list_repositories(self, *, limit: int = 50) -> dict[str, Any]:
        return self.client.request("GET", "/api/repo/repositories", query={"limit": limit})

    def list_code_files(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/repo/code-files", query=kwargs)

    def list_code_symbols_by_file(self, file_id: str, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", f"/api/repo/code-files/{file_id}/symbols", query=kwargs)

    def get_change_analysis(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/repo/change-analysis", query=kwargs)

    def list_refactor_candidates(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/repo/refactor-candidates", query=kwargs)

    def search_code_files(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/repo/code-files/search", query=kwargs)
