from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
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


@dataclass(frozen=True, slots=True)
class ProjectionProvenance:
    source_truth: str
    projection_version: str
    generated_at: str
    correlation_id: str | None = None


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _int_value(value: Any, *, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _format_number(value: Any) -> str:
    try:
        return f"{int(value):,}"
    except (TypeError, ValueError):
        return str(value)


def _escape_attr(value: Any) -> str:
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


class LogaProjectionRenderingModule:
    """Rendering helpers extracted from the monolithic LOGA service."""

    def document_header(
        self,
        *,
        projection_type: str,
        projection_id: str,
        generated_at: str,
        allowed_actions: list[str],
    ) -> str:
        actions = ", ".join(allowed_actions) if allowed_actions else "none"
        return (
            "---\n"
            f'projection_type: "{_escape_attr(projection_type)}"\n'
            f'projection_id: "{_escape_attr(projection_id)}"\n'
            f'generated_at: "{_escape_attr(generated_at)}"\n'
            f'allowed_actions: "{_escape_attr(actions)}"\n'
            "---\n"
        )

    def render_operator_home(self, *, projects: list[dict[str, Any]], generated_at: str) -> str:
        lines = [self.document_header(
            projection_type="operator.home",
            projection_id="operator-home:current",
            generated_at=generated_at,
            allowed_actions=["refresh_projection", "open_project", "review_workflow"],
        )]
        lines.append("# Operator Home\n")
        lines.append(f"Projects tracked: {_format_number(len(projects))}\n")
        for project in projects:
            name = _escape_attr(project.get("project_name") or project.get("name") or "Unnamed project")
            status = _escape_attr(project.get("status") or "unknown")
            lines.append(f"- {name} ({status})\n")
        return "".join(lines)

    def render_project_catalog(self, *, projects: list[dict[str, Any]], generated_at: str) -> str:
        lines = [self.document_header(
            projection_type="operator.project_catalog",
            projection_id="operator-project-catalog:current",
            generated_at=generated_at,
            allowed_actions=["open_project", "refresh_projection"],
        )]
        lines.append("# Project Catalog\n")
        for project in projects:
            title = _escape_attr(project.get("project_name") or project.get("name") or "Unnamed project")
            lines.append(f"- {title}\n")
        return "".join(lines)


class LogaProjectionService:
    def __init__(
        self,
        project_status_lookup: ProjectStatusLookup,
        roadmap_lookup: ProjectImplementationRoadmapLookup,
        renderer: LogaProjectionRenderingModule | None = None,
    ) -> None:
        self.project_status_lookup = project_status_lookup
        self.roadmap_lookup = roadmap_lookup
        self.renderer = renderer or LogaProjectionRenderingModule()

    def build_operator_home_projection(self, *, generated_at: str | None = None) -> dict[str, Any]:
        generated_at = generated_at or datetime.now(UTC).isoformat()
        projects = self.project_status_lookup.list_projects(limit=25)
        text = self.renderer.render_operator_home(projects=projects, generated_at=generated_at)
        return {
            "text": text,
            "projection_type": "operator.home",
            "source_truth": "sql",
            "generated_at": generated_at,
            "provenance": ProjectionProvenance(
                source_truth="sql",
                projection_version="v1",
                generated_at=generated_at,
            ),
        }

    def build_project_catalog_projection(self, *, generated_at: str | None = None) -> dict[str, Any]:
        generated_at = generated_at or datetime.now(UTC).isoformat()
        projects = self.project_status_lookup.list_projects(limit=100)
        text = self.renderer.render_project_catalog(projects=projects, generated_at=generated_at)
        return {
            "text": text,
            "projection_type": "operator.project_catalog",
            "source_truth": "sql",
            "generated_at": generated_at,
            "provenance": ProjectionProvenance(
                source_truth="sql",
                projection_version="v1",
                generated_at=generated_at,
            ),
        }


def build_default_loga_projection_service(
    *,
    project_status_lookup: ProjectStatusLookup,
    roadmap_lookup: ProjectImplementationRoadmapLookup,
) -> LogaProjectionService:
    return LogaProjectionService(
        project_status_lookup=project_status_lookup,
        roadmap_lookup=roadmap_lookup,
    )
