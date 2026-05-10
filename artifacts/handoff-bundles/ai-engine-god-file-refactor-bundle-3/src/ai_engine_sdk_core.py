from __future__ import annotations

from typing import Any


class AIEngineClientCore:
    def __init__(self, transport: Any = None, **config: Any) -> None:
        self.transport = transport
        self.config = config

    def request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        raise NotImplementedError("Bind this draft to the existing transport implementation.")
