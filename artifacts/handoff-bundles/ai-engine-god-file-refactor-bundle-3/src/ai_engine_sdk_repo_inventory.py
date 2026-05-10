from __future__ import annotations

from typing import Any


class AIEngineRepoInventoryNamespace:
    def __init__(self, client: Any) -> None:
        self.client = client

    def list_repositories(self, *, limit: int = 50) -> dict[str, Any]:
        return self.client.request("GET", "/api/repo/repositories", query={"limit": limit})

    def list_projects(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/repo/projects", query=kwargs)

    def list_code_files(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/repo/code-files", query=kwargs)

    def list_code_symbols_by_file(self, file_id: str, *, limit: int = 500) -> dict[str, Any]:
        return self.client.request("GET", f"/api/repo/files/{file_id}/symbols", query={"limit": limit})
