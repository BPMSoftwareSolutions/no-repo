# ai-engine God File Refactor Bundle

This bundle packages remote-only analysis results and implementation drafts for the AI Engine repo.

Scope:
- `./src/orchestration/loga_projection_service.py`
- `./src/persistence/sql/workflow_store_communication.py`
- `./src/ai_engine_sdk.py`

Bundle purpose:
- give the upstream backend agent a concrete single-responsibility split
- preserve compatibility while extracting domain-specific modules
- keep the local no-repo workspace isolated from the target repository

Bundle contents:
- `refactor-packet.json`
- `loga_projection_service.refactored.py`
- `workflow_store_communication.refactored.py`
- `ai_engine_sdk.refactored.py`

High-level split:
- projection contracts and rendering helpers move out of the giant LOGA service
- communication store row mapping and lifecycle code split into thread/message/evidence/transfer concerns
- the SDK façade becomes a composition root over smaller namespaces

Important:
- these are implementation drafts, not applied patches
- the bundle is intended for the backend AI Engine agent to integrate into the real repository
- no local AI-agent repository files were modified here
