import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const client = AIEngineClient.fromEnv();

function section(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(title);
  console.log('='.repeat(60));
}

function safe(label, fn) {
  try {
    return fn();
  } catch (e) {
    console.warn(`  [skip] ${label}: ${e.message}`);
    return Promise.resolve(null);
  }
}

section('1. Repositories');
const repos = await safe('listRepositories', () => client.repo.listRepositories({ limit: 20 }));
console.log(JSON.stringify(repos, null, 2));

section('2. Refactor Candidates');
const refactorCandidates = await safe('listRefactorCandidates', () =>
  client.repo.listRefactorCandidates({ limit: 20 })
);
console.log(JSON.stringify(refactorCandidates, null, 2));

section('3. Codebase Shape Status');
const shapeStatus = await safe('currentCodebaseShapeStatus', () =>
  client.operatorStatus.currentCodebaseShapeStatus()
);
console.log(JSON.stringify(shapeStatus, null, 2));

section('4. Architecture Integrity Status');
const archStatus = await safe('currentArchitectureIntegrityStatus', () =>
  client.operatorStatus.currentArchitectureIntegrityStatus()
);
console.log(JSON.stringify(archStatus, null, 2));

section('5. Anti-Pattern Rules');
const antiPatterns = await safe('getAntiPatternRules', () =>
  client.operatorStatus.getAntiPatternRules()
);
console.log(JSON.stringify(antiPatterns, null, 2));

section('6. Codebase Shape Findings');
const shapeFindings = await safe('listCodebaseShapeFindings', () =>
  client.repo.listCodebaseShapeFindings({ limit: 25 })
);
console.log(JSON.stringify(shapeFindings, null, 2));

section('7. Discovered Script Assets');
const scriptAssets = await safe('listDiscoveredScriptAssets', () =>
  client.scriptDiscovery.listDiscoveredScriptAssets({ limit: 50 })
);
console.log(JSON.stringify(scriptAssets, null, 2));

section('8. Workflow Candidates');
const workflowCandidates = await safe('listWorkflowCandidates', () =>
  client.scriptDiscovery.listWorkflowCandidates({ limit: 25 })
);
console.log(JSON.stringify(workflowCandidates, null, 2));

section('9. Discovered Capabilities');
const capabilities = await safe('listDiscoveredCapabilities', () =>
  client.scriptDiscovery.listDiscoveredCapabilities({ limit: 25 })
);
console.log(JSON.stringify(capabilities, null, 2));

section('10. Design Intelligence Dashboard');
const designDashboard = await safe('getDesignIntelligenceDashboard', () =>
  client.designIntelligence.getDesignIntelligenceDashboard()
);
console.log(JSON.stringify(designDashboard, null, 2));

section('11. Execution Telemetry (Current)');
const telemetry = await safe('getExecutionTelemetryCurrent', () =>
  client.executionTelemetry.getExecutionTelemetryCurrent()
);
console.log(JSON.stringify(telemetry, null, 2));

// Compile report
const report = {
  generated_at: new Date().toISOString(),
  repositories: repos,
  refactor_candidates: refactorCandidates,
  codebase_shape_status: shapeStatus,
  architecture_integrity_status: archStatus,
  anti_pattern_rules: antiPatterns,
  codebase_shape_findings: shapeFindings,
  discovered_script_assets: scriptAssets,
  workflow_candidates: workflowCandidates,
  discovered_capabilities: capabilities,
  design_intelligence_dashboard: designDashboard,
  execution_telemetry_current: telemetry,
};

const outPath = join(__dirname, '../outputs/repo-intelligence.json');
writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
console.log(`\nSaved full report: ${outPath}`);
