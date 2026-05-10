from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from orchestration.loga_projection_protocols import ProjectImplementationRoadmapLookup, ProjectStatusLookup
from orchestration.loga_projection_rendering import LogaProjectionRenderer


@dataclass(frozen=True, slots=True)
class ProjectionProvenance:
    source_truth: str
    projection_version: str
    generated_at: str
    correlation_id: str | None = None


class LogaProjectionService:
    def __init__(
        self,
        project_status_lookup: ProjectStatusLookup,
        roadmap_lookup: ProjectImplementationRoadmapLookup,
        renderer: LogaProjectionRenderer | None = None,
    ) -> None:
        self.project_status_lookup = project_status_lookup
        self.roadmap_lookup = roadmap_lookup
        self.renderer = renderer or LogaProjectionRenderer()

    def build_operator_home_projection(self, *, generated_at: str | None = None) -> dict[str, Any]:
        generated_at = generated_at or datetime.now(UTC).isoformat()
        projects = self.project_status_lookup.list_projects(limit=25)
        return {
            "text": self.renderer.render_operator_home(projects=projects, generated_at=generated_at),
            "projection_type": "operator.home",
            "source_truth": "sql",
            "generated_at": generated_at,
            "provenance": ProjectionProvenance("sql", "v1", generated_at),
        }

    def build_project_catalog_projection(self, *, generated_at: str | None = None) -> dict[str, Any]:
        generated_at = generated_at or datetime.now(UTC).isoformat()
        projects = self.project_status_lookup.list_projects(limit=100)
        return {
            "text": self.renderer.render_project_catalog(projects=projects, generated_at=generated_at),
            "projection_type": "operator.project_catalog",
            "source_truth": "sql",
            "generated_at": generated_at,
            "provenance": ProjectionProvenance("sql", "v1", generated_at),
        }


def build_default_loga_projection_service(
    *,
    project_status_lookup: ProjectStatusLookup,
    roadmap_lookup: ProjectImplementationRoadmapLookup,
) -> LogaProjectionService:
    return LogaProjectionService(project_status_lookup, roadmap_lookup)
