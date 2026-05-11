The website should not feel like a normal SaaS dashboard. It should feel like entering a **modernization operating environment**:

```text
Portal
→ guided role onboarding
→ modernization warehouse tour
→ asset intake
→ inventory classification
→ triage
→ modernization workflow
→ governance gates
→ productization
→ distribution
→ continuous improvement
```

And you’re right: the place to start is the **backend data model**, because the portal can only be as powerful as the truth model underneath it.

# The big backend move

We need to define the **Modernization Warehouse data model** as a first-class domain, not just stretch the current code inventory tables.

Your current system already has important foundations: code files, symbols, repositories, relationships, agent sessions, turns, architecture findings, governance rules, and workflow state are already represented in SQL-backed structures. 

But the warehouse needs a higher-level layer above raw code inventory:

```text
raw source asset
→ warehouse intake record
→ classification profile
→ triage decision
→ modernization candidate
→ modernization plan
→ execution run
→ evidence bundle
→ product packet
→ distribution record
→ learning signal
```

That becomes the architecture runway.

# Proposed core schemas

I’d organize this around a new domain namespace:

```text
warehouse.*
```

or, if you want to stay aligned with current boundaries:

```text
inventory.*
decisioning.*
governance.*
ui.*
```

But conceptually, I’d think in **warehouse domain objects**.

---

# 1. Warehouse asset intake

This represents anything entering the portal.

```sql
warehouse.asset_intake_batches
warehouse.asset_intake_items
warehouse.asset_source_locations
```

## `warehouse.asset_intake_batches`

One upload/import/onboarding event.

Fields:

```text
asset_intake_batch_id
submitted_by_actor_session_id
organization_id / workspace_id
intake_source_type
intake_source_label
intake_status
declared_goal
created_at
completed_at
metadata_json
```

Source types:

```text
repo
zip_upload
folder_upload
gist
notebook
model_asset
api_spec
workflow_export
documentation_set
manual_entry
```

## `warehouse.asset_intake_items`

Each raw asset entering the warehouse.

Fields:

```text
asset_intake_item_id
asset_intake_batch_id
raw_asset_type
asset_name
source_uri
content_hash
declared_language
declared_framework
initial_visibility
intake_status
quarantine_status
created_at
metadata_json
```

This lets the portal say:

> “You have brought 42 assets into the warehouse. 31 were code assets, 4 were workflow assets, 3 were model assets, and 4 were documentation assets.”

---

# 2. Asset inventory and classification

This is where raw code becomes structured inventory.

```sql
warehouse.assets
warehouse.asset_classifications
warehouse.asset_capabilities
warehouse.asset_responsibilities
warehouse.asset_dependencies
warehouse.asset_risk_signals
```

## `warehouse.assets`

The canonical warehouse item.

Fields:

```text
asset_id
asset_intake_item_id
canonical_name
asset_kind
domain_label
current_state
maturity_level
reuse_potential_score
modernization_priority_score
business_value_score
risk_score
created_at
updated_at
metadata_json
```

Asset kinds:

```text
codebase
module
script
component
api
workflow
agent_skill
model
dataset
document
template
package
```

Current states:

```text
raw
classified
triaged
candidate
modernizing
governance_review
productized
distributed
archived
retired
```

This is the key abstraction. The code warehouse is not only files. It is **assets**.

## `warehouse.asset_classifications`

Classification results.

Fields:

```text
asset_classification_id
asset_id
classification_type
classification_value
confidence_score
classified_by
classification_run_id
evidence_json
created_at
```

Classification types:

```text
language
framework
domain
architecture_layer
runtime
integration_surface
security_sensitivity
business_function
reuse_category
```

---

# 3. Triage and modernization routing

This is the “what should we do with this?” layer.

```sql
warehouse.triage_runs
warehouse.triage_decisions
warehouse.modernization_candidates
```

## `warehouse.triage_runs`

A triage pass over one or more assets.

Fields:

```text
triage_run_id
asset_intake_batch_id
workflow_run_id
agent_session_id
triage_mode
status
started_at
completed_at
summary_json
```

Triage modes:

```text
initial_intake
reuse_discovery
technical_debt_assessment
security_review
productization_screen
client_onboarding_scan
```

## `warehouse.triage_decisions`

Decision per asset.

Fields:

```text
triage_decision_id
triage_run_id
asset_id
decision_band
decision_reason
recommended_lane
priority
evidence_refs_json
decided_by
created_at
```

Decision bands:

```text
salvage
modernize
package
archive
retire
needs_human_review
blocked
```

Recommended lanes:

```text
classification
retrieval
refactor
test_hardening
security_hardening
api_productization
sdk_productization
workflow_productization
agent_skill_productization
model_packaging
```

This is where the portal can say:

> “This asset is reusable but needs dependency modernization and test hardening before productization.”

---

# 4. Modernization workflow model

This is where the warehouse becomes an execution platform.

```sql
warehouse.modernization_plans
warehouse.modernization_plan_items
warehouse.modernization_runs
warehouse.modernization_run_steps
```

## `warehouse.modernization_plans`

Plan for turning an asset into a product candidate.

Fields:

```text
modernization_plan_id
asset_id
target_product_type
objective
status
created_from_triage_decision_id
workflow_id
implementation_packet_id
created_at
updated_at
plan_json
```

Target product types:

```text
sdk_package
api_service
workflow_pack
agent_skill
saas_module
model_asset
template_pack
internal_tool
```

## `warehouse.modernization_plan_items`

Specific work items.

Fields:

```text
modernization_plan_item_id
modernization_plan_id
item_key
phase_key
title
description
status
depends_on_json
acceptance_checks_json
expected_artifacts_json
created_at
updated_at
```

This mirrors your existing implementation-roadmap thinking, where active packets, roadmap items, workflow runs, and item activity should be persisted in SQL before operator narratives are trusted. 

---

# 5. Wrapper execution and evidence

This connects modernization to governed mutation.

```sql
warehouse.asset_execution_contracts
warehouse.asset_execution_runs
warehouse.asset_execution_operations
warehouse.asset_file_manifests
warehouse.asset_evidence_bundles
```

The governed wrapper principle already fits perfectly: the contract defines the work, the wrapper performs it, the agent orchestrates and monitors, and the gate only trusts wrapper-produced evidence. 

## `warehouse.asset_execution_contracts`

Fields:

```text
asset_execution_contract_id
asset_id
modernization_plan_id
contract_type
contract_status
contract_hash
contract_json
approved_by
approved_at
created_at
```

Contract types:

```text
refactor
dependency_upgrade
test_generation
security_hardening
api_extraction
sdk_packaging
workflow_packaging
documentation_generation
model_packaging
```

## `warehouse.asset_execution_runs`

Fields:

```text
asset_execution_run_id
asset_execution_contract_id
workflow_run_id
wrapper_name
wrapper_version
execution_status
started_at
completed_at
pre_state_hash
post_state_hash
signature
summary_json
```

## `warehouse.asset_execution_operations`

Fields:

```text
asset_execution_operation_id
asset_execution_run_id
sequence
operation_type
operation_status
source_ref
target_ref
started_at
completed_at
evidence_json
```

Operation types:

```text
create_destination_module
extract_symbol_group
rewrite_imports
rewrite_references
remove_source_symbols
run_validation
emit_wrapper_evidence
package_artifact
generate_documentation
security_scan
```

This also enforces the anti-bespoke rule: generic wrapper runtime, JSON contract input, SQL-backed metadata, responsibility maps, and governed evidence — not one-off scripts. 

---

# 6. Governance and quality gates

This is the release trust layer.

```sql
warehouse.quality_gate_runs
warehouse.quality_gate_checks
warehouse.release_readiness_decisions
```

## `warehouse.quality_gate_runs`

Fields:

```text
quality_gate_run_id
asset_id
modernization_plan_id
asset_execution_run_id
gate_profile
gate_status
started_at
completed_at
summary_json
```

Gate profiles:

```text
security
compliance
test_coverage
architecture_integrity
dependency_health
documentation_quality
product_readiness
consumer_impact
```

## `warehouse.quality_gate_checks`

Fields:

```text
quality_gate_check_id
quality_gate_run_id
check_key
check_name
check_status
severity
rationale
evidence_refs_json
created_at
```

## `warehouse.release_readiness_decisions`

Fields:

```text
release_readiness_decision_id
asset_id
product_packet_id
decision_band
rationale
decided_by
decided_at
evidence_refs_json
```

Decision bands:

```text
ready
revise
blocked
waived
retired
```

---

# 7. Product packet and distribution

This is where the warehouse creates value.

```sql
warehouse.product_packets
warehouse.product_packet_artifacts
warehouse.distribution_channels
warehouse.distribution_events
warehouse.downstream_consumers
```

## `warehouse.product_packets`

Fields:

```text
product_packet_id
source_asset_id
modernization_plan_id
packet_type
packet_name
packet_version
packet_status
release_readiness_status
created_at
updated_at
metadata_json
```

Packet types:

```text
sdk_package
api_service
workflow_pack
agent_skill
saas_module
model_asset
template_pack
documentation_pack
```

## `warehouse.product_packet_artifacts`

Fields:

```text
product_packet_artifact_id
product_packet_id
artifact_type
artifact_ref
content_hash
source_truth
created_at
metadata_json
```

Artifact types:

```text
package_manifest
openapi_spec
sdk_bundle
workflow_definition
agent_skill_manifest
model_card
readme_projection
changelog
test_report
security_report
```

## `warehouse.distribution_events`

Fields:

```text
distribution_event_id
product_packet_id
channel
distribution_status
version
published_ref
published_at
published_by
evidence_json
```

Channels:

```text
npm
pypi
github_release
private_registry
api_gateway
internal_catalog
client_portal
marketplace
```

This matches the strategic distribution boundary too: don’t ship the entire engine as a generic embedded library first; use thin clients and stable API/read/retrieval surfaces while keeping mutation behind governed workflows. 

---

# 8. Portal onboarding and tour guide model

This is the human interface.

```sql
portal.onboarding_profiles
portal.onboarding_sessions
portal.tour_routes
portal.tour_stops
portal.tour_progress
portal.role_capability_maps
```

## `portal.onboarding_profiles`

Fields:

```text
onboarding_profile_id
profile_key
role_key
title
description
default_tour_route_id
required_completion_policy_json
created_at
updated_at
```

Role keys:

```text
engineer
architect
devops
client_stakeholder
downstream_consumer
agent_developer
governance_reviewer
sales_engineer
founder_operator
```

## `portal.tour_routes`

Fields:

```text
tour_route_id
route_key
route_name
audience_role
objective
status
created_at
updated_at
metadata_json
```

## `portal.tour_stops`

Fields:

```text
tour_stop_id
tour_route_id
stop_key
stop_order
warehouse_zone
title
focus_question
guide_narration_markdown
required_evidence_refs_json
available_actions_json
completion_check_json
created_at
updated_at
```

Warehouse zones:

```text
tour_start
legacy_intake_dock
inventory_classification
salvage_retrieval
modernization_lab
productization_line
quality_governance_gate
sql_evidence_vault
telemetry_command_center
distribution_hub
continuous_improvement
```

## `portal.tour_progress`

Fields:

```text
tour_progress_id
onboarding_session_id
tour_stop_id
status
started_at
completed_at
response_json
evidence_viewed_json
actions_taken_json
```

This connects to the UI doctrine perfectly: every operator surface should lead with summary/focus, then show recent state, blockers, evidence, and next actions; raw payloads belong in drawers, not up front. 

---

# 9. Projection and navigation layer

The portal should not hardcode every page. It should render governed projections.

```sql
portal.projection_documents
portal.projection_nodes
portal.projection_edges
portal.action_contracts
```

Your LOGA/navigation direction already says markdown should become a navigable workflow surface: SQL truth → governed read model → typed projection → structured markdown → navigation/provenance metadata → document-native workflow surface. 

This is how the website becomes a living world instead of a pile of pages.

## `portal.projection_nodes`

Fields:

```text
projection_node_id
projection_type
entity_type
entity_id
route_path
title
focus_question
source_truth
source_version
created_at
updated_at
```

## `portal.projection_edges`

Fields:

```text
projection_edge_id
source_projection_node_id
target_projection_node_id
relation_type
label
sort_order
metadata_json
```

Relations:

```text
parent
child
next
previous
related_evidence
related_asset
related_plan
related_product
related_consumer
```

---

# The minimum viable architecture runway

I would not build all tables at once. I’d start with **five slices**.

## Slice 1 — Asset intake foundation

Create:

```text
warehouse.asset_intake_batches
warehouse.asset_intake_items
warehouse.assets
warehouse.asset_classifications
```

Goal:

> A legacy project can enter the warehouse and become structured inventory.

## Slice 2 — Triage foundation

Create:

```text
warehouse.triage_runs
warehouse.triage_decisions
warehouse.modernization_candidates
```

Goal:

> The system can decide whether an asset should be salvaged, modernized, packaged, archived, or reviewed.

## Slice 3 — Modernization plan foundation

Create:

```text
warehouse.modernization_plans
warehouse.modernization_plan_items
```

Goal:

> A selected asset gets a concrete modernization roadmap.

## Slice 4 — Evidence and gate foundation

Create:

```text
warehouse.asset_execution_contracts
warehouse.asset_execution_runs
warehouse.quality_gate_runs
warehouse.release_readiness_decisions
```

Goal:

> Modernization becomes governed and evidence-backed.

## Slice 5 — Portal tour foundation

Create:

```text
portal.onboarding_profiles
portal.onboarding_sessions
portal.tour_routes
portal.tour_stops
portal.tour_progress
```

Goal:

> The website can onboard a person through the modernization warehouse as a guided workflow.

# The cleanest north-star data flow

This is the backbone:

```text
Actor
→ Onboarding Session
→ Tour Route
→ Intake Batch
→ Asset
→ Classification
→ Triage Decision
→ Modernization Plan
→ Execution Contract
→ Wrapper Run
→ Evidence Bundle
→ Gate Decision
→ Product Packet
→ Distribution Event
→ Learning Signal
```

That is the world.

# The portal promise

Once the data model exists, the website can say:

> “Bring us your legacy code, prototypes, scripts, workflows, and AI experiments. We’ll classify them, show you what they are, identify what can be reused, guide them through modernization, prove quality with evidence, and turn the best assets into distributable products.”

That is no longer a dashboard.

That is a **modernization platform**.
