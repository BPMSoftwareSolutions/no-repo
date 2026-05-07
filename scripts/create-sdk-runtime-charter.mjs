import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';

const client = AIEngineClient.fromEnv();

const charterRequest = {
  projectName: 'AI Engine SDK Projection Runtime Platformization',
  objective:
    'Promote LOGA projection rendering capabilities from app-local runtime into the AI Engine SDK and backend platform domain so multiple applications can reuse one governed rendering contract and execution engine.',
  businessContext:
    'Rendering capabilities are currently implemented in one application runtime. Reusing them across products requires duplicate implementations, causing drift and slower delivery. Platformizing these capabilities in the SDK and backend creates a single governed path for contract transforms, template rendering, and projection hydration.',
  successCriteria:
    'A versioned SDK runtime supports each loops, dot-notation token resolution, fallback chaining, declarative dataMap mapping, and derive evaluation. Backend platform APIs expose governed transform execution metadata. At least two applications can render the same portfolio projection contract without app-specific transform logic.',
  priority: 'high',
  constraints: [
    'Backward compatibility with existing token syntax must be preserved for current consumers.',
    'Projection contract execution must remain deterministic and auditable with provenance metadata.',
    'SDK runtime must not embed application-specific transform knowledge; it executes declarative contracts only.',
    'Backend transform orchestration must remain SQL-truth aligned and governance-aware.',
  ],
  inScope: [
    'Define a reusable SDK projection runtime module for template loading, scalar substitution, each loops, nested token lookup, and fallback chains.',
    'Define declarative transform contract schema for template, dataMap, and derive sections with rule chains and template interpolation pipes such as encode.',
    'Implement SDK utilities for dataMap application, filter evaluation, derive rule execution, and per-item derived token injection.',
    'Implement backend platform integration points to execute transform contracts consistently and return projection metadata and provenance.',
    'Add validation and compatibility tests covering portfolio projection parity between existing app runtime and SDK runtime.',
    'Publish migration guidance and reference examples for adopting SDK runtime in multiple applications.',
  ],
  outOfScope: [
    'Rewriting every existing projection surface in the first increment.',
    'Designing a visual template builder UI.',
    'Introducing a general-purpose expression language beyond declared rule and pipe support.',
    'Changing domain business semantics of existing projections during runtime extraction.',
  ],
  assumptions: [
    'Current declarative portfolio projection is a representative pilot for broader runtime extraction.',
    'AI Engine backend can host shared contract execution and provenance metadata surfaces.',
    'Existing applications can adopt SDK runtime incrementally without full rewrite.',
  ],
  requestedBy: 'copilot:platform-domain',
  assignedTo: 'platform-domain',
  ensureTaskSurface: true,
  createAcceptanceSubtasks: true,
  testingStrategy: {
    summary:
      'Validate feature parity with the existing app runtime, ensure deterministic outputs, and verify backend provenance and governance metadata for every transform execution.',
    validation_surfaces: [
      'SDK unit tests for token resolver, loop rendering, fallback behavior, dataMap filtering, and derive evaluation',
      'Contract parity tests comparing existing portfolio projection output to SDK runtime output',
      'Backend integration tests for contract execution response shape, provenance, and error handling',
      'Cross-application smoke tests rendering shared projection templates through SDK runtime',
    ],
    required_checks: [
      'each loop rendering produces stable ordering and expected card count',
      'fallback token chains resolve correctly when primary field is missing or empty',
      'derive rule chains evaluate in priority order including gt comparisons',
      'template interpolation pipes like encode produce URL-safe outputs',
      'projection response includes expected contract metadata and provenance fields',
    ],
    release_boundary:
      'Do not promote as platform default until parity and governance checks pass for pilot projections.',
  },
  initialContext: {
    source: 'declarative-portfolio-projection',
    implemented_capabilities: [
      'applyTemplate each block support',
      'dot-notation nested token resolver',
      'fallback chaining with ||',
      'applyDataMap utility with filter support',
      'evaluateDerived utility with rules and encode pipe',
      'registry transforms and contract-driven portfolio projection',
    ],
    target_domain: 'backend-platform',
  },
};

async function run() {
  const charter = await client.createProjectCharter(charterRequest);
  const projectId = charter.project_id;
  const roadmap = projectId ? await client.getProjectRoadmap(projectId) : null;
  const taskSurface = projectId
    ? await client.ensureProjectRoadmapTaskSurface(projectId, {
        requestedBy: 'copilot:platform-domain',
        assignedTo: 'platform-domain',
        createAcceptanceSubtasks: true,
      })
    : null;

  const output = {
    charter: {
      project_id: charter.project_id,
      project_slug: charter.project_slug,
      project_name: charter.project_name,
      implementation_packet_id: charter.implementation_packet_id,
      implementation_packet_key: charter.implementation_packet_key,
      workflow_id: charter.workflow_id,
      workflow_run_id: charter.workflow_run_id,
      status: charter.status,
      current_stage: charter.current_stage,
    },
    roadmap_summary: roadmap?.summary || null,
    roadmap_item_count: Array.isArray(roadmap?.items) ? roadmap.items.length : null,
    active_item: taskSurface?.active_item || roadmap?.active_item || null,
  };

  console.log(JSON.stringify(output, null, 2));
}

run().catch((error) => {
  console.error('FAILED_CREATE_CHARTER');
  console.error(error?.message || error);
  process.exit(1);
});
