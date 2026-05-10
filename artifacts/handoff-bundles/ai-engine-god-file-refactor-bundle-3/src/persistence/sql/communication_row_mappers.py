from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime, timezone
from typing import Any


class CommunicationRowMappers:
    @staticmethod
    def clean_text(value: Any) -> str | None:
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None

    @staticmethod
    def normalize_uuid_value(value: Any, *, field_name: str | None = None, allow_none: bool = False) -> str | None:
        if value in (None, "", "null", "None"):
            return None
        try:
            return str(uuid.UUID(str(value)))
        except (TypeError, ValueError, AttributeError) as exc:
            if allow_none:
                return None
            if field_name:
                raise ValueError(f"{field_name} must be a valid UUID.") from exc
            raise ValueError(f"{value!r} is not a valid UUID.") from exc

    @staticmethod
    def serialize_json(value: Any) -> str | None:
        if value in (None, "", [], {}):
            return None
        return json.dumps(value, ensure_ascii=True, sort_keys=True, default=str)

    @staticmethod
    def json_payload(value: Any) -> Any:
        if value in (None, ""):
            return None
        if isinstance(value, (dict, list)):
            return value
        if isinstance(value, str):
            try:
                return json.loads(value)
            except ValueError:
                return value
        return value

    @staticmethod
    def timestamp(value: Any) -> str | None:
        if value is None:
            return None
        return value.isoformat() if hasattr(value, "isoformat") else str(value)

    @staticmethod
    def current_timestamp() -> str:
        return datetime.now(timezone.utc).isoformat(sep=" ", timespec="seconds")
