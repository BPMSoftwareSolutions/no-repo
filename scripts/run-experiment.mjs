import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';
import { randomUUID } from 'node:crypto';

const REQUIRED_ENV = ['AI_ENGINE_API_KEY', 'AI_ENGINE_BASE_URL'];
const DEFAULT_SYMBOL = 'src.orchestration.agent_substrate_service.AgentSubstrateService';
const DEFAULT_DISCOVERY_INTENT = 'Find the symbol responsible for retrieval wrapper service behavior without prior symbol knowledge.';
const EXECUTION_TYPE = 'experiment_probe';
const INTENT = 'code_intelligence_validation';

function requireEnv() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }
}

function summarize(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return { type: 'array', count: value.length };
  if (typeof value !== 'object') return value;

  const keys = Object.keys(value);
  return {
    type: 'object',
    keys: keys.slice(0, 20),
    key_count: keys.length,
  };
}

function buildContract({ qualifiedName, discoveryIntent, relatedIntent, relationshipType }) {
  return {
    contract_id: `contract_${randomUUID()}`,
    contract_version: 'repo-less-experiment/v1',
    execution_type: EXECUTION_TYPE,
    intent: INTENT,
    authority_chain: [
      'sql_truth',
      'governed_retrieval',
      'local_experiment',
      'submitted_evidence',
      'wrapper_mutation',
      'gate_decision',
    ],
    inputs: {
      qualified_name: qualifiedName,
      discovery_intent: discoveryIntent,
      related_intent: relatedIntent,
      relationship_type: relationshipType,
    },
    expected_outputs: [
      'wrapper_execution_record_shape',
      'operation_log',
      'gate_ready_evidence_payload',
      'missing_capability_findings',
    ],
    mutation_policy: 'no_target_repo_mutation',
  };
}

async function record(operationId, name, capability, inputs, action) {
  const startedAt = new Date().toISOString();

  try {
    const result = await action();
    return {
      operation_id: operationId,
      name,
      capability,
      status: 'pass',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      inputs,
      outputs: {
        summary: summarize(result),
      },
    };
  } catch (error) {
    return {
      operation_id: operationId,
      name,
      capability,
      status: 'fail',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      inputs,
      outputs: null,
      error: {
        name: error.name,
        message: error.message,
      },
    };
  }
}

async function recordMissingSurface(operationId, name, capability, inputs, missingSurface) {
  const startedAt = new Date().toISOString();

  return {
    operation_id: operationId,
    name,
    capability,
    status: 'unsupported',
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    inputs,
    outputs: null,
    finding: missingSurface,
  };
}

function classifyCapabilityFindings(operations) {
  return [
    {
      capability: 'known_symbol_lookup',
      status: operations.some((operation) => operation.capability === 'known_symbol_lookup' && operation.status === 'pass')
        ? 'supported'
        : 'blocked-or-untested',
      classification: 'supported_surface',
      detail: 'The SDK exposes getSymbolDefinition() for known symbols and qualified names.',
    },
    {
      capability: 'symbol_graph_related_code',
      status: operations.some((operation) => operation.capability === 'symbol_graph_related_code' && operation.status === 'pass')
        ? 'supported'
        : 'blocked-or-untested',
      classification: 'supported_surface',
      detail: 'The SDK exposes getRelatedCode() for symbol-addressed relationship traversal.',
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
      capability: 'repo_less_discovery_without_symbol_foreknowledge',
      status: 'constrained',
      classification: 'surface_gap',
      detail: 'The current boundary is lookup-first; autonomous discovery is partially blocked without known symbols or repository inventory primitives.',
    },
    {
      capability: 'governed_execution_submission',
      status: 'not_connected',
      classification: 'governance_gap',
      detail: 'This harness emits wrapper-shaped simulation evidence but does not submit to a governed wrapper execution endpoint.',
    },
  ];
}

function buildGateReadyEvidence({ contract, executionRecord, operationLog, findings }) {
  const failedOperations = operationLog.filter((operation) => operation.status === 'fail');
  const unsupportedOperations = operationLog.filter((operation) => operation.status === 'unsupported');
  const missingCapabilities = findings.filter((finding) => finding.classification.endsWith('_gap'));

  return {
    artifact_type: 'gate_ready_repo_less_experiment_evidence',
    artifact_version: 'repo-less-experiment/v1',
    source: 'no-repo/scripts/run-experiment.mjs',
    generated_at: new Date().toISOString(),
    provenance: {
      produced_by: 'repo-less-governed-execution-simulation',
      authority: 'local_experiment_only',
      submission_status: 'not_submitted',
    },
    contract,
    plan_vs_actual: {
      expected_outputs: contract.expected_outputs,
      actual_operations: operationLog.map((operation) => ({
        operation_id: operation.operation_id,
        name: operation.name,
        capability: operation.capability,
        status: operation.status,
      })),
    },
    execution_record: executionRecord,
    operation_log: operationLog,
    findings,
    success: failedOperations.length === 0 && unsupportedOperations.length === 0,
    failure_count: failedOperations.length,
    unsupported_operation_count: unsupportedOperations.length,
    missing_capability_count: missingCapabilities.length,
    proposed_change_summary: 'Promote missing discovery and governed-submission surfaces to first-class AI Engine API capabilities.',
    validation_result: failedOperations.length === 0 && unsupportedOperations.length === 0 && missingCapabilities.length === 0
      ? 'pass'
      : 'needs-gate-review',
  };
}

try {
  requireEnv();
} catch (error) {
  console.error(error.message);
  console.error('Set the required variables, then run: npm run experiment');
  process.exit(1);
}

const client = AIEngineClient.fromEnv();
const qualifiedName = process.env.AI_ENGINE_TEST_SYMBOL || DEFAULT_SYMBOL;
const discoveryIntent = process.env.AI_ENGINE_TEST_DISCOVERY_INTENT || DEFAULT_DISCOVERY_INTENT;
const relatedIntent = process.env.AI_ENGINE_TEST_RELATED_INTENT || 'retrieval wrapper service';
const relationshipType = process.env.AI_ENGINE_TEST_RELATIONSHIP_TYPE || null;
const contract = buildContract({ qualifiedName, discoveryIntent, relatedIntent, relationshipType });
const executionId = `exec_${randomUUID()}`;
const executionStartedAt = new Date().toISOString();

const operationLog = [];

operationLog.push(await record('op_001', 'basic_connectivity.ping', 'connectivity', {}, () => client.ping()));
operationLog.push(await record('op_002', 'basic_connectivity.memory_projection', 'memory_projection', {}, () => client.getLatestMemoryProjection()));
operationLog.push(await recordMissingSurface('op_003', 'code_intelligence.discover_symbol_without_foreknowledge', 'repo_less_symbol_discovery', {
  discovery_intent: discoveryIntent,
}, {
  finding_type: 'missing_surface',
  surface: 'intent_code_search',
  impact: 'repo_less_operator_requires_prior_symbol_knowledge',
  detail: 'No governed SDK method exists for discovering the right symbol from an intent without already knowing a symbol key or qualified name.',
}));
operationLog.push(await record('op_004', 'code_intelligence.symbol_definition', 'known_symbol_lookup', {
  qualified_name: qualifiedName,
  include_code: true,
  max_lines: 120,
}, () => client.getSymbolDefinition({
  qualifiedName,
  includeCode: true,
  maxLines: 120,
  requestedBy: 'repo-less-experiment',
})));
operationLog.push(await record('op_005', 'code_intelligence.related_code', 'symbol_graph_related_code', {
  qualified_name: qualifiedName,
  relationship_type: relationshipType,
  include_code: true,
  max_lines: 80,
}, () => client.getRelatedCode({
  qualifiedName,
  relationshipType,
  includeCode: true,
  maxLines: 80,
  requestedBy: 'repo-less-experiment',
})));

const failedOperations = operationLog.filter((operation) => operation.status === 'fail');
const unsupportedOperations = operationLog.filter((operation) => operation.status === 'unsupported');
const executionRecord = {
  execution_id: executionId,
  execution_type: EXECUTION_TYPE,
  contract_id: contract.contract_id,
  intent: INTENT,
  started_at: executionStartedAt,
  completed_at: new Date().toISOString(),
  status: failedOperations.length === 0 && unsupportedOperations.length === 0 ? 'completed' : 'completed_with_findings',
  inputs: contract.inputs,
  outputs: {
    operation_count: operationLog.length,
    failed_operation_count: failedOperations.length,
    unsupported_operation_count: unsupportedOperations.length,
  },
};
const findings = classifyCapabilityFindings(operationLog);
const payload = buildGateReadyEvidence({
  contract,
  executionRecord,
  operationLog,
  findings,
});

console.log(JSON.stringify({
  experiment: 'repo-less-ai-engine-operator',
  generated_at: new Date().toISOString(),
  contract,
  wrapper_execution_record: executionRecord,
  operation_log: operationLog,
  gate_ready_evidence_payload: payload,
}, null, 2));

if (failedOperations.length > 0) {
  process.exitCode = 1;
}
