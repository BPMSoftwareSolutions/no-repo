from __future__ import annotations

import json
import uuid
from datetime import timezone, datetime
from typing import Any


class CommunicationRowMappers:
    """Shared row-cleaning and row-projection helpers for communication stores."""

    @staticmethod
    def clean_text(value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

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

    @staticmethod
    def coerce_row(value: Any) -> dict[str, Any] | None:
        return value if isinstance(value, dict) else None

    @classmethod
    def thread_row(cls, row: Any) -> dict[str, Any] | None:
        row = cls.coerce_row(row)
        if row is None:
            return None
        return {
            "communication_thread_id": row.get("communication_thread_id"),
            "workflow_run_id": cls.normalize_uuid_value(row.get("workflow_run_id"), allow_none=True),
            "parent_thread_id": cls.normalize_uuid_value(row.get("parent_thread_id"), allow_none=True),
            "thread_type": cls.clean_text(row.get("thread_type")),
            "subject": cls.clean_text(row.get("subject")),
            "objective": cls.clean_text(row.get("objective")),
            "status": cls.clean_text(row.get("status")),
            "metadata": cls.json_payload(row.get("metadata_json") or row.get("metadata")),
            "created_at": cls.timestamp(row.get("created_at")),
            "updated_at": cls.timestamp(row.get("updated_at")),
        }

    @classmethod
    def message_row(cls, row: Any) -> dict[str, Any] | None:
        row = cls.coerce_row(row)
        if row is None:
            return None
        return {
            "communication_message_id": row.get("communication_message_id"),
            "communication_thread_id": row.get("communication_thread_id"),
            "sender_agent_session_id": cls.normalize_uuid_value(row.get("sender_agent_session_id"), allow_none=True),
            "recipient_agent_session_id": cls.normalize_uuid_value(row.get("recipient_agent_session_id"), allow_none=True),
            "recipient_role_key": cls.clean_text(row.get("recipient_role_key")),
            "message_kind": cls.clean_text(row.get("message_kind")),
            "message_status": cls.clean_text(row.get("message_status")),
            "body_markdown": row.get("body_markdown"),
            "payload": cls.json_payload(row.get("payload_json") or row.get("payload")),
            "scope": cls.json_payload(row.get("scope_json") or row.get("scope")),
            "required_response_schema": cls.json_payload(row.get("required_response_schema_json") or row.get("required_response_schema")),
            "metadata": cls.json_payload(row.get("metadata_json") or row.get("metadata")),
            "created_at": cls.timestamp(row.get("created_at")),
            "updated_at": cls.timestamp(row.get("updated_at")),
        }

    @classmethod
    def transfer_packet_row(cls, row: Any) -> dict[str, Any] | None:
        row = cls.coerce_row(row)
        if row is None:
            return None
        return {
            "work_transfer_packet_id": row.get("work_transfer_packet_id"),
            "workflow_run_id": cls.normalize_uuid_value(row.get("workflow_run_id"), allow_none=True),
            "transfer_kind": cls.clean_text(row.get("transfer_kind")),
            "lifecycle_status": cls.clean_text(row.get("lifecycle_status")),
            "selected_mode": cls.clean_text(row.get("selected_mode")),
            "recipient_mode": cls.clean_text(row.get("recipient_mode")),
            "target_type": cls.clean_text(row.get("target_type")),
            "target_value": cls.clean_text(row.get("target_value")),
            "objective": cls.clean_text(row.get("objective")),
            "requested_outcome": cls.clean_text(row.get("requested_outcome")),
            "payload": cls.json_payload(row.get("payload_json") or row.get("payload")),
            "evidence_packet": cls.json_payload(row.get("evidence_packet_json") or row.get("evidence_packet")),
            "metadata": cls.json_payload(row.get("metadata_json") or row.get("metadata")),
            "created_at": cls.timestamp(row.get("created_at")),
            "updated_at": cls.timestamp(row.get("updated_at")),
        }

    @classmethod
    def handoff_row(cls, row: Any) -> dict[str, Any] | None:
        row = cls.coerce_row(row)
        if row is None:
            return None
        return {
            "handoff_id": row.get("handoff_id"),
            "workflow_run_id": cls.normalize_uuid_value(row.get("workflow_run_id"), allow_none=True),
            "agent_session_id": cls.normalize_uuid_value(row.get("agent_session_id"), allow_none=True),
            "handoff_kind": cls.clean_text(row.get("handoff_kind")),
            "handoff_priority": cls.clean_text(row.get("handoff_priority")),
            "title": cls.clean_text(row.get("title")),
            "summary_text": row.get("summary_text"),
            "handoff_payload": cls.json_payload(row.get("handoff_payload_json") or row.get("handoff_payload")),
            "status": cls.clean_text(row.get("status")),
            "created_at": cls.timestamp(row.get("created_at")),
            "updated_at": cls.timestamp(row.get("updated_at")),
        }


clean_text = CommunicationRowMappers.clean_text
normalize_uuid_value = CommunicationRowMappers.normalize_uuid_value
serialize_json = CommunicationRowMappers.serialize_json
json_payload = CommunicationRowMappers.json_payload
timestamp = CommunicationRowMappers.timestamp
current_timestamp = CommunicationRowMappers.current_timestamp
thread_row = CommunicationRowMappers.thread_row
message_row = CommunicationRowMappers.message_row
transfer_packet_row = CommunicationRowMappers.transfer_packet_row
handoff_row = CommunicationRowMappers.handoff_row
