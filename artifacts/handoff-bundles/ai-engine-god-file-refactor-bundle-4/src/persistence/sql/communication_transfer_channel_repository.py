from __future__ import annotations

from typing import Any


class CommunicationTransferChannelRepository:
    """Domain slice for transfer-channel projection and participant activity."""

    def __init__(self, store: Any) -> None:
        self.store = store

    def connect_to_transfer_channel(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.connect_to_transfer_channel(**kwargs)

    def list_transfer_channels(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.store.list_communication_channels(**kwargs)

    def list_open_transfer_channels(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.store.list_open_communication_channels(**kwargs)

    def get_transfer_channel_status(self, transfer_channel_id: str) -> dict[str, Any]:
        return self.store.get_communication_channel_status(transfer_channel_id)

    def get_transfer_channel_participants(self, transfer_channel_id: str) -> list[dict[str, Any]]:
        return self.store.get_communication_channel_participants(transfer_channel_id)

    def get_transfer_channel_presence_board(self, transfer_channel_id: str) -> dict[str, Any]:
        return self.store.get_presence_board(transfer_channel_id)

    def get_channel_presence(self, transfer_channel_id: str, participant_id: str) -> dict[str, Any]:
        return self.store.get_channel_presence(transfer_channel_id, participant_id)

    def respond_to_message_watch(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.respond_to_message_watch(**kwargs)

    def get_transfer_channel_snapshot(self, transfer_channel_id: str) -> dict[str, Any]:
        return {
            "channel_status": self.get_transfer_channel_status(transfer_channel_id),
            "participants": self.get_transfer_channel_participants(transfer_channel_id),
            "presence_board": self.get_transfer_channel_presence_board(transfer_channel_id),
        }
