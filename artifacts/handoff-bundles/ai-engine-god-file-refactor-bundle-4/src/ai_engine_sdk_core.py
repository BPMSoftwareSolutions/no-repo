from __future__ import annotations

import os
from typing import Any


class AIEngineClientCore:
    """Transport core for the SDK facade and namespace clients."""

    def __init__(self, transport: Any = None, **config: Any) -> None:
        self.transport = transport
        self.config = config

    def request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        if self.transport is None:
            raise NotImplementedError("Bind this draft to the existing transport implementation.")
        if hasattr(self.transport, "request"):
            return self.transport.request(method, path, **kwargs)
        raise NotImplementedError("Transport does not expose a request method.")

    @classmethod
    def from_env_config(cls, *, transport: Any = None) -> "AIEngineClientCore":
        config = {
            "base_url": os.getenv("AI_ENGINE_BASE_URL"),
            "api_key": os.getenv("AI_ENGINE_API_KEY"),
            "workflow_run_id": os.getenv("AI_ENGINE_WORKFLOW_RUN_ID"),
            "repository_root": os.getenv("AI_ENGINE_REPOSITORY_ROOT"),
        }
        return cls(transport=transport, **config)

    def with_override(self, **overrides: Any) -> "AIEngineClientCore":
        merged = dict(self.config)
        merged.update(overrides)
        return type(self)(transport=self.transport, **merged)

    def get_config_value(self, key: str, default: Any = None) -> Any:
        return self.config.get(key, default)
