import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';

const client = AIEngineClient.fromEnv();

const PROJECT_NAME = 'Natural Language Workflow Discovery Loop';
const PROJECT_SLUG = 'natural-language-workflow-discovery-loop';
const REQUESTED_BY = 'copilot:workflow-domain';
const ASSIGNED_TO = 'workflow-domain';
const PACKET_ID = 'impl-natural-language-workflow-discovery-loop-v1';
const PACKET_TITLE = 'Natural Language Workflow Discovery Loop Project Charter Roadmap';
const PACKET_VERSION = '1.0';

const TASK_PLAN = {
  'confirm-project-intent': {
    title: 'Align the product thesis',
    subtasks: [
      'Confirm the client is the workflow invention surface.',
      'Confirm the engine is the governed promotion authority.',
      'Record the one-command reuse goal as the primary product outcome.',
    ],
  },
  'bind-scope-boundaries': {
    title: 'Define scope boundaries',
    subtasks: [
      'List explicit non-goals for the v1 SDK surface.',
      'Record governance and fail-closed constraints.',
      'Capture assumptions about backend promotion support.',
    ],
  },
  'define-workflow-composer-entrypoint': {
    title: 'Specify the command entrypoint',
    subtasks: [
      'Define the runCommand request shape.',
      'Define the context fields supported by the request.',
      'Define the intended output modes for rendered results.',
    ],
  },
  'define-response-schema': {
    title: 'Normalize the response contract',
    subtasks: [
      'Define the status and promotion fields.',
      'Define the evidence packet structure.',
      'Define the rendered_output field behavior.',
    ],
  },
  'define-status-and-promotion-semantics': {
    title: 'Separate execution from promotion',
    subtasks: [
      'Define supported, partial, ambiguous, and unsupported status rules.',
      'Define none, candidate, and ready promotion readiness rules.',
      'Define fail-closed behavior for underspecified commands.',
    ],
  },
  'map-supported-surfaces': {
    title: 'Expose surface discovery',
    subtasks: [
      'List the available surfaces used by the command planner.',
      'List the missing surfaces that block completion.',
      'Capture surface hints from the caller context.',
    ],
  },
  'implement-draft-lifecycle': {
    title: 'Model workflow draft progression',
    subtasks: [
      'Define drafted, simulated, refined, and proven states.',
      'Define promoted and canonical graduation states.',
      'Keep draft state distinct from canonical authority.',
    ],
  },
  'implement-evidence-packet': {
    title: 'Capture execution evidence',
    subtasks: [
      'Record traces, sources, and provenance in the evidence packet.',
      'Capture notes for partial or unsupported commands.',
      'Preserve enough context for later promotion review.',
    ],
  },
  'implement-promotion-candidate': {
    title: 'Generate promotion candidates',
    subtasks: [
      'Detect repeatable flow patterns from successful commands.',
      'Assign a confidence score to reusable workflows.',
      'Keep promotion candidacy separate from execution status.',
    ],
  },
  'implement-governance-guardrails': {
    title: 'Enforce governed writes',
    subtasks: [
      'Prohibit raw CRUD as a workflow-composer escape hatch.',
      'Require backend-owned approval for canonical promotion.',
      'Record evidence and policy posture for every workflow path.',
    ],
  },
  'add-parity-and-failure-mode-tests': {
    title: 'Prove the contract with tests',
    subtasks: [
      'Cover supported, partial, ambiguous, and unsupported cases.',
      'Cover evidence packet and promotion readiness behavior.',
      'Cover fail-closed behavior for ambiguous commands.',
    ],
  },
  'publish-rollout-guidance': {
    title: 'Publish adoption guidance',
    subtasks: [
      'Document how clients draft and run commands.',
      'Document how repeated flows become promotion candidates.',
      'Document the backend responsibilities for canonicalization.',
    ],
  },
};

function normalizeListResponse(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.projects)) return result.projects;
  if (Array.isArray(result?.workflows)) return result.workflows;
  return [];
}

async function findExistingProject() {
  const response = await client.listProjects({ limit: 200 });
  const projects = normalizeListResponse(response);
  return projects.find((project) => {
    const name = String(project?.project_name || project?.projectName || '').trim();
    const slug = String(project?.project_slug || project?.projectSlug || '').trim();
    return name === PROJECT_NAME || slug === PROJECT_SLUG;
  }) || null;
}

function buildDeliveryRequest() {
  return {
    project_name: PROJECT_NAME,
    objective:
      'Let the client compose workflow ideas from natural language, capture evidence, and promote repeatable flows into canonical backend workflows.',
    business_context:
      'The engine needs a workflow invention surface that supports creative client-side composition without diluting governance, so repeated flows can be promoted into durable engine authority.',
    success_criteria:
      'A first-class workflowComposer.runCommand contract exists, commands return structured supported/partial/ambiguous/unsupported results, evidence packets and promotion candidates are emitted, and repeatable flows can be promoted into canonical engine workflows.',
    priority: 'high',
    constraints: [
      'Keep the SDK thin and compositional.',
      'Fail closed when intent is ambiguous or unsupported.',
      'Record evidence for every execution path.',
      'Keep writes intent-based and backend-governed.',
    ],
    in_scope: [
      'Draft workflow commands from natural language intent.',
      'Analyze intent and map command capabilities before execution.',
      'Return structured execution plans, available surfaces, and missing surfaces.',
      'Capture evidence packets for supported and partial commands.',
      'Generate promotion candidates when a workflow becomes repeatable.',
      'Define the backend promotion path for canonical workflows.',
    ],
    out_of_scope: [
      'General-purpose query language support.',
      'Raw CRUD mutation helpers in the SDK.',
      'A visual workflow builder.',
      'Client-side workflow persistence as source of truth.',
    ],
    assumptions: [
      'The backend can accept a new governed workflow promotion lane.',
      'Existing project and roadmap machinery can materialize implementation tasks.',
      'The client will evolve through repeated natural-language command experiments.',
    ],
    testing_strategy: {
      summary:
        'Validate the workflow composer contract with status, evidence, and promotion-readiness cases, then verify the resulting roadmap and task tree are persisted as governed backend artifacts.',
      validation_surfaces: [
        'SDK contract tests for runCommand request and response shapes.',
        'Roadmap import tests for charter packet and task hierarchy creation.',
        'Governance tests for fail-closed and promotion-readiness handling.',
        'Readback checks for project, roadmap, and task persistence.',
      ],
      required_checks: [
        'Supported commands return a rendered output and a populated evidence packet.',
        'Partial commands record missing surfaces and still return safe progress.',
        'Ambiguous commands fail closed or request clarification.',
        'Repeatable flows can surface a promotion candidate.',
      ],
      release_boundary:
        'Do not treat the feature as canonical until the workflow composer contract, evidence output, and promotion path are validated against the backend.',
    },
    initial_context: {
      source_docs: [
        'docs/design/natural-language-workflow-discovery-loop.md',
        'docs/design/natural-language-workflow-discovery-loop-v1-api-spec.md',
      ],
      target_domain: 'workflow-composer',
    },
    requested_by: REQUESTED_BY,
    assigned_to: ASSIGNED_TO,
    ensure_task_surface: false,
    create_acceptance_subtasks: false,
  };
}

function buildPacket(projectId, workflowId, workflowSlug) {
  return {
    projectId,
    projectSlug: PROJECT_SLUG,
    workflowId,
    workflowSlug,
    packetType: 'implementation_plan_packet',
    packetVersion: PACKET_VERSION,
    packetId: PACKET_ID,
    title: PACKET_TITLE,
    status: 'draft',
    governance: {
      requiredGates: ['intent', 'structure', 'evidence', 'promotion'],
    },
    phases: [
      {
        phaseKey: 'phase_1_charter_foundation',
        title: 'Charter foundation',
        items: [
          {
            itemKey: 'confirm-project-intent',
            type: 'workflow_slice',
            description: 'Confirm the product lane and product thesis for the workflow discovery loop.',
            acceptanceChecks: [
              { text: 'The client is explicitly framed as the invention surface.' },
              { text: 'The engine is explicitly framed as the authority layer.' },
            ],
          },
          {
            itemKey: 'bind-scope-boundaries',
            type: 'workflow_slice',
            description: 'Record scope, constraints, and non-goals for the v1 SDK contract.',
            acceptanceChecks: [
              { text: 'Non-goals are recorded.' },
              { text: 'Governance constraints are recorded.' },
            ],
          },
        ],
      },
      {
        phaseKey: 'phase_2_composer_contract',
        title: 'Composer contract',
        items: [
          {
            itemKey: 'define-workflow-composer-entrypoint',
            type: 'workflow_slice',
            description: 'Define the command-oriented SDK entrypoint and request context contract.',
            acceptanceChecks: [
              { text: 'The request shape is documented.' },
              { text: 'The output modes are documented.' },
            ],
          },
          {
            itemKey: 'define-response-schema',
            type: 'workflow_slice',
            description: 'Define the response contract for execution, evidence, and rendering.',
            acceptanceChecks: [
              { text: 'The response schema includes status and promotion.' },
              { text: 'The response schema includes evidence_packet and rendered_output.' },
            ],
          },
          {
            itemKey: 'define-status-and-promotion-semantics',
            type: 'workflow_slice',
            description: 'Separate execution states from promotion readiness states.',
            acceptanceChecks: [
              { text: 'Supported, partial, ambiguous, and unsupported are defined.' },
              { text: 'Promotion readiness is modeled separately.' },
            ],
          },
        ],
      },
      {
        phaseKey: 'phase_3_runtime_bridge',
        title: 'Runtime bridge',
        items: [
          {
            itemKey: 'map-supported-surfaces',
            type: 'workflow_slice',
            description: 'Expose available and missing surfaces for the command planner.',
            acceptanceChecks: [
              { text: 'Available surfaces are surfaced in the response.' },
              { text: 'Missing surfaces are surfaced in the response.' },
            ],
          },
          {
            itemKey: 'implement-draft-lifecycle',
            type: 'workflow_slice',
            description: 'Define the workflow draft lifecycle from discovery to canonical state.',
            acceptanceChecks: [
              { text: 'Drafted through canonical states are defined.' },
              { text: 'Draft state remains distinct from canonical authority.' },
            ],
          },
          {
            itemKey: 'implement-evidence-packet',
            type: 'workflow_slice',
            description: 'Capture traces, sources, and provenance for every command execution.',
            acceptanceChecks: [
              { text: 'Evidence packet captures trace and sources.' },
              { text: 'Evidence packet preserves provenance.' },
            ],
          },
          {
            itemKey: 'implement-promotion-candidate',
            type: 'workflow_slice',
            description: 'Generate promotion candidates when workflows repeat successfully.',
            acceptanceChecks: [
              { text: 'Repeatable flows produce a promotion candidate.' },
              { text: 'Promotion confidence is part of the output.' },
            ],
          },
        ],
      },
      {
        phaseKey: 'phase_4_validation_rollout',
        title: 'Validation and rollout',
        items: [
          {
            itemKey: 'implement-governance-guardrails',
            type: 'workflow_slice',
            description: 'Enforce governed writes and backend authority for canonical promotion.',
            acceptanceChecks: [
              { text: 'Raw CRUD is not exposed as a workflow-composer escape hatch.' },
              { text: 'Canonical promotion remains backend-governed.' },
            ],
          },
          {
            itemKey: 'add-parity-and-failure-mode-tests',
            type: 'workflow_slice',
            description: 'Validate the command contract with supported, partial, ambiguous, and unsupported cases.',
            acceptanceChecks: [
              { text: 'Failure modes are covered.' },
              { text: 'Promotion readiness behavior is covered.' },
            ],
          },
          {
            itemKey: 'publish-rollout-guidance',
            type: 'workflow_slice',
            description: 'Document the client workflow composer adoption and backend promotion path.',
            acceptanceChecks: [
              { text: 'Adoption guidance is documented.' },
              { text: 'Promotion guidance is documented.' },
            ],
          },
        ],
      },
    ],
  };
}

async function getTaskTitles(implementationItemId) {
  const tasks = await client.listImplementationTasks(implementationItemId);
  return normalizeListResponse(tasks).map((task) => ({
    id: task?.implementation_item_task_id || task?.id || task?.task_id || null,
    title: String(task?.title || task?.task_title || '').trim(),
  }));
}

async function ensureTaskTree(implementationItemId, itemKey, taskSpec) {
  const existingTasks = await getTaskTitles(implementationItemId);
  let parent = existingTasks.find((task) => task.title === taskSpec.title) || null;

  if (!parent) {
    const created = await client.createImplementationTask(implementationItemId, {
      title: taskSpec.title,
      implementationPacketId: PACKET_ID,
      assignedTo: ASSIGNED_TO,
      createdBy: REQUESTED_BY,
      executionType: 'implementation_task',
      executionPurpose: `Deliver ${itemKey}`,
    });
    parent = {
      id: created?.implementation_item_task_id || created?.id || created?.task_id || null,
      title: taskSpec.title,
    };
  }

  const existingSubtasks = parent.id ? normalizeListResponse(await client.listImplementationSubtasks(parent.id)) : [];
  const existingSubtaskTitles = new Set(existingSubtasks.map((task) => String(task?.title || task?.task_title || '').trim()));

  for (const subtaskTitle of taskSpec.subtasks) {
    if (existingSubtaskTitles.has(subtaskTitle)) continue;
    await client.createImplementationTask(implementationItemId, {
      title: subtaskTitle,
      implementationPacketId: PACKET_ID,
      assignedTo: ASSIGNED_TO,
      createdBy: REQUESTED_BY,
      executionType: 'implementation_task',
      executionPurpose: `Subtask for ${itemKey}`,
      parentTaskId: parent.id,
    });
  }

  return parent;
}

async function main() {
  const existingProject = await findExistingProject();
  let charter;

  if (existingProject?.project_id || existingProject?.projectId) {
    charter = {
      project_id: existingProject.project_id || existingProject.projectId,
      project_slug: existingProject.project_slug || existingProject.projectSlug || PROJECT_SLUG,
      workflow_id: existingProject.workflow_id || existingProject.workflowId || null,
      workflow_slug: existingProject.workflow_slug || existingProject.workflowSlug || PROJECT_SLUG,
      implementation_packet_id: existingProject.implementation_packet_id || existingProject.implementationPacketId || null,
      implementation_packet_key: existingProject.implementation_packet_key || existingProject.implementationPacketKey || null,
      status: existingProject.status || existingProject.charter_status || existingProject.charterStatus || 'existing',
      current_stage: existingProject.current_stage || existingProject.currentStage || null,
    };
  } else {
    charter = await client.createProjectDelivery(buildDeliveryRequest());
  }

  const projectId = charter.project_id || charter.projectId;
  const projectPayload = await client.getProject(projectId);
  const projectSummary = projectPayload?.summary || projectPayload?.project || projectPayload || {};
  const workflowId = charter.workflow_id || charter.workflowId || projectSummary.workflow_id || projectSummary.workflowId;
  const workflowSlug = charter.workflow_slug || charter.workflowSlug || projectSummary.workflow_slug || projectSummary.workflowSlug || PROJECT_SLUG;
  const projectSlug = charter.project_slug || charter.projectSlug || projectSummary.project_slug || projectSummary.projectSlug || PROJECT_SLUG;

  let importedPacket;
  try {
    importedPacket = await client.getImplementationPacket(PACKET_ID);
  } catch {
    importedPacket = await client.importImplementationPacket(buildPacket(projectId, workflowId, workflowSlug));
  }

  await client.bindImplementationPacketToWorkflow(workflowId, {
    packet_id: PACKET_ID,
    binding_role: 'active',
    created_by: REQUESTED_BY,
    notes: 'Workflow discovery loop roadmap binding.',
  });

  const roadmap = await client.getProjectRoadmap(projectId);
  const roadmapItems = Array.isArray(roadmap?.items) ? roadmap.items : [];
  const itemByKey = new Map(
    roadmapItems.map((item) => [String(item?.item_key || item?.stable_item_key || '').trim(), item]),
  );

  const taskSummary = {
    parentTasksCreated: 0,
    subtasksCreated: 0,
    missingItemKeys: [],
  };

  for (const [itemKey, taskSpec] of Object.entries(TASK_PLAN)) {
    const roadmapItem = itemByKey.get(itemKey);
    const implementationItemId = roadmapItem?.implementation_item_id || roadmapItem?.implementationItemId;
    if (!implementationItemId) {
      taskSummary.missingItemKeys.push(itemKey);
      continue;
    }

    const existingBefore = await getTaskTitles(implementationItemId);
    const parent = await ensureTaskTree(implementationItemId, itemKey, taskSpec);
    const existingAfter = await getTaskTitles(implementationItemId);
    const delta = Math.max(0, existingAfter.length - existingBefore.length);

    if (delta > 0) {
      taskSummary.parentTasksCreated += existingBefore.some((task) => task.title === taskSpec.title) ? 0 : 1;
      taskSummary.subtasksCreated += Math.max(0, delta - (existingBefore.some((task) => task.title === taskSpec.title) ? 0 : 1));
    }

    void parent;
  }

  const output = {
    charter: {
      project_id: projectId,
      project_slug: projectSlug,
      workflow_id: workflowId,
      workflow_slug: workflowSlug,
      status: charter.status || charter.charter_status || charter.charterStatus || 'created',
      implementation_packet_id: charter.implementation_packet_id || charter.implementationPacketId || importedPacket?.implementation_packet_id || null,
      implementation_packet_key: charter.implementation_packet_key || charter.implementationPacketKey || PACKET_ID,
    },
    roadmap: {
      item_count: roadmapItems.length,
      active_item_key: roadmap?.active_item?.item_key || roadmap?.active_item?.stable_item_key || null,
    },
    task_summary: taskSummary,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error('FAILED_CREATE_WORKFLOW_DISCOVERY_LOOP');
  console.error(error?.message || error);
  process.exit(1);
});
