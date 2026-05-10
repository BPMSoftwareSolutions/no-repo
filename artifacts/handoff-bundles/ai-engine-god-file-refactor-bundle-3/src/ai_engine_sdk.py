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

    def open_communication_thread(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.agent_comms.open_thread(request)

    def get_communication_thread(self, thread_id: str) -> dict[str, Any] | None:
        return self.agent_comms.get_thread(thread_id)

    def list_communication_inbox(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.agent_comms.list_inbox(**kwargs)

    def send_communication_message(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.agent_comms.send_message(request)

    def create_communication_bundle(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.agent_comms.create_bundle(request)
