from __future__ import annotations

import os
from typing import Any

from ai_engine_sdk_agent_comms import AIEngineAgentCommsNamespace
from ai_engine_sdk_core import AIEngineClientCore
from ai_engine_sdk_projections import AIEngineProjectionNamespace
from ai_engine_sdk_repo_inventory import AIEngineRepoInventoryNamespace
from ai_engine_sdk_retrieval import AIEngineRetrievalNamespace


class AIEngineClientFacade(AIEngineClientCore):
    def __init__(self, **config: Any) -> None:
        super().__init__(**config)
        self.projections = AIEngineProjectionNamespace(self)
        self.retrieval = AIEngineRetrievalNamespace(self)
        self.repo_inventory = AIEngineRepoInventoryNamespace(self)
        self.agent_comms = AIEngineAgentCommsNamespace(self)

    @classmethod
    def fromEnv(cls) -> "AIEngineClientFacade":
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

    def get_communication_bundle(self, bundle_id: str) -> dict[str, Any] | None:
        return self.agent_comms.get_bundle(bundle_id)

    def list_communication_bundles(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.agent_comms.list_bundles(**kwargs)

    def add_communication_bundle_item(self, **kwargs: Any) -> dict[str, Any]:
        return self.agent_comms.add_bundle_item(**kwargs)

    def upload_communication_bundle(self, **kwargs: Any) -> dict[str, Any]:
        return self.agent_comms.upload_bundle(**kwargs)

    def attach_communication_bundle_to_message(self, **kwargs: Any) -> dict[str, Any]:
        return self.agent_comms.attach_bundle_to_message(**kwargs)

    def record_communication_bundle_receipt(self, **kwargs: Any) -> dict[str, Any]:
        return self.agent_comms.record_bundle_receipt(**kwargs)

    def record_communication_bundle_cleanup_event(self, **kwargs: Any) -> dict[str, Any]:
        return self.agent_comms.record_bundle_cleanup_event(**kwargs)

    def claim_communication_bundle(self, **kwargs: Any) -> dict[str, Any]:
        return self.agent_comms.claim_bundle(**kwargs)

    def send_to_participant(self, **kwargs: Any) -> dict[str, Any]:
        return self.agent_comms.send_to_participant(**kwargs)

    def send_to_role(self, **kwargs: Any) -> dict[str, Any]:
        return self.agent_comms.send_to_role(**kwargs)

    def accept_communication_message(self, **kwargs: Any) -> dict[str, Any]:
        return self.agent_comms.accept_message(**kwargs)

    def respond_to_communication_message(self, **kwargs: Any) -> dict[str, Any]:
        return self.agent_comms.respond_to_message(**kwargs)

    def attach_communication_message_evidence(self, **kwargs: Any) -> dict[str, Any]:
        return self.agent_comms.attach_message_evidence(**kwargs)

    def create_communication_handoff(self, **kwargs: Any) -> dict[str, Any]:
        return self.agent_comms.create_handoff(**kwargs)

    def accept_communication_handoff(self, **kwargs: Any) -> dict[str, Any]:
        return self.agent_comms.accept_handoff(**kwargs)

    @classmethod
    def fromEnv(cls) -> "AIEngineClientFacade":
        config: dict[str, Any] = {
            "base_url": os.getenv("AI_ENGINE_BASE_URL"),
            "api_key": os.getenv("AI_ENGINE_API_KEY"),
            "workflow_run_id": os.getenv("AI_ENGINE_WORKFLOW_RUN_ID"),
        }
        return cls(**config)
