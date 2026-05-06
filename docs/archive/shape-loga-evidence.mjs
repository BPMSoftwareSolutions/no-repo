const payload = {
  artifact_type: 'gate_ready_loga_projection_experiment_evidence',
  artifact_version: 'loga-experiment-set-2/v1',
  source: 'no-repo/scripts/shape-loga-evidence.mjs',
  generated_at: new Date().toISOString(),
  provenance: {
    produced_by: 'repo-less-loga-projection-simulation',
    authority: 'local_experiment_only',
    submission_status: 'not_submitted',
  },
  contract: {
    execution_type: 'loga_projection_probe',
    intent: 'human_friendly_markdown_ui_projection_validation',
    inputs: {
      selected_experiments: [1],
      project_id: null,
      roadmap_item_key: null,
      workflow_run_id: null,
      evidence_packet_key: null,
    },
    expected_outputs: [
      'loga_projection_operation_log',
      'markdown_contract_quality_observations',
      'human_feedback_instruction',
      'missing_projection_surface_findings',
    ],
    mutation_policy: 'projection_read_and_feedback_only',
  },
  operation_log: [
    {
      operation_id: 'loga_op_001',
      experiment_id: 1,
      experiment_key: 'operator_home_dashboard',
      name: 'Operator Home Dashboard',
      status: 'shape-only',
      inspection_model: {
        goal: 'Show current work clearly.',
        inspect: 'Does it answer what needs attention now?',
        feedback_instruction: 'Make this less like a system dashboard and more like a workspace doorway.',
      },
    },
  ],
  findings: [
    {
      finding_type: 'missing_surface',
      surface: 'prompt_to_loga_markdown_contract_generation',
      impact: 'cannot_ask_ai_engine_to_emit_a_new_arbitrary_markdown_ui_contract_from_the_experiment_prompt',
    },
  ],
  proposed_change_summary: 'Run Experiment 1 against getLogaOperatorHomeProjection(), then use the structured inspection result as feedback for LOGA contract iteration.',
  validation_result: 'shape-only-needs-gate-review',
};

console.log(JSON.stringify(payload, null, 2));
