const payload = {
  artifact_type: 'gate_ready_repo_less_experiment_evidence',
  artifact_version: 'repo-less-experiment/v1',
  source: 'no-repo/scripts/shape-evidence.mjs',
  generated_at: new Date().toISOString(),
  provenance: {
    produced_by: 'repo-less-governed-execution-simulation',
    authority: 'local_experiment_only',
    submission_status: 'not_submitted',
  },
  contract: {
    execution_type: 'experiment_probe',
    intent: 'code_intelligence_validation',
    inputs: {
      qualified_name: 'src.orchestration.agent_substrate_service.AgentSubstrateService',
      discovery_intent: 'Find the symbol responsible for retrieval wrapper service behavior without prior symbol knowledge.',
      related_intent: 'retrieval wrapper service',
      relationship_type: null,
    },
    expected_outputs: [
      'wrapper_execution_record_shape',
      'operation_log',
      'gate_ready_evidence_payload',
      'missing_capability_findings',
    ],
    mutation_policy: 'no_target_repo_mutation',
  },
  plan_vs_actual: {
    planned_operations: [
      'basic_connectivity.ping',
      'basic_connectivity.memory_projection',
      'code_intelligence.discover_symbol_without_foreknowledge',
      'code_intelligence.symbol_definition',
      'code_intelligence.related_code',
    ],
    actual_operations: [],
    status: 'shape-only',
  },
  execution_record: {
    execution_id: null,
    status: 'not_run',
    inputs: {},
    outputs: {},
  },
  operation_log: [],
  findings: [
    {
      capability: 'surface_hygiene',
      status: 'ready',
      classification: 'supported_surface',
      detail: 'Workspace uses the npm client and documented API calls rather than target repository checkout.',
    },
    {
      capability: 'mutation_boundary',
      status: 'ready',
      classification: 'supported_surface',
      detail: 'Local scripts shape evidence only; they do not mutate target code.',
    },
    {
      capability: 'intent_based_code_search',
      status: 'missing',
      classification: 'surface_gap',
      finding_type: 'missing_surface',
      surface: 'intent_code_search',
      impact: 'repo_less_operator_requires_prior_symbol_knowledge',
      detail: 'The current SDK has no free-text intent-search method for repo-less discovery.',
    },
    {
      capability: 'governed_execution_submission',
      status: 'not_connected',
      classification: 'governance_gap',
      detail: 'This payload is gate-ready in shape, but it has not been submitted through a wrapper execution endpoint.',
    },
  ],
  proposed_change_summary: 'Add governed discovery and evidence-submission surfaces so repo-less work can move from simulation to accepted wrapper evidence.',
  validation_result: 'shape-only-needs-gate-review',
};

console.log(JSON.stringify(payload, null, 2));
