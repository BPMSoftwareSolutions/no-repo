# ai-engine God File Refactor Bundle 2

This bundle is the upstream-ready refactor package for the three largest Python God files identified in the remote `ai-engine` repo.

Targets:
- `./src/orchestration/loga_projection_service.py`
- `./src/persistence/sql/workflow_store_communication.py`
- `./src/ai_engine_sdk.py`

What changes in the draft:
- the original files become thin facades
- behavior-specific logic moves into domain modules
- public entry points stay stable
- helper logic is extracted into focused, single-responsibility modules

Bundle contents:
- `refactor-packet.json`
- `src/orchestration/loga_projection_service.py`
- `src/orchestration/loga_projection_protocols.py`
- `src/orchestration/loga_projection_formatters.py`
- `src/orchestration/loga_projection_rendering.py`
- `src/persistence/sql/workflow_store_communication.py`
- `src/persistence/sql/communication_row_mappers.py`
- `src/persistence/sql/communication_threads.py`
- `src/persistence/sql/communication_messages.py`
- `src/persistence/sql/communication_transfers.py`
- `src/ai_engine_sdk.py`
- `src/ai_engine_sdk_core.py`
- `src/ai_engine_sdk_projections.py`
- `src/ai_engine_sdk_retrieval.py`
- `src/ai_engine_sdk_repo_inventory.py`
- `src/ai_engine_sdk_agent_comms.py`

This is intentionally a handoff package, not an applied repository mutation.
