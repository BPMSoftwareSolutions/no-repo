from __future__ import annotations

from typing import Any

from orchestration.loga_projection_formatters import escape_attr, format_number


class LogaProjectionRenderer:
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
            f'projection_type: "{escape_attr(projection_type)}"\n'
            f'projection_id: "{escape_attr(projection_id)}"\n'
            f'generated_at: "{escape_attr(generated_at)}"\n'
            f'allowed_actions: "{escape_attr(actions)}"\n'
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
        lines.append(f"Projects tracked: {format_number(len(projects))}\n")
        for project in projects:
            name = escape_attr(project.get("project_name") or project.get("name") or "Unnamed project")
            status = escape_attr(project.get("status") or "unknown")
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
            title = escape_attr(project.get("project_name") or project.get("name") or "Unnamed project")
            lines.append(f"- {title}\n")
        return "".join(lines)
