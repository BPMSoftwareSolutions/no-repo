from __future__ import annotations

from typing import Any

from ai_engine_sdk_agent_comms import AIEngineAgentCommsNamespace
from ai_engine_sdk_core import AIEngineClientCore
from ai_engine_sdk_projections import AIEngineProjectionNamespace
from ai_engine_sdk_repo_inventory import AIEngineRepoInventoryNamespace
from ai_engine_sdk_retrieval import AIEngineRetrievalNamespace


class AIEngineClient(AIEngineClientCore):
    def __init__(self, **config: Any) -> None:
        super().__init__(**config)
        self.projections = AIEngineProjectionNamespace(self)
        self.retrieval = AIEngineRetrievalNamespace(self)
        self.repo_inventory = AIEngineRepoInventoryNamespace(self)
        self.agent_comms = AIEngineAgentCommsNamespace(self)

    @classmethod
    def fromEnv(cls) -> "AIEngineClient":
        return cls()

    def ping(self) -> dict[str, Any]:
        return self.request("GET", "/api/ping")
