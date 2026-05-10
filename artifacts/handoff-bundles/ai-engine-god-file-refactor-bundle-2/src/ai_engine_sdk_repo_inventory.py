from __future__ import annotations

from typing import Any


class AIEngineRepoInventoryNamespace:
    def __init__(self, client: Any) -> None:
        self.client = client

    def list_repositories(self, *, limit: int = 50) -> dict[str, Any]:
        return self.client.request("GET", "/api/repo/repositories", query={"limit": limit})

    def list_code_files(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/repo/code-files", query=kwargs)
