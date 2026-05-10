# Tailored Resume Workflow Remediation Packet

## Status

```text
Discovery: complete
Workflow candidate: found
Core capability surface: partial
Governance: incomplete
Upstream remediation ticket: filed
```

## What We Found

The engine already exposes a resume/job-application workflow candidate:

- Workflow name: `prepare_job_application_packet`
- Workflow slug: `prepare-job-application-packet`
- Workflow ID: `c9f8c0ef-3d49-4024-ba59-54f379ea59f7`
- Workflow candidate ID: `87050e44-867e-4eb5-beee-38a556c5f257`

The candidate is explicitly intended to:

```text
Prepare tailored resume artifacts for a specific job posting.
```

Its current step chain already includes the core resume-generation surfaces:

- `export_docx`
- `tailor_from_url`
- `merge_tailored_resume`
- `markdown_resume_parser`
- `docx_resume_exporter`
- `tailored_resume_release_issue_runner`

## Blocking Gap

The candidate is still blocked because the final step is only a placeholder:

- Missing capability: `generate_tailored_cover_letter`

The current workflow governance readout also shows incomplete required inputs for:

- `intent_gate`
- `structure_gate`
- `human_ai_boundary_gate`
- `risk_governance_gate`
- `design_intent_gate`
- `simulation_gate`

## Live Evidence

### Workflow Candidate Readout

The candidate is currently `draft` with `governance_status: incomplete`.
It reports the resume pipeline as real, but the cover-letter step remains unresolved.

### Capability Catalog

The capability catalog already includes:

- `Tailor Resume For Job Description`
- `Generate Hybrid Resume`
- `Hybrid Resume Processor`
- `Job Description Fetcher`

That means the workflow is not missing the entire resume lane. It is missing the final cover-letter capability and the governance metadata needed for promotion.

### Tool Registry

The current tool registry does not contain a dedicated `generate_tailored_cover_letter` entry.

## Upstream Remediation Filed

```text
ux_gate_remediation_ticket_id: 0b59aca6-3fc3-4754-9fb4-803744adf8ac
projection_type: workflow_candidate.prepare_job_application_packet
source_truth: sql
finding_ids:
- missing-design-intent
- missing-generate_tailored_cover_letter
- missing-human-ai-boundary
- missing-risk-governance
- missing-simulation
```

## Upstream Instruction

The upstream agent should:

1. Add or bind a real `generate_tailored_cover_letter` capability.
2. Convert the workflow candidate from manual placeholder steps into a promotable governed workflow.
3. Populate the missing governance inputs:
   - `workflow_posture`
   - `operator_experience`
   - `ui_pattern`
   - `component_strategy`
   - `ai_can_propose`
   - `ai_can_execute`
   - `requires_human_approval`
   - `escalation_points`
   - `workflow_type`
   - `domain`
   - `expected_outcome`
   - `repeatability`
   - `reversible`
   - `audit_required`
   - `requires_lineage`
   - `risk_level`
   - `entry_conditions_known`
   - `exit_conditions_known`
   - `state_model_defined`
   - `failure_paths_defined`
   - `checkpoints`
   - `scenarios_reviewed`
   - `edge_cases_reviewed`
   - `operator_preview_ready`
   - `dry_run_ready`
4. Re-evaluate the workflow for promotion once the capability and governance inputs are complete.

## Readout

This is not a missing idea.

It is an existing workflow candidate that needs one missing capability and a complete governance envelope before it can be treated as a perfected tailored-resume workflow.
