from __future__ import annotations

from typing import Any

from persistence.sql.communication_messages import CommunicationMessageRepository, CommunicationMessageStore
from persistence.sql.communication_threads import CommunicationThreadRepository, CommunicationThreadStore
from persistence.sql.communication_transfers import CommunicationTransferRepository, CommunicationTransferStore


class SqlWorkflowStoreCommunicationFacade:
    def __init__(
        self,
        *,
        thread_repository: CommunicationThreadRepository,
        message_repository: CommunicationMessageRepository,
        transfer_repository: CommunicationTransferRepository | None = None,
    ) -> None:
        self.thread_repository = thread_repository
        self.message_repository = message_repository
        self.transfer_repository = transfer_repository

    def open_communication_thread(self, **kwargs: Any) -> dict[str, Any]:
        return self.thread_repository.open_thread(**kwargs)

    def create_communication_message(self, **kwargs: Any) -> dict[str, Any]:
        return self.message_repository.create_message(**kwargs)

    def respond_with_evidence(self, **kwargs: Any) -> dict[str, Any]:
        return self.message_repository.respond_with_evidence(**kwargs)

    def attach_message_evidence(self, **kwargs: Any) -> dict[str, Any]:
        return self.message_repository.attach_evidence(**kwargs)


def build_default_workflow_store_communication_facade(
    *,
    thread_store: CommunicationThreadStore,
    message_store: CommunicationMessageStore,
    transfer_store: CommunicationTransferStore | None = None,
) -> SqlWorkflowStoreCommunicationFacade:
    return SqlWorkflowStoreCommunicationFacade(
        thread_repository=CommunicationThreadRepository(thread_store),
        message_repository=CommunicationMessageRepository(message_store),
        transfer_repository=CommunicationTransferRepository(transfer_store) if transfer_store is not None else None,
    )
