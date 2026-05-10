from __future__ import annotations

from typing import Any, Protocol


class ProjectStatusLookup(Protocol):
    def list_projects(
        self,
        *,
        limit: int = 25,
        include_inactive: bool = False,
        process_statuses: list[str] | None = None,
        charter_statuses: list[str] | None = None,
    ) -> list[dict[str, Any]]: ...

    def get_project(self, project_id: str) -> dict[str, Any]: ...


class ProjectImplementationRoadmapLookup(Protocol):
    def get_summary(self, project_id: str | None = None) -> dict[str, Any]: ...
    def get_monitor(self, project_id: str | None = None) -> dict[str, Any]: ...
    def get_active_item(self, project_id: str | None = None) -> dict[str, Any]: ...
    def list_tasks(self, implementation_item_id: str) -> list[dict[str, Any]]: ...
    def list_project_open_tasks(self, project_id: str | None = None) -> list[dict[str, Any]]: ...
