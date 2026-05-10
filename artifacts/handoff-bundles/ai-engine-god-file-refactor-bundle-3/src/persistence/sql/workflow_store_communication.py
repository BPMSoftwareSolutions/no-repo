from __future__ import annotations

from typing import Any

from persistence.sql.communication_handoff_repository import CommunicationHandoffRepository, CommunicationHandoffStore
from persistence.sql.communication_message_repository import CommunicationMessageRepository, CommunicationMessageStore
from persistence.sql.communication_thread_repository import CommunicationThreadRepository, CommunicationThreadStore
from persistence.sql.communication_transfer_repository import CommunicationTransferRepository, CommunicationTransferStore


class SqlWorkflowStoreCommunicationFacade:
    def __init__(
        self,
        *,
        thread_repository: CommunicationThreadRepository,
        message_repository: CommunicationMessageRepository,
        transfer_repository: CommunicationTransferRepository,
        handoff_repository: CommunicationHandoffRepository,
    ) -> None:
        self.thread_repository = thread_repository
        self.message_repository = message_repository
        self.transfer_repository = transfer_repository
        self.handoff_repository = handoff_repository

    def open_communication_thread(self, **kwargs: Any) -> dict[str, Any]:
        return self.thread_repository.open_thread(**kwargs)

    def update_communication_thread_status(self, communication_thread_id: str, *, status: str) -> dict[str, Any]:
        return self.thread_repository.update_status(communication_thread_id, status=status)

    def close_communication_thread(self, communication_thread_id: str) -> dict[str, Any]:
        return self.thread_repository.close_thread(communication_thread_id)

    def get_communication_thread(self, communication_thread_id: str) -> dict[str, Any] | None:
        return self.thread_repository.get_thread(communication_thread_id)

    def list_communication_threads(self, *, limit: int = 100) -> list[dict[str, Any]]:
        return self.thread_repository.list_threads(limit=limit)

    def create_communication_message(self, **kwargs: Any) -> dict[str, Any]:
        return self.message_repository.create_message(**kwargs)

    def accept_communication_message(self, communication_message_id: str) -> dict[str, Any]:
        return self.message_repository.accept_message(communication_message_id)

    def respond_with_evidence(self, **kwargs: Any) -> dict[str, Any]:
        return self.message_repository.respond_with_evidence(**kwargs)

    def attach_message_evidence(self, **kwargs: Any) -> dict[str, Any]:
        return self.message_repository.attach_evidence(**kwargs)

    def list_message_evidence_links(self, communication_message_id: str) -> list[dict[str, Any]]:
        return self.message_repository.store.list_message_evidence_links(communication_message_id)

    def list_communication_messages(self, *, limit: int = 100) -> list[dict[str, Any]]:
        return self.message_repository.list_messages(limit=limit)

    def list_communication_inbox(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.message_repository.list_inbox(**kwargs)

    def create_handoff(self, **kwargs: Any) -> dict[str, Any]:
        return self.handoff_repository.create_handoff(**kwargs)

    def get_pending_handoff(self, handoff_id: str) -> dict[str, Any] | None:
        return self.handoff_repository.get_pending_handoff(handoff_id)

    def acknowledge_handoff(self, handoff_id: str) -> dict[str, Any]:
        return self.handoff_repository.acknowledge_handoff(handoff_id)

    def accept_handoff(self, handoff_id: str) -> dict[str, Any]:
        return self.handoff_repository.accept_handoff(handoff_id)

    def complete_handoff(self, handoff_id: str) -> dict[str, Any]:
        return self.handoff_repository.complete_handoff(handoff_id)

    def cancel_handoff(self, handoff_id: str) -> dict[str, Any]:
        return self.handoff_repository.cancel_handoff(handoff_id)


def build_default_workflow_store_communication_facade(
    *,
    thread_store: CommunicationThreadStore,
    message_store: CommunicationMessageStore,
    transfer_store: CommunicationTransferStore,
    handoff_store: CommunicationHandoffStore,
) -> SqlWorkflowStoreCommunicationFacade:
    return SqlWorkflowStoreCommunicationFacade(
        thread_repository=CommunicationThreadRepository(thread_store),
        message_repository=CommunicationMessageRepository(message_store),
        transfer_repository=CommunicationTransferRepository(transfer_store),
        handoff_repository=CommunicationHandoffRepository(handoff_store),
    )
