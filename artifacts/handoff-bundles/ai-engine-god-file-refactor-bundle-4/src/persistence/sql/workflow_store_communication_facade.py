from __future__ import annotations

from typing import Any

from persistence.sql.communication_collaboration_repository import CommunicationCollaborationRepository
from persistence.sql.communication_coordination_repository import CommunicationCoordinationRepository
from persistence.sql.communication_friction_repository import CommunicationFrictionRepository
from persistence.sql.communication_handoff_repository import CommunicationHandoffRepository, CommunicationHandoffStore
from persistence.sql.communication_message_repository import CommunicationMessageRepository, CommunicationMessageStore
from persistence.sql.communication_thread_repository import CommunicationThreadRepository, CommunicationThreadStore
from persistence.sql.communication_transfer_channel_repository import CommunicationTransferChannelRepository
from persistence.sql.communication_transfer_packet_repository import CommunicationTransferPacketRepository
from persistence.sql.communication_transfer_repository import CommunicationTransferRepository, CommunicationTransferStore


class SqlWorkflowStoreCommunicationFacade:
    def __init__(
        self,
        *,
        thread_repository: CommunicationThreadRepository,
        message_repository: CommunicationMessageRepository,
        friction_repository: CommunicationFrictionRepository,
        transfer_packet_repository: CommunicationTransferPacketRepository,
        transfer_channel_repository: CommunicationTransferChannelRepository,
        coordination_repository: CommunicationCoordinationRepository,
        collaboration_repository: CommunicationCollaborationRepository,
        transfer_repository: CommunicationTransferRepository,
        handoff_repository: CommunicationHandoffRepository,
    ) -> None:
        self.thread_repository = thread_repository
        self.message_repository = message_repository
        self.friction_repository = friction_repository
        self.transfer_packet_repository = transfer_packet_repository
        self.transfer_channel_repository = transfer_channel_repository
        self.coordination_repository = coordination_repository
        self.collaboration_repository = collaboration_repository
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

    def list_communication_threads(self, *, workflow_run_id: str, status: str | None = None, parent_thread_id: str | None = None) -> list[dict[str, Any]]:
        return self.thread_repository.list_threads(limit=100)

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

    def list_communication_friction_taxonomy(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.friction_repository.list_friction_taxonomy(**kwargs)

    def record_communication_friction_event(self, **kwargs: Any) -> dict[str, Any]:
        return self.friction_repository.record_friction_event(**kwargs)

    def list_communication_friction_events(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.friction_repository.list_friction_events(**kwargs)

    def create_communication_bundle(self, **kwargs: Any) -> dict[str, Any]:
        return self.transfer_repository.create_bundle(**kwargs)

    def get_communication_bundle(self, bundle_id: str) -> dict[str, Any] | None:
        return self.transfer_repository.get_bundle(bundle_id)

    def list_communication_bundles(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.transfer_repository.list_bundles(**kwargs)

    def add_communication_bundle_item(self, **kwargs: Any) -> dict[str, Any]:
        return self.transfer_repository.add_bundle_item(**kwargs)

    def upload_communication_bundle(self, **kwargs: Any) -> dict[str, Any]:
        return self.transfer_repository.upload_bundle(**kwargs)

    def attach_communication_bundle_to_message(self, **kwargs: Any) -> dict[str, Any]:
        return self.transfer_repository.attach_bundle_to_message(**kwargs)

    def record_communication_bundle_receipt(self, **kwargs: Any) -> dict[str, Any]:
        return self.transfer_repository.record_receipt(**kwargs)

    def record_communication_bundle_cleanup_event(self, **kwargs: Any) -> dict[str, Any]:
        return self.transfer_repository.record_cleanup_event(**kwargs)

    def claim_communication_bundle(self, **kwargs: Any) -> dict[str, Any]:
        return self.transfer_repository.claim_bundle(**kwargs)

    def create_communication_transfer_packet(self, **kwargs: Any) -> dict[str, Any]:
        return self.transfer_packet_repository.create_transfer_packet(**kwargs)

    def get_communication_transfer_packet(self, work_transfer_packet_id: str) -> dict[str, Any] | None:
        return self.transfer_packet_repository.get_transfer_packet(work_transfer_packet_id)

    def list_communication_transfer_packets(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.transfer_packet_repository.list_transfer_packets(**kwargs)

    def update_communication_transfer_packet_status(self, work_transfer_packet_id: str, **kwargs: Any) -> dict[str, Any]:
        return self.transfer_packet_repository.update_transfer_packet_status(work_transfer_packet_id, **kwargs)

    def record_communication_transfer_receipt(self, **kwargs: Any) -> dict[str, Any]:
        return self.transfer_packet_repository.record_transfer_receipt(**kwargs)

    def record_communication_transfer_closure(self, **kwargs: Any) -> dict[str, Any]:
        return self.transfer_packet_repository.record_transfer_closure(**kwargs)

    def close_communication_transfer_packet(self, work_transfer_packet_id: str, **kwargs: Any) -> dict[str, Any]:
        return self.transfer_packet_repository.close_transfer_packet(work_transfer_packet_id, **kwargs)

    def get_communication_transfer_health(self, work_transfer_packet_id: str) -> dict[str, Any]:
        return self.transfer_packet_repository.get_transfer_health(work_transfer_packet_id)

    def connect_to_transfer_channel(self, **kwargs: Any) -> dict[str, Any]:
        return self.transfer_channel_repository.connect_to_transfer_channel(**kwargs)

    def list_communication_channels(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.transfer_channel_repository.list_transfer_channels(**kwargs)

    def list_open_communication_channels(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.transfer_channel_repository.list_open_transfer_channels(**kwargs)

    def get_communication_channel_status(self, transfer_channel_id: str) -> dict[str, Any]:
        return self.transfer_channel_repository.get_transfer_channel_status(transfer_channel_id)

    def get_communication_channel_participants(self, transfer_channel_id: str) -> list[dict[str, Any]]:
        return self.transfer_channel_repository.get_transfer_channel_participants(transfer_channel_id)

    def get_presence_board(self, transfer_channel_id: str) -> dict[str, Any]:
        return self.transfer_channel_repository.get_transfer_channel_presence_board(transfer_channel_id)

    def get_channel_presence(self, transfer_channel_id: str, participant_id: str) -> dict[str, Any]:
        return self.transfer_channel_repository.get_channel_presence(transfer_channel_id, participant_id)

    def respond_to_message_watch(self, **kwargs: Any) -> dict[str, Any]:
        return self.transfer_channel_repository.respond_to_message_watch(**kwargs)

    def start_coordination_ping_pong(self, **kwargs: Any) -> dict[str, Any]:
        return self.coordination_repository.start_coordination_ping_pong(**kwargs)

    def send_coordination_ping(self, **kwargs: Any) -> dict[str, Any]:
        return self.coordination_repository.send_coordination_ping(**kwargs)

    def send_coordination_pong(self, **kwargs: Any) -> dict[str, Any]:
        return self.coordination_repository.send_coordination_pong(**kwargs)

    def get_coordination_ping_pong_status(self, **kwargs: Any) -> dict[str, Any]:
        return self.coordination_repository.get_coordination_ping_pong_status(**kwargs)

    def stop_coordination_ping_pong(self, **kwargs: Any) -> dict[str, Any]:
        return self.coordination_repository.stop_coordination_ping_pong(**kwargs)

    def who_is_online(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.coordination_repository.who_is_online(**kwargs)

    def find_online_participant(self, **kwargs: Any) -> dict[str, Any] | None:
        return self.coordination_repository.find_online_participant(**kwargs)

    def mark_participant_online(self, **kwargs: Any) -> dict[str, Any]:
        return self.coordination_repository.mark_participant_online(**kwargs)

    def mark_participant_offline(self, **kwargs: Any) -> dict[str, Any]:
        return self.coordination_repository.mark_participant_offline(**kwargs)

    def review_collaboration_proposal(self, **kwargs: Any) -> dict[str, Any]:
        return self.collaboration_repository.review_collaboration_proposal(**kwargs)

    def revise_collaboration_proposal(self, **kwargs: Any) -> dict[str, Any]:
        return self.collaboration_repository.revise_collaboration_proposal(**kwargs)

    def raise_collaboration_blocker(self, **kwargs: Any) -> dict[str, Any]:
        return self.collaboration_repository.raise_collaboration_blocker(**kwargs)

    def begin_collaboration_implementation(self, **kwargs: Any) -> dict[str, Any]:
        return self.collaboration_repository.begin_collaboration_implementation(**kwargs)

    def request_collaboration_closure(self, **kwargs: Any) -> dict[str, Any]:
        return self.collaboration_repository.request_collaboration_closure(**kwargs)

    def bootstrap_communication(self, **kwargs: Any) -> dict[str, Any]:
        return self.collaboration_repository.bootstrap_communication(**kwargs)

    def negotiate_communication_transfer(self, **kwargs: Any) -> dict[str, Any]:
        return self.collaboration_repository.negotiate_communication_transfer(**kwargs)

    def resolve_communication_target(self, **kwargs: Any) -> dict[str, Any]:
        return self.collaboration_repository.resolve_communication_target(**kwargs)

    def create_communication_evidence_packet(self, **kwargs: Any) -> dict[str, Any]:
        return self.collaboration_repository.create_communication_evidence_packet(**kwargs)

    def transfer_work_packet(self, **kwargs: Any) -> dict[str, Any]:
        return self.collaboration_repository.transfer_work_packet(**kwargs)

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
    friction_store: Any,
    transfer_packet_store: Any,
    transfer_channel_store: Any,
    coordination_store: Any,
    collaboration_store: Any,
    transfer_store: CommunicationTransferStore,
    handoff_store: CommunicationHandoffStore,
) -> SqlWorkflowStoreCommunicationFacade:
    return SqlWorkflowStoreCommunicationFacade(
        thread_repository=CommunicationThreadRepository(thread_store),
        message_repository=CommunicationMessageRepository(message_store),
        friction_repository=CommunicationFrictionRepository(friction_store),
        transfer_packet_repository=CommunicationTransferPacketRepository(transfer_packet_store),
        transfer_channel_repository=CommunicationTransferChannelRepository(transfer_channel_store),
        coordination_repository=CommunicationCoordinationRepository(coordination_store),
        collaboration_repository=CommunicationCollaborationRepository(collaboration_store),
        transfer_repository=CommunicationTransferRepository(transfer_store),
        handoff_repository=CommunicationHandoffRepository(handoff_store),
    )
