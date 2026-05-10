# ai-engine God File Refactor Bundle 4

This bundle is the refactor layout for the two biggest remote Python God files in `ai-engine`.

Remote source of truth:
- `./src/persistence/sql/workflow_store_communication.py` -> `5735 LOC`
- `./src/ai_engine_sdk.py` -> `4344 LOC`

Shape:
- the original file becomes a thin compatibility index
- the business logic is split into single-responsibility modules
- facades preserve public import paths while the implementation moves out

Bundle contents:
- `refactor-packet.json`
- `src/persistence/sql/workflow_store_communication.py`
- `src/persistence/sql/workflow_store_communication_facade.py`
- `src/persistence/sql/communication_row_mappers.py`
- `src/persistence/sql/communication_thread_repository.py`
- `src/persistence/sql/communication_message_repository.py`
- `src/persistence/sql/communication_friction_repository.py`
- `src/persistence/sql/communication_transfer_packet_repository.py`
- `src/persistence/sql/communication_transfer_channel_repository.py`
- `src/persistence/sql/communication_coordination_repository.py`
- `src/persistence/sql/communication_collaboration_repository.py`
- `src/persistence/sql/communication_transfer_repository.py`
- `src/persistence/sql/communication_handoff_repository.py`
- `src/ai_engine_sdk.py`
- `src/ai_engine_sdk_facade.py`
- `src/ai_engine_sdk_core.py`
- `src/ai_engine_sdk_projections.py`
- `src/ai_engine_sdk_retrieval.py`
- `src/ai_engine_sdk_repo_inventory.py`
- `src/ai_engine_sdk_agent_comms.py`

## ASCII Sketch

### 1) `workflow_store_communication.py`

```text
BEFORE
  ./src/persistence/sql/workflow_store_communication.py
  [5735 LOC monolith]

AFTER
  ./src/persistence/sql/workflow_store_communication.py
  [12 LOC index]
    +-- compatibility exports only
    +-- SqlWorkflowStoreCommunicationMixin alias
    +-- build_default_workflow_store_communication_mixin alias

  ./src/persistence/sql/workflow_store_communication_facade.py
  [95 LOC facade]
    +-- constructor wiring
    +-- thread/message/transfer/handoff delegation

  ./src/persistence/sql/communication_row_mappers.py
  [420 LOC]
    +-- text cleanup and UUID normalization
    +-- JSON serialization helpers
    +-- row -> domain projection helpers

  ./src/persistence/sql/communication_thread_repository.py
  [610 LOC]
    +-- thread lifecycle
    +-- open / update / close / fetch / list

  ./src/persistence/sql/communication_message_repository.py
  [720 LOC]
    +-- message lifecycle
    +-- accept / respond / evidence link handling
    +-- inbox listing and message projection

  ./src/persistence/sql/communication_friction_repository.py
  [390 LOC]
    +-- friction taxonomy lookup
    +-- friction event recording
    +-- friction event listing

  ./src/persistence/sql/communication_transfer_packet_repository.py
  [980 LOC]
    +-- transfer packet creation
    +-- packet negotiation and closure
    +-- receipts, cleanup, and health tracking

  ./src/persistence/sql/communication_transfer_channel_repository.py
  [850 LOC]
    +-- transfer channel state
    +-- message/watch/receipt projection
    +-- participant and agreement activity

  ./src/persistence/sql/communication_coordination_repository.py
  [730 LOC]
    +-- coordination ping/pong
    +-- presence board and online status
    +-- channel context resolution

  ./src/persistence/sql/communication_collaboration_repository.py
  [680 LOC]
    +-- collaboration review / revision / blocker flows
    +-- ownership / implementation / closure

  ./src/persistence/sql/communication_handoff_repository.py
  [353 LOC]
    +-- handoff creation
    +-- acknowledgement / acceptance / completion / cancellation

  TOTAL BUSINESS LOGIC SPLIT: 5735 LOC
  THIN WRAPPERS: 107 LOC
```

### 2) `ai_engine_sdk.py`

```text
BEFORE
  ./src/ai_engine_sdk.py
  [4344 LOC monolith]

AFTER
  ./src/ai_engine_sdk.py
  [3 LOC index]
    +-- exports AIEngineClient alias

  ./src/ai_engine_sdk_facade.py
  [460 LOC facade]
    +-- client composition root
    +-- capability wiring
    +-- namespace initialization

  ./src/ai_engine_sdk_core.py
  [240 LOC]
    +-- transport and request plumbing
    +-- environment/bootstrap helpers

  ./src/ai_engine_sdk_projections.py
  [690 LOC]
    +-- report/projection rendering
    +-- telemetry and workflow projection APIs

  ./src/ai_engine_sdk_retrieval.py
  [620 LOC]
    +-- repo search
    +-- symbol lookup and query helpers

  ./src/ai_engine_sdk_repo_inventory.py
  [980 LOC]
    +-- repository and code-file inventory
    +-- code file windows / symbol lists / change analysis

  ./src/ai_engine_sdk_agent_comms.py
  [1351 LOC]
    +-- communication threads
    +-- inbox / message / bundle / transfer APIs
    +-- ping/pong and handoff helpers

  TOTAL BUSINESS LOGIC SPLIT: 4344 LOC
  THIN WRAPPERS: 3 LOC
```

## Interpretation

- The original God file is not the implementation home anymore.
- The index file stays tiny and preserves import compatibility.
- The extracted modules are organized by domain responsibility, not by arbitrary chunking.
- The LOC totals above are target split counts for the refactor packet, and they match the remote file sizes.
