from __future__ import annotations

from typing import Any


class AIEngineProjectionNamespace:
    """Projection and report surface for the AI Engine SDK."""

    def __init__(self, client: Any) -> None:
        self.client = client

    def render(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.client.request("POST", "/api/projections/render", json=request)

    def run_report_definition(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.client.request("POST", "/api/reports/run", json=request)

    def render_projection(self, request: dict[str, Any]) -> dict[str, Any]:
        return self.render(request)

    def get_latest_memory_projection(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/memory/latest-projection", query=kwargs)

    def get_loga_generated_execution_usability(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/execution/usability", query=kwargs)

    def get_loga_generated_execution_usability_projection(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/execution/usability-projection", query=kwargs)

    def current_workflow_status(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/workflow/current-status", query=kwargs)

    def current_architecture_integrity_status(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/architecture/current-integrity", query=kwargs)

    def current_security_governance_status(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/security/current-governance", query=kwargs)

    def current_codebase_shape_status(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/codebase/current-shape", query=kwargs)

    def get_execution_telemetry_current(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/execution/telemetry/current", query=kwargs)

    def list_execution_process_runs(self, **kwargs: Any) -> dict[str, Any]:
        return self.client.request("GET", "/api/execution/process-runs", query=kwargs)
