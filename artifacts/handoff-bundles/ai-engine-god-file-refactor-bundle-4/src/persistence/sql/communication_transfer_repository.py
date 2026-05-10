from __future__ import annotations

from typing import Any, Protocol


class CommunicationTransferStore(Protocol):
    def create_communication_bundle(self, **kwargs: Any) -> dict[str, Any]: ...
    def get_communication_bundle(self, bundle_id: str) -> dict[str, Any] | None: ...
    def list_communication_bundles(self, **kwargs: Any) -> list[dict[str, Any]]: ...
    def add_communication_bundle_item(self, **kwargs: Any) -> dict[str, Any]: ...
    def upload_communication_bundle(self, **kwargs: Any) -> dict[str, Any]: ...
    def attach_communication_bundle_to_message(self, **kwargs: Any) -> dict[str, Any]: ...
    def record_communication_bundle_receipt(self, **kwargs: Any) -> dict[str, Any]: ...
    def record_communication_bundle_cleanup_event(self, **kwargs: Any) -> dict[str, Any]: ...
    def claim_communication_bundle(self, **kwargs: Any) -> dict[str, Any]: ...


class CommunicationTransferRepository:
    def __init__(self, store: CommunicationTransferStore) -> None:
        self.store = store

    def create_bundle(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.create_communication_bundle(**kwargs)

    def get_bundle(self, bundle_id: str) -> dict[str, Any] | None:
        return self.store.get_communication_bundle(bundle_id)

    def list_bundles(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self.store.list_communication_bundles(**kwargs)

    def add_bundle_item(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.add_communication_bundle_item(**kwargs)

    def upload_bundle(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.upload_communication_bundle(**kwargs)

    def attach_bundle_to_message(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.attach_communication_bundle_to_message(**kwargs)

    def record_receipt(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.record_communication_bundle_receipt(**kwargs)

    def record_cleanup_event(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.record_communication_bundle_cleanup_event(**kwargs)

    def claim_bundle(self, **kwargs: Any) -> dict[str, Any]:
        return self.store.claim_communication_bundle(**kwargs)
