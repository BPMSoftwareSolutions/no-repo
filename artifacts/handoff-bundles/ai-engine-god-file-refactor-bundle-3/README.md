# ai-engine God File Refactor Bundle 3

This bundle packages the next upstream refactor targets from the remote `ai-engine` repository.

Targets:
- `./src/persistence/sql/workflow_store_communication.py`
- `./src/ai_engine_sdk.py`

Intent:
- preserve public entry points
- split the giant files into domain-specific modules
- keep the original files as thin compatibility facades

Bundle contents:
- `refactor-packet.json`
- `src/persistence/sql/workflow_store_communication.py`
- `src/persistence/sql/communication_row_mappers.py`
- `src/persistence/sql/communication_thread_repository.py`
- `src/persistence/sql/communication_message_repository.py`
- `src/persistence/sql/communication_transfer_repository.py`
- `src/persistence/sql/communication_handoff_repository.py`
- `src/ai_engine_sdk.py`
- `src/ai_engine_sdk_core.py`
- `src/ai_engine_sdk_projections.py`
- `src/ai_engine_sdk_retrieval.py`
- `src/ai_engine_sdk_repo_inventory.py`
- `src/ai_engine_sdk_agent_comms.py`

These drafts are handoff-ready, not applied repository mutations.
