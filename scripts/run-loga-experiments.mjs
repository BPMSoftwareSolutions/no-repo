import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';
import { randomUUID } from 'node:crypto';

const REQUIRED_ENV = ['AI_ENGINE_API_KEY', 'AI_ENGINE_BASE_URL'];
const EXECUTION_TYPE = 'loga_projection_probe';
const INTENT = 'human_friendly_markdown_ui_projection_validation';
const REQUIRED_PRIMITIVES = ['::focus', '::panel', '::metric_row', '::nav', '::evidence_drawer', '::next_actions'];
const CANONICAL_QUESTIONS = [
  'What is happening?',
  'What should I care about right now?',
  'What do I need to decide?',
  'Why should I trust this?',
  'What should I do next?',
];
const EXPERIMENT_1_CORRECTION_PAYLOAD = `Experiment 1 failed the LOGA UX contract gate.

Keep:
- endpoint: getLogaOperatorHomeProjection()
- projection_type: operator.home
- loga_contract: ai-engine-ui/v1
- source_truth: sql
- operation status: pass

Fix:
The markdown body must include the required human-friendly LOGA contract blocks:

1. ::focus
Primary question:
"What should I care about right now?"

2. Explicit canonical question sections:
- What is happening?
- What should I care about right now?
- What do I need to decide?
- Why should I trust this?
- What should I do next?

3. ::evidence_drawer
Move raw IDs, source versions, SQL provenance, evidence result, and gate-review details into this drawer.

4. ::next_actions
Include clear operator actions:
- Review gate evidence
- Open active project
- Refresh projection
- Open workflow details

Acceptance:
The projection is not passing Experiment 1 until the markdown text contains:
- ::focus
- ::evidence_drawer
- all five canonical question labels
- ::next_actions

Do not change the endpoint or source truth. This is a markdown projection-shape fix, not an API rewrite.`;
const EXPERIMENT_1_REMEDIATION_INSTRUCTION = `Proceed with Experiment 1 remediation.

Do not add new endpoints.

Update only the operator.home LOGA projection markdown shape so the emitted text includes:
- ::focus
- ::evidence_drawer
- ::next_actions
- all five canonical question labels

Keep SQL as source truth and preserve the existing metadata:
- projection_type: operator.home
- contract: ai-engine-ui/v1
- source_truth: sql

Rerun the LOGA experiment harness after the change. The target is zero Experiment 1 quality gaps.`;
const EXPERIMENT_1_IMPLEMENTATION_INSTRUCTION = `Fix the Experiment 1 failure in the AI Engine projection emitter.

Find the implementation that builds getLogaOperatorHomeProjection() markdown.

Change the operator.home markdown template itself. Do not change the harness.

Required emitted markdown body:

# Operator Home

::focus
question: "What should I care about right now?"
answer: "[summarize current operator priority from SQL projection]"
status: "[pass | needs-gate-review | blocked | unknown]"
::

## What is happening?

::panel
[summarize transport/governance/project/workflow state]
::

## What should I care about right now?

::panel
[summarize active blockers, gate-review needs, or current focus]
::

## What do I need to decide?

::panel
[summarize whether operator approval/review/retry is needed]
::

## Why should I trust this?

::evidence_drawer
- source_truth: sql
- projection_type: operator.home
- contract: ai-engine-ui/v1
- evidence_result: [value]
- correlation_id: [value if present]
- source_version: [value if present]
::

## What should I do next?

::next_actions
- Review gate evidence
- Open active project
- Open workflow details
- Refresh projection
::

Acceptance:
npm test passes.
npm run loga:experiment reports zero Experiment 1 UX contract shape gaps.`;

const EXPERIMENTS = [
  {
    id: 1,
    key: 'operator_home_dashboard',
    name: 'Operator Home Dashboard',
    goal: 'Show current work clearly.',
    inspect: 'Does it answer what needs attention now?',
    feedback_prompt: 'Make this less like a system dashboard and more like a workspace doorway.',
    required_inputs: [],
    run: (client) => client.getLogaOperatorHomeProjection(),
  },
  {
    id: 2,
    key: 'animated_workflow_playback',
    name: 'Animated Workflow Playback',
    goal: 'Render workflow movement and beat flow.',
    inspect: 'Does the sequence feel understandable over time?',
    feedback_prompt: 'Add movement and beat labels and make state transitions more human-readable.',
    required_inputs: ['AI_ENGINE_LOGA_WORKFLOW_RUN_ID'],
    run: (client, inputs) => client.getWorkflowPlayback(inputs.workflowRunId),
  },
  {
    id: 3,
    key: 'project_roadmap_command_center',
    name: 'Project Roadmap Command Center',
    goal: 'Show active item, blockers, and next action.',
    inspect: 'Is the current focus obvious?',
    feedback_prompt: 'Reduce metadata. Lead with current focus, blocker, and next action.',
    required_inputs: ['AI_ENGINE_LOGA_PROJECT_ID'],
    run: (client, inputs) => client.getLogaProjectRoadmapProjection(inputs.projectId),
  },
  {
    id: 4,
    key: 'evidence_trust_drawer',
    name: 'Evidence Trust Drawer',
    goal: 'Keep proof available but not noisy.',
    inspect: 'Is trust easy to inspect without overwhelming the page?',
    feedback_prompt: 'Move raw IDs and payloads behind evidence drawers.',
    required_inputs: ['AI_ENGINE_LOGA_EVIDENCE_PACKET_KEY'],
    run: (client, inputs) => client.getLogaEvidencePacketProjection(inputs.evidencePacketKey),
  },
  {
    id: 5,
    key: 'approval_review_surface',
    name: 'Approval Review Surface',
    goal: 'Help user decide approve, revise, or reject.',
    inspect: 'Is the decision framed cleanly?',
    feedback_prompt: 'Make the approval choice explicit and summarize risk before actions.',
    missing_surface: 'loga_approval_review_projection',
    thinking_mode: 'review',
  },
  {
    id: 6,
    key: 'diagnostic_failure_surface',
    name: 'Diagnostic Failure Surface',
    goal: 'Explain what broke.',
    inspect: 'Can user identify cause and recovery path fast?',
    feedback_prompt: 'Separate symptom, likely cause, and recommended fix.',
    missing_surface: 'loga_diagnostic_failure_projection',
    thinking_mode: 'diagnostic',
  },
  {
    id: 7,
    key: 'execution_live_monitor',
    name: 'Execution Live Monitor',
    goal: 'Show running status.',
    inspect: 'Does it feel alive without being noisy?',
    feedback_prompt: 'Add progress, recent event, and next expected state.',
    missing_surface: 'loga_execution_live_monitor_projection',
    thinking_mode: 'execution',
  },
  {
    id: 8,
    key: 'comparison_before_after_ui',
    name: 'Comparison / Before-After UI',
    goal: 'Compare projection versions.',
    inspect: 'Are changes scannable?',
    feedback_prompt: 'Group changes by user impact, not file/system fields.',
    missing_surface: 'loga_projection_version_comparison',
    thinking_mode: 'evidence',
  },
  {
    id: 9,
    key: 'human_mental_model_workspace',
    name: 'Human Mental Model Workspace',
    goal: 'Convert system hierarchy into workspace hierarchy.',
    inspect: 'Does it feel like projects/tasks/evidence, not tables/runs/IDs?',
    feedback_prompt: 'Use human labels first. Keep IDs only in evidence.',
    missing_surface: 'loga_human_workspace_projection',
  },
  {
    id: 10,
    key: 'polished_demo_projection',
    name: 'Polished Demo Projection',
    goal: 'Combine dashboard, motion, trust, and actions.',
    inspect: 'Is it demo-ready and impressive?',
    feedback_prompt: 'Polish only. Preserve structure, improve clarity, rhythm, and visual flow.',
    missing_surface: 'loga_polished_demo_projection',
  },
];

function requireEnv() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }
}

function parseExperimentSelection() {
  const raw = process.env.AI_ENGINE_LOGA_EXPERIMENTS || '1';
  if (raw.toLowerCase() === 'all') return EXPERIMENTS;

  const selectedIds = raw.split(',').map((value) => Number(value.trim())).filter(Boolean);
  return EXPERIMENTS.filter((experiment) => selectedIds.includes(experiment.id));
}

function getInputs() {
  return {
    projectId: process.env.AI_ENGINE_LOGA_PROJECT_ID || null,
    roadmapItemKey: process.env.AI_ENGINE_LOGA_ROADMAP_ITEM_KEY || null,
    workflowRunId: process.env.AI_ENGINE_LOGA_WORKFLOW_RUN_ID || null,
    evidencePacketKey: process.env.AI_ENGINE_LOGA_EVIDENCE_PACKET_KEY || null,
  };
}

function summarizeProjection(value) {
  const text = typeof value?.text === 'string' ? value.text : '';
  const primitiveResults = REQUIRED_PRIMITIVES.map((primitive) => ({
    primitive,
    present: text.includes(primitive),
  }));
  const canonicalQuestionResults = CANONICAL_QUESTIONS.map((question) => ({
    question,
    present: text.toLowerCase().includes(question.toLowerCase()),
  }));

  return {
    type: typeof value,
    content_type: value?.contentType || null,
    text_char_count: text.length,
    projection_type: value?.projectionType || null,
    loga_contract: value?.logaContract || null,
    interaction_contract: value?.interactionContract || null,
    source_truth: value?.sourceTruth || null,
    correlation_id: value?.correlationId || null,
    primitives: primitiveResults,
    canonical_questions: canonicalQuestionResults,
  };
}

function buildContract({ selectedExperiments, inputs }) {
  return {
    contract_id: `contract_${randomUUID()}`,
    contract_version: 'loga-experiment-set-2/v1',
    execution_type: EXECUTION_TYPE,
    intent: INTENT,
    authority_chain: [
      'sql_truth',
      'governed_loga_projection',
      'local_experiment',
      'submitted_feedback',
      'projection_iteration',
      'readout_decision',
    ],
    inputs: {
      selected_experiments: selectedExperiments.map((experiment) => experiment.id),
      project_id: inputs.projectId,
      roadmap_item_key: inputs.roadmapItemKey,
      workflow_run_id: inputs.workflowRunId,
      evidence_packet_key: inputs.evidencePacketKey,
    },
    expected_outputs: [
      'loga_projection_operation_log',
      'markdown_contract_quality_observations',
      'human_feedback_instruction',
      'missing_projection_surface_findings',
    ],
    mutation_policy: 'projection_read_and_feedback_only',
  };
}

async function recordExperiment(operationId, experiment, inputs, action) {
  const startedAt = new Date().toISOString();

  if (experiment.missing_surface) {
    return {
      operation_id: operationId,
      experiment_id: experiment.id,
      experiment_key: experiment.key,
      name: experiment.name,
      capability: 'loga_projection_surface',
      status: 'unsupported',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      inputs: {},
      outputs: null,
      finding: {
        finding_type: 'missing_surface',
        surface: experiment.missing_surface,
        thinking_mode: experiment.thinking_mode || 'general',
        impact: 'cannot_complete_human_friendly_projection_loop_for_this_experiment',
        feedback_instruction: experiment.feedback_prompt,
      },
    };
  }

  const missingInputs = experiment.required_inputs.filter((name) => !process.env[name]);
  if (missingInputs.length > 0) {
    return {
      operation_id: operationId,
      experiment_id: experiment.id,
      experiment_key: experiment.key,
      name: experiment.name,
      capability: 'loga_projection_surface',
      status: 'blocked',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      inputs: {},
      outputs: null,
      finding: {
        finding_type: 'missing_input',
        inputs: missingInputs,
        impact: 'projection_endpoint_requires_identifier_context',
        feedback_instruction: experiment.feedback_prompt,
      },
    };
  }

  try {
    const result = await action();
    return {
      operation_id: operationId,
      experiment_id: experiment.id,
      experiment_key: experiment.key,
      name: experiment.name,
      capability: 'loga_projection_surface',
      status: 'pass',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      inputs,
      outputs: summarizeProjection(result),
      inspection_model: {
        goal: experiment.goal,
        inspect: experiment.inspect,
        feedback_instruction: experiment.feedback_prompt,
      },
    };
  } catch (error) {
    return {
      operation_id: operationId,
      experiment_id: experiment.id,
      experiment_key: experiment.key,
      name: experiment.name,
      capability: 'loga_projection_surface',
      status: 'fail',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      inputs,
      outputs: null,
      error: {
        name: error.name,
        message: error.message,
        status: error.status || null,
      },
      inspection_model: {
        goal: experiment.goal,
        inspect: experiment.inspect,
        feedback_instruction: experiment.feedback_prompt,
      },
    };
  }
}

function buildFindings(operationLog) {
  const findings = [];

  for (const operation of operationLog) {
    if (operation.finding) findings.push(operation.finding);
    if (operation.status === 'pass') {
      const missingPrimitives = operation.outputs.primitives.filter((item) => !item.present).map((item) => item.primitive);
      if (missingPrimitives.length > 0) {
        findings.push({
          finding_type: 'ux_contract_violation',
          violation_type: 'missing_required_primitives',
          severity: 'block',
          surface: operation.experiment_key,
          expected: missingPrimitives,
          observed: [],
          correction_payload: operation.experiment_key === 'operator_home_dashboard'
            ? EXPERIMENT_1_CORRECTION_PAYLOAD
            : undefined,
          remediation_instruction: operation.experiment_key === 'operator_home_dashboard'
            ? EXPERIMENT_1_REMEDIATION_INSTRUCTION
            : undefined,
          implementation_instruction: operation.experiment_key === 'operator_home_dashboard'
            ? EXPERIMENT_1_IMPLEMENTATION_INSTRUCTION
            : undefined,
        });
      }

      const missingCanonicalQuestions = operation.outputs.canonical_questions
        .filter((item) => !item.present)
        .map((item) => item.question);
      if (missingCanonicalQuestions.length > 0) {
        findings.push({
          finding_type: 'ux_contract_violation',
          violation_type: 'missing_canonical_questions',
          severity: 'block',
          surface: operation.experiment_key,
          expected: missingCanonicalQuestions,
          observed: [],
          correction_payload: operation.experiment_key === 'operator_home_dashboard'
            ? EXPERIMENT_1_CORRECTION_PAYLOAD
            : undefined,
          remediation_instruction: operation.experiment_key === 'operator_home_dashboard'
            ? EXPERIMENT_1_REMEDIATION_INSTRUCTION
            : undefined,
          implementation_instruction: operation.experiment_key === 'operator_home_dashboard'
            ? EXPERIMENT_1_IMPLEMENTATION_INSTRUCTION
            : undefined,
        });
      }
    }
  }

  findings.push({
    finding_type: 'missing_surface',
    surface: 'prompt_to_loga_markdown_contract_generation',
    impact: 'cannot_ask_ai_engine_to_emit_a_new_arbitrary_markdown_ui_contract_from_the_experiment_prompt',
  });

  findings.push({
    finding_type: 'missing_process_surface',
    surface: 'upstream_ticket_creation_for_ux_gate_remediation',
    impact: 'upstream ticket creation for UX gate remediation is not available on the deployed service',
    detail: 'The SDK exposes submitUxGateRemediation(), listUxGateRemediations(), and getUxGateRemediation(), but the deployed API route /api/loga/ux-gate-remediations returned 404.',
  });

  return findings;
}

function buildEvidence({ contract, executionRecord, operationLog, findings }) {
  const failedOperations = operationLog.filter((operation) => operation.status === 'fail');
  const blockedOperations = operationLog.filter((operation) => operation.status === 'blocked');
  const unsupportedOperations = operationLog.filter((operation) => operation.status === 'unsupported');
  const missingSurfaceFindings = findings.filter((finding) => finding.finding_type === 'missing_surface');
  const qualityGapFindings = findings.filter((finding) => finding.finding_type === 'ux_contract_violation');

  return {
    artifact_type: 'gate_ready_loga_projection_experiment_evidence',
    artifact_version: 'loga-experiment-set-2/v1',
    source: 'no-repo/scripts/run-loga-experiments.mjs',
    generated_at: new Date().toISOString(),
    provenance: {
      produced_by: 'repo-less-loga-projection-simulation',
      authority: 'local_experiment_only',
      submission_status: 'not_submitted',
    },
    contract,
    execution_record: executionRecord,
    operation_log: operationLog,
    findings,
    success: failedOperations.length === 0
      && blockedOperations.length === 0
      && unsupportedOperations.length === 0
      && missingSurfaceFindings.length === 0
      && qualityGapFindings.length === 0,
    failure_count: failedOperations.length,
    blocked_operation_count: blockedOperations.length,
    unsupported_operation_count: unsupportedOperations.length,
    missing_surface_finding_count: missingSurfaceFindings.length,
    quality_gap_finding_count: qualityGapFindings.length,
    proposed_change_summary: 'Fix the operator.home LOGA projection emitter template; the evidence loop is complete and API transport is not the blocker.',
    validation_result: failedOperations.length === 0
      && blockedOperations.length === 0
      && unsupportedOperations.length === 0
      && missingSurfaceFindings.length === 0
      && qualityGapFindings.length === 0
      ? 'pass'
      : 'needs-gate-review',
  };
}

try {
  requireEnv();
} catch (error) {
  console.error(error.message);
  console.error('Set the required variables, then run: npm run loga:experiment');
  process.exit(1);
}

const selectedExperiments = parseExperimentSelection();
const inputs = getInputs();
const client = AIEngineClient.fromEnv();
const contract = buildContract({ selectedExperiments, inputs });
const executionId = `exec_${randomUUID()}`;
const startedAt = new Date().toISOString();

const operationLog = [];
for (const [index, experiment] of selectedExperiments.entries()) {
  operationLog.push(await recordExperiment(
    `loga_op_${String(index + 1).padStart(3, '0')}`,
    experiment,
    inputs,
    () => experiment.run(client, inputs),
  ));
}

const findings = buildFindings(operationLog);
const failedOperations = operationLog.filter((operation) => operation.status === 'fail');
const blockedOperations = operationLog.filter((operation) => operation.status === 'blocked');
const unsupportedOperations = operationLog.filter((operation) => operation.status === 'unsupported');
const executionRecord = {
  execution_id: executionId,
  execution_type: EXECUTION_TYPE,
  contract_id: contract.contract_id,
  intent: INTENT,
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  status: failedOperations.length === 0 && blockedOperations.length === 0 && unsupportedOperations.length === 0
    ? 'completed'
    : 'completed_with_findings',
  inputs: contract.inputs,
  outputs: {
    operation_count: operationLog.length,
    failed_operation_count: failedOperations.length,
    blocked_operation_count: blockedOperations.length,
    unsupported_operation_count: unsupportedOperations.length,
  },
};

const evidence = buildEvidence({ contract, executionRecord, operationLog, findings });

console.log(JSON.stringify({
  experiment: 'loga-human-friendly-markdown-ui-projections',
  generated_at: new Date().toISOString(),
  contract,
  wrapper_execution_record: executionRecord,
  operation_log: operationLog,
  gate_ready_evidence_payload: evidence,
}, null, 2));

const blockingFindings = findings.filter((finding) => finding.severity === 'block');
if (failedOperations.length > 0 || blockingFindings.length > 0) {
  process.exitCode = 1;
}
