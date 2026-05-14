import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const client = AIEngineClient.fromEnv();

const REPO_ID = 'f3f44a2c-7bd2-4a72-9718-26924bd3b407';

async function safe(label, fn) {
  try {
    const result = await fn();
    process.stdout.write(` done\n`);
    return result;
  } catch (e) {
    process.stdout.write(` skipped (${e.message?.slice(0, 60)})\n`);
    return null;
  }
}

// Load prior file list from taxonomy run
const priorData = JSON.parse(readFileSync(join(__dirname, '../outputs/engine-file-taxonomy.json'), 'utf8'));
const allFiles = priorData.files;

// Pick representative files to inspect symbols for
const SAMPLE_TARGETS = [
  // persistence stores (highest value)
  './src/persistence/sql/workflow_store.py',
  './src/persistence/sql/execution_telemetry_store.py',
  './src/persistence/sql/governance_claim_store.py',
  './src/persistence/sql/audio_rendering_store.py',
  './src/persistence/sql/communication_messages.py',
  './src/persistence/sql/retrieval_wrapper_store.py',
  './src/persistence/sql/architecture_integrity_store.py',
  // orchestration (flat layer of concern)
  './src/orchestration/governed_action_envelope.py',
  // capabilities
  './src/capabilities/handlers',
  // web surface
  './src/web',
  // intake
  './src/intake',
  // scripts
  './scripts/agent_start.py',
];

// Build file ID map
const fileIdMap = {};
for (const f of allFiles) {
  const path = f.file_path || f.path || '';
  const id = f.code_file_id || f.file_id || f.id;
  if (id) fileIdMap[path] = id;
}

const sections = {};

// 1. Architecture integrity (fresh pull)
process.stdout.write('1. Architecture integrity status...');
sections.architectureIntegrity = await safe('arch', () => client.operatorStatus.currentArchitectureIntegrityStatus());

// 2. Security governance
process.stdout.write('2. Security governance status...');
sections.securityGovernance = await safe('security', () => client.operatorStatus.currentSecurityGovernanceStatus({ topN: 10 }));

// 3. Codebase shape (fresh)
process.stdout.write('3. Codebase shape status...');
sections.codeshapeStatus = await safe('shape', () => client.operatorStatus.currentCodebaseShapeStatus());

// 4. Execution telemetry
process.stdout.write('4. Execution telemetry...');
sections.telemetry = await safe('telemetry', () => client.executionTelemetry.getExecutionTelemetryCurrent());

// 5. Recent process runs
process.stdout.write('5. Recent process runs...');
sections.processRuns = await safe('processRuns', () => client.executionTelemetry.listExecutionProcessRuns({ limit: 20 }));

// 6. Design intelligence
process.stdout.write('6. Design intelligence dashboard...');
sections.designDashboard = await safe('design', () => client.designIntelligence.getDesignIntelligenceDashboard());

// 7. Design decisions list
process.stdout.write('7. Design decisions...');
sections.designDecisions = await safe('decisions', () => client.designIntelligence.listDesignDecisions());

// 8. Design metrics
process.stdout.write('8. Design metrics...');
sections.designMetrics = await safe('metrics', () => client.designIntelligence.getDesignIntelligenceMetrics());

// 9. Anti-pattern rules (confirm count)
process.stdout.write('9. Anti-pattern rules...');
sections.antiPatterns = await safe('antipatterns', () => client.operatorStatus.getAntiPatternRules());

// 10. Symbol inspection for key files
console.log('\n10. Symbol inspection for sampled files...');
const symbolResults = {};
for (const targetPath of SAMPLE_TARGETS) {
  const fileId = fileIdMap[targetPath];
  if (!fileId) {
    console.log(`    [no ID] ${targetPath}`);
    continue;
  }
  process.stdout.write(`    ${targetPath}...`);
  const result = await safe(targetPath, () => client.repo.listCodeSymbolsByFile(fileId, { limit: 100 }));
  if (result) symbolResults[targetPath] = result;
}

// 11. Action observations for key files
console.log('\n11. Action observations for sampled files...');
const actionResults = {};
for (const targetPath of SAMPLE_TARGETS.slice(0, 5)) {
  const fileId = fileIdMap[targetPath];
  if (!fileId) continue;
  process.stdout.write(`    ${targetPath}...`);
  const result = await safe(targetPath, () => client.repo.listActionObservations({ fileId, limit: 30 }));
  if (result) actionResults[targetPath] = result;
}

// 12. Object flow observations
console.log('\n12. Object flow observations...');
const objectFlowResults = {};
for (const targetPath of SAMPLE_TARGETS.slice(0, 3)) {
  const fileId = fileIdMap[targetPath];
  if (!fileId) continue;
  process.stdout.write(`    ${targetPath}...`);
  const result = await safe(targetPath, () => client.repo.listObjectFlowObservations({ fileId, limit: 30 }));
  if (result) objectFlowResults[targetPath] = result;
}

// 13. Code relationships for key files
console.log('\n13. Code relationships...');
const relationshipResults = {};
for (const targetPath of SAMPLE_TARGETS.slice(0, 3)) {
  const fileId = fileIdMap[targetPath];
  if (!fileId) continue;
  process.stdout.write(`    ${targetPath}...`);
  const result = await safe(targetPath, () => client.repo.listCodeRelationships({ fileId, limit: 30 }));
  if (result) relationshipResults[targetPath] = result;
}

// 14. Portfolio closure readiness (current state)
process.stdout.write('\n14. Portfolio closure readiness...');
sections.portfolioReadiness = await safe('portfolio', () =>
  client.portfolio.getPortfolioClosureReadiness({ projectLimit: 10, includeLogaPortfolioProjection: false })
);

// Save raw data
const raw = {
  generated_at: new Date().toISOString(),
  repo_id: REPO_ID,
  architecture_integrity: sections.architectureIntegrity,
  security_governance: sections.securityGovernance,
  codebase_shape: sections.codeshapeStatus,
  execution_telemetry: sections.telemetry,
  process_runs: sections.processRuns,
  design_dashboard: sections.designDashboard,
  design_decisions: sections.designDecisions,
  design_metrics: sections.designMetrics,
  anti_pattern_rules: sections.antiPatterns,
  symbol_results: symbolResults,
  action_results: actionResults,
  object_flow_results: objectFlowResults,
  relationship_results: relationshipResults,
  portfolio_readiness: sections.portfolioReadiness,
};

writeFileSync(join(__dirname, '../outputs/engine-code-review.json'), JSON.stringify(raw, null, 2), 'utf8');

// --- Build markdown ---
const lines = [];
const ts = new Date().toISOString().split('T');
const dateStr = ts[0];
const timeStr = ts[1].split('.')[0] + 'Z';

lines.push(`# AI Engine — Code Intelligence Review`);
lines.push(``);
lines.push(`**Repository:** \`d-a-ai-engine-ai-engine\` (1,113 files)`);
lines.push(`**Source:** SQL-backed intelligence via \`client.repo.*\`, \`client.operatorStatus.*\`, \`client.designIntelligence.*\``);
lines.push(`**Date:** ${dateStr} ${timeStr}`);
lines.push(``);
lines.push(`---`);
lines.push(``);

// Architecture integrity
const arch = sections.architectureIntegrity;
if (arch) {
  const s = arch.summary || {};
  lines.push(`## Architecture Integrity Gate`);
  lines.push(``);
  lines.push(`| Field | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Status | \`${s.status || '—'}\` |`);
  lines.push(`| Decision band | **\`${s.decision_band || '—'}\`** |`);
  lines.push(`| Total findings | ${s.finding_count ?? '—'} |`);
  lines.push(`| Open block findings | **${s.open_block_finding_count ?? '—'}** |`);
  lines.push(`| Open revise findings | ${s.open_revise_finding_count ?? '—'} |`);
  lines.push(`| Remediated | ${s.remediated_finding_count ?? '—'} |`);
  lines.push(`| Waived | ${s.waived_finding_count ?? '—'} |`);
  lines.push(`| Active plan | ${s.plan_title || '—'} |`);
  lines.push(``);
}

// Telemetry
const tel = sections.telemetry;
if (tel) {
  lines.push(`## Execution Telemetry`);
  lines.push(``);
  lines.push(`| Field | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Status | \`${tel.status || '—'}\` |`);
  lines.push(`| Active processes | ${tel.active_process_count ?? '—'} |`);
  lines.push(`| Recent processes | ${tel.recent_process_count ?? '—'} |`);
  lines.push(`| Failed processes | ${tel.failed_process_count ?? '—'} |`);
  lines.push(`| Last observed | ${tel.last_observed_at || '—'} |`);
  lines.push(``);

  // Recent process runs
  const runs = sections.processRuns;
  const runList = Array.isArray(runs?.process_runs) ? runs.process_runs : [];
  if (runList.length > 0) {
    lines.push(`### Recent Process Runs (last ${runList.length})`);
    lines.push(``);
    lines.push(`| Process | Status | Started |`);
    lines.push(`|---|---|---|`);
    for (const r of runList.slice(0, 15)) {
      const name = r.artifact_kind || r.process_kind || r.name || r.run_key || '—';
      const status = r.status || '—';
      const started = r.started_at || r.created_at || '—';
      lines.push(`| ${name} | \`${status}\` | ${started} |`);
    }
    lines.push(``);
  }
}

// Design intelligence
const decisions = Array.isArray(sections.designDecisions?.decisions)
  ? sections.designDecisions.decisions
  : Array.isArray(sections.designDecisions)
    ? sections.designDecisions
    : [];
const metrics = sections.designMetrics;
if (decisions.length > 0 || metrics) {
  lines.push(`## Design Intelligence`);
  lines.push(``);
  if (metrics) {
    lines.push(`### Metrics`);
    lines.push(``);
    lines.push('```json');
    lines.push(JSON.stringify(metrics, null, 2));
    lines.push('```');
    lines.push(``);
  }
  if (decisions.length > 0) {
    lines.push(`### Design Decisions (${decisions.length})`);
    lines.push(``);
    lines.push(`| Decision | Status | Category |`);
    lines.push(`|---|---|---|`);
    for (const d of decisions.slice(0, 20)) {
      const title = d.title || d.name || d.decision_key || '—';
      const status = d.status || d.decision_status || '—';
      const cat = d.category || d.decision_category || '—';
      lines.push(`| ${title} | \`${status}\` | ${cat} |`);
    }
    if (decisions.length > 20) lines.push(`| *(${decisions.length - 20} more)* | | |`);
    lines.push(``);
  }
}

// Symbol results
const symEntries = Object.entries(symbolResults);
if (symEntries.length > 0) {
  lines.push(`## File Symbol Inspection`);
  lines.push(``);
  for (const [path, result] of symEntries) {
    const symbols = Array.isArray(result?.symbols) ? result.symbols : Array.isArray(result) ? result : [];
    lines.push(`### \`${path}\` (${symbols.length} symbols)`);
    lines.push(``);
    if (symbols.length > 0) {
      lines.push(`| Symbol | Kind | Lines |`);
      lines.push(`|---|---|---|`);
      for (const s of symbols.slice(0, 20)) {
        const name = s.symbol_name || s.name || '—';
        const kind = s.symbol_kind || s.kind || '—';
        const lc = s.line_count || '—';
        lines.push(`| \`${name}\` | ${kind} | ${lc} |`);
      }
      if (symbols.length > 20) lines.push(`| *(${symbols.length - 20} more)* | | |`);
    } else {
      lines.push(`_No symbols indexed for this file._`);
    }
    lines.push(``);
  }
}

// Action observations
const actionEntries = Object.entries(actionResults);
if (actionEntries.length > 0) {
  lines.push(`## Action Observations (Sampled Files)`);
  lines.push(``);
  for (const [path, result] of actionEntries) {
    const obs = Array.isArray(result?.observations) ? result.observations
      : Array.isArray(result?.action_observations) ? result.action_observations
      : Array.isArray(result) ? result : [];
    lines.push(`### \`${path}\` (${obs.length} observations)`);
    lines.push(``);
    if (obs.length > 0) {
      lines.push(`| Action | Object Kind | Boundary |`);
      lines.push(`|---|---|---|`);
      for (const o of obs.slice(0, 10)) {
        const action = o.action_kind || o.action || '—';
        const obj = o.object_kind || o.object || '—';
        const boundary = o.boundary_kind || o.boundary || '—';
        lines.push(`| ${action} | ${obj} | ${boundary} |`);
      }
    } else {
      lines.push(`_No action observations indexed._`);
    }
    lines.push(``);
  }
}

// Portfolio readiness summary
const portfolio = sections.portfolioReadiness;
const projects = Array.isArray(portfolio?.project_readiness) ? portfolio.project_readiness : [];
if (projects.length > 0) {
  lines.push(`## Portfolio Closure Readiness`);
  lines.push(``);
  lines.push(`| Project | Completion | Open Items | Status |`);
  lines.push(`|---|---|---|---|`);
  for (const p of projects.slice(0, 10)) {
    const name = p.project_name || p.name || p.project_id || '—';
    const pct = p.completion_percentage ?? p.completionPercentage ?? '—';
    const open = p.open_item_count ?? p.openItemCount ?? '—';
    const status = p.status || '—';
    lines.push(`| ${name} | ${pct}% | ${open} | \`${status}\` |`);
  }
  lines.push(``);
}

writeFileSync(join(__dirname, '../docs/design/engine-code-review.md'), lines.join('\n'), 'utf8');
console.log('\nMarkdown saved: docs/design/engine-code-review.md');
console.log('Raw data saved: outputs/engine-code-review.json');
