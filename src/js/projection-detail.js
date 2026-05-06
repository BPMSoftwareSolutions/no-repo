import { callAiEngine, renderMarkdownProjection } from './api-client.js';
import { renderProjectionTree } from './projection-tree.js';
import { parseMarkdown } from '../renderer/parser.js';
import { mountWorkspaceChrome } from './workspace-chrome.js';

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const projType = urlParams.get('type') || 'operator.home';
  const projectId = urlParams.get('projectId');
  const itemKey = urlParams.get('itemKey');
  const taskKey = urlParams.get('taskKey');
  const subtaskKey = urlParams.get('subtaskKey');
  const workflowRunId = urlParams.get('workflowRunId');
  const evidencePacketKey = urlParams.get('evidencePacketKey');
  const target = urlParams.get('target');
  
  const titleEl = document.getElementById('detail-title');
  const questionEl = document.getElementById('detail-question');
  const container = document.getElementById('projection-content');
  const tree = document.getElementById('projection-tree');

  titleEl.textContent = getSurfaceTitle(projType);
  questionEl.textContent = getSurfaceQuestion(projType);

  mountWorkspaceChrome({});
  renderPersistentTree(tree);

  try {
    const proj = await loadProjection({
      projType,
      projectId,
      itemKey,
      taskKey,
      subtaskKey,
      workflowRunId,
      evidencePacketKey,
      target,
    });

    const { frontmatter } = parseMarkdown(proj.text || '');
    mountWorkspaceChrome(frontmatter);

    container.innerHTML = renderMarkdownProjection(proj.text);
    document.getElementById('evidence-content').textContent = JSON.stringify(proj.provenance || proj, null, 2);
  } catch (error) {
    container.innerHTML = `<p class="loga-error">Error loading projection: ${error.message}</p>`;
  }
});

async function renderPersistentTree(tree) {
  try {
    renderProjectionTree(tree);
  } catch (error) {
    tree.innerHTML = `<p class="loga-error">Error loading projection tree: ${error.message}</p>`;
  }
}

function getSurfaceTitle(projType) {
  return {
    'operator.home': 'Operator Home',
    'operator.project_catalog': 'Project Catalog',
    'operator.project_detail': 'Project Detail',
    'operator.project_roadmap': 'Project Roadmap',
    'operator.roadmap_item': 'Roadmap Item',
    'operator.task_detail': 'Task Detail',
    'operator.subtask_detail': 'Subtask Detail',
    'operator.evidence_packet': 'Evidence Packet',
    'operator.promotions': 'Promotions',
    'operator.workflow_runs': 'Workflow Runs',
    'operator.workflow_run': 'Workflow Run',
    'operator.cicd_status': 'CI/CD Status',
    'operator.agent_session': 'Agent Session',
  }[projType] || 'Projection Detail';
}

function getSurfaceQuestion(projType) {
  return {
    'operator.home': 'What needs attention now?',
    'operator.project_catalog': 'What projects exist?',
    'operator.project_detail': 'What is happening in this project?',
    'operator.project_roadmap': 'What should I care about right now?',
    'operator.roadmap_item': 'What is being worked right now?',
    'operator.task_detail': 'What needs to happen?',
    'operator.subtask_detail': 'What is the next concrete step?',
    'operator.evidence_packet': 'Why should I trust this?',
    'operator.promotions': 'What capabilities were promoted?',
    'operator.workflow_runs': 'What is currently running?',
    'operator.workflow_run': 'What happened in this run?',
    'operator.cicd_status': 'Is delivery healthy?',
    'operator.agent_session': 'What is the agent doing?',
  }[projType] || 'What does this surface help the operator decide?';
}

async function loadProjection({ projType, projectId, itemKey, taskKey, subtaskKey, workflowRunId, evidencePacketKey, target }) {
  if (target) {
    throw new Error(`No local projection route is registered for target: ${target}`);
  }

  if (projType === 'operator.home') {
    return callAiEngine('getLogaOperatorHomeProjection');
  }

  if (projType === 'operator.project_catalog') {
    return callAiEngine('getLogaProjectCatalogProjection');
  }

  if (projType === 'operator.project_detail' && projectId) {
    return callAiEngine('getPortfolioProject', projectId)
      .then((data) => buildProjectDetailProjection(projectId, data.summary || data))
      .catch(() => loadLocalProjectionFixture(projType));
  }

  if (projType === 'operator.project_roadmap') {
    if (!projectId) {
      throw new Error('Project roadmap drilldown requires projectId. Open a project from the catalog or add ?projectId=...');
    }
    return callAiEngine('getLogaProjectRoadmapProjection', projectId)
      .catch(() => loadLocalProjectionFixture(projType));
  }

  if (projType === 'operator.roadmap_item') {
    if (!projectId || !itemKey) {
      throw new Error('Roadmap item drilldown requires projectId and itemKey.');
    }
    return callAiEngine('getLogaRoadmapItemProjection', projectId, itemKey)
      .catch(() => loadLocalProjectionFixture(projType));
  }

  if (projType === 'operator.workflow_run') {
    if (!workflowRunId) {
      return loadLocalProjectionFixture('operator.workflow_run');
    }
    return callAiEngine('getLogaWorkflowRunProjection', workflowRunId)
      .catch(() => loadLocalProjectionFixture('operator.workflow_run'));
  }

  if (projType === 'operator.task_detail' && taskKey) {
    return buildTaskProjection({ projectId, itemKey, taskKey });
  }

  if (projType === 'operator.subtask_detail') {
    return buildSubtaskProjection({ projectId, itemKey, taskKey, subtaskKey });
  }

  if (projType === 'operator.agent_session') {
    const urlParams = new URLSearchParams(window.location.search);
    const turn = urlParams.get('turn');
    if (turn) return buildTurnProjection({ projectId, turn });
  }

  if (projType === 'operator.promotions') {
    const urlParams = new URLSearchParams(window.location.search);
    const promotionKey = urlParams.get('promotionKey');
    if (promotionKey) return buildPromotionProjection({ projectId, promotionKey });
  }

  if (projType === 'operator.evidence_packet') {
    if (!evidencePacketKey) {
      return loadLocalProjectionFixture(projType);
    }
    return callAiEngine('getLogaEvidencePacketProjection', evidencePacketKey)
      .catch(() => loadLocalProjectionFixture(projType));
  }

  return loadLocalProjectionFixture(projType);
}

function buildSubtaskProjection({ projectId = 'ai-engine', itemKey = 'generic-wrapper-runtime', taskKey = 'replace-hard-coded-scripts', subtaskKey = '' }) {
  const subtask = getSubtask(subtaskKey);
  return {
    text: `---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.subtask_detail"
projection_id: "subtask:${subtask.key}"
source_truth: "sql"
primary_question: "What is the next concrete step?"
workspace_mode: "focus"
active_surfaces: "roadmap"
---

# Subtask
## ${subtask.title}

::breadcrumb
- label: "Roadmap Item"
  target: "/viewer/ai-engine/projects/${projectId}/roadmap/${itemKey}"
  projection_type: "operator.roadmap_item"

- label: "Task"
  target: "projection-detail.html?type=operator.task_detail&projectId=${projectId}&itemKey=${itemKey}&taskKey=${taskKey}"
  projection_type: "operator.task_detail"
::

::focus
question: "What is the next concrete step?"
answer: "${subtask.summary}"
status: "${subtask.status}"
::

::panel
title: "${subtask.title}"
status: "${subtask.status}"
owner: "operator"
summary: "${subtask.summary}"
::

::next_actions
- Return to task
- Review evidence
- Refresh branch
::`,
    contentType: 'text/markdown; charset=utf-8',
    projectionType: 'operator.subtask_detail',
    sourceTruth: 'sql',
    provenance: {
      sourceTruth: 'sql',
      projectionType: 'operator.subtask_detail',
      projectId,
      itemKey,
      taskKey,
      subtaskKey,
      fixture: 'local-subtask-projection',
    },
  };
}

function getSubtask(subtaskKey) {
  return {
    'identify-hard-coded-paths': {
      key: 'identify-hard-coded-paths',
      title: 'Identify hard-coded source and destination paths',
      status: 'done',
      summary: 'The hard-coded wrapper script paths have been located and isolated from the intended reusable operation model.',
    },
    'extract-operation-model': {
      key: 'extract-operation-model',
      title: 'Extract reusable wrapper operation model',
      status: 'in progress',
      summary: 'The bespoke behavior is being converted into a reusable wrapper operation contract.',
    },
    'bind-sql-evidence': {
      key: 'bind-sql-evidence',
      title: 'Bind operation records to SQL-backed wrapper evidence',
      status: 'blocked',
      summary: 'The subtask is blocked until wrapper execution evidence has a governed SQL-backed surface.',
    },
    'replace-script-path': {
      key: 'replace-script-path',
      title: 'Replace script path with SDK-visible governed execution',
      status: 'not started',
      summary: 'The final script path replacement waits for the wrapper operation and evidence surfaces to be available.',
    },
  }[subtaskKey] || {
    key: subtaskKey || 'subtask',
    title: subtaskKey || 'Subtask',
    status: 'unknown',
    summary: 'This subtask is available structurally, but no detailed projection has been published yet.',
  };
}

function buildProjectDetailProjection(projectId, summary) {
  const title = summary.implementation_packet_title
    ? summary.implementation_packet_title.replace(/\s*Implementation Roadmap\s*$/i, '').trim()
    : projectId;
  const completion = summary.completion_pct ? `${summary.completion_pct}%` : 'unknown';
  const activeItem = summary.active_item_title || 'None';
  const activeStatus = summary.active_item_status || '';
  const charter = summary.charter_status || 'unknown';
  const objective = summary.objective || '';
  const owner = summary.current_owner || 'operator';
  const doneItems = summary.done_items ?? '';
  const blockers = summary.blocker_count ?? 0;
  const packetKey = summary.implementation_packet_key || '';

  const text = `---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.project_detail"
projection_id: "project:${projectId}"
source_truth: "sql"
primary_question: "What is happening in this project?"
workspace_mode: "focus"
active_surfaces: "roadmap,promotions,workflows,memory"
---

# ${title}

::breadcrumb
- label: "Projects"
  target: "/viewer/ai-engine/projects"
  projection_type: "operator.project_catalog"
::

::focus
question: "What is happening in this project?"
answer: "${objective.replace(/"/g, "'")}"
status: "${charter}"
::

## Current Focus

::panel
title: "${activeItem}"
status: "${activeStatus}"
owner: "${owner}"
::

## Open Lanes

::nav
- label: "Roadmap"
  target: "/viewer/ai-engine/projects/${projectId}/roadmap"
  projection_type: "operator.project_roadmap"

- label: "Promotions"
  target: "/viewer/ai-engine/projects/${projectId}/promotions"
  projection_type: "operator.promotions"

- label: "Workflow Runs"
  target: "/viewer/ai-engine/projects/${projectId}/workflow-runs"
  projection_type: "operator.workflow_runs"

- label: "Agent Session"
  target: "/viewer/ai-engine/projects/${projectId}/agent-session"
  projection_type: "operator.agent_session"
::

## Portfolio Status

::metric_row
Completion: ${completion}
Completed Items: ${doneItems}
Blockers: ${blockers}
Charter: ${charter}
::

::next_actions
- Open Roadmap
- Review Active Item
- Check Workflow Runs
::`;

  return { text, contentType: 'text/markdown; charset=utf-8', projectionType: 'operator.project_detail', sourceTruth: 'sql', provenance: { sourceTruth: 'sql', projectionType: 'operator.project_detail', projectId, implementationPacketKey: packetKey } };
}

function buildTaskProjection({ projectId = 'ai-engine', itemKey = 'generic-wrapper-runtime', taskKey = '' }) {
  const task = getTask(taskKey);
  const text = `---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.task_detail"
projection_id: "task:${task.key}"
source_truth: "sql"
primary_question: "What needs to happen?"
workspace_mode: "execution"
active_surfaces: "roadmap,workflows"
---

# Task
## ${task.title}

::breadcrumb
- label: "Roadmap Item"
  target: "/viewer/ai-engine/projects/${projectId}/roadmap/${itemKey}"
  projection_type: "operator.roadmap_item"
::

::focus
question: "What needs to happen?"
answer: "${task.summary}"
status: "${task.status}"
::

::panel
title: "${task.title}"
status: "${task.status}"
owner: "operator"
summary: "${task.summary}"
::

::next_actions
- Continue implementation
- Review evidence
- Return to roadmap item
::`;
  return { text, contentType: 'text/markdown; charset=utf-8', projectionType: 'operator.task_detail', sourceTruth: 'sql', provenance: { sourceTruth: 'sql', projectionType: 'operator.task_detail', projectId, itemKey, taskKey, fixture: 'local-task-projection' } };
}

function getTask(taskKey) {
  return {
    'define-contract-schema': {
      key: 'define-contract-schema',
      title: 'Define Wrapper Contract Schema',
      status: 'done',
      summary: 'The wrapper contract schema has been defined. It specifies the input, output, and evidence requirements for all governed wrapper executions.',
    },
    'implement-wrapper-operations': {
      key: 'implement-wrapper-operations',
      title: 'Implement Reusable Wrapper Operations',
      status: 'in progress',
      summary: 'Generic wrapper operations are being built to replace bespoke script behavior with contract-driven, reusable execution primitives.',
    },
    'replace-hard-coded-scripts': {
      key: 'replace-hard-coded-scripts',
      title: 'Replace Hard-coded Wrapper Scripts',
      status: 'blocked',
      summary: 'The system must replace bespoke source/destination rewrite behavior with generic contract-driven operations. Blocked until the SDK promotes the required execution surfaces.',
    },
    'validate-execution-evidence': {
      key: 'validate-execution-evidence',
      title: 'Validate Wrapper Execution Evidence',
      status: 'not started',
      summary: 'Wrapper execution evidence must be validated against the contract before the governed refactor path is considered complete.',
    },
  }[taskKey] || {
    key: taskKey || 'task',
    title: taskKey || 'Task',
    status: 'unknown',
    summary: 'No detailed projection has been published for this task yet.',
  };
}

function buildTurnProjection({ projectId = 'ai-engine', turn = '' }) {
  const turnData = getTurn(turn);
  const text = `---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.agent_session"
projection_id: "turn:${projectId}:${turn}"
source_truth: "sql"
primary_question: "What happened in this turn?"
workspace_mode: "evidence"
active_surfaces: "memory,evidence"
agent_href: "projection-detail.html?type=operator.agent_session&projectId=${projectId}"
---

# Agent Turn ${turn}

::breadcrumb
- label: "Agent Session"
  target: "/viewer/ai-engine/projects/${projectId}/agent-session"
  projection_type: "operator.agent_session"
::

::focus
question: "What happened in this turn?"
answer: "${turnData.summary}"
status: "${turnData.status}"
::

::panel
title: "Turn ${turn}: ${turnData.action}"
status: "${turnData.status}"
evidence: "${turnData.evidence}"
::

::next_actions
- Return to session
- Review evidence
- Open workflow run
::`;
  return { text, contentType: 'text/markdown; charset=utf-8', projectionType: 'operator.agent_session', sourceTruth: 'sql', provenance: { sourceTruth: 'sql', projectionType: 'operator.agent_session', projectId, turn, fixture: 'local-turn-projection' } };
}

function getTurn(turn) {
  return {
    '1': { action: 'startWork', status: 'persisted', evidence: 'claim acquired', summary: 'Work was started. A governed claim was acquired and the session was initialized under the refactor workflow.' },
    '2': { action: 'analyze candidate', status: 'persisted', evidence: 'responsibility map produced', summary: 'The refactor candidate was analyzed. A responsibility map was produced and persisted as SQL-backed evidence.' },
    '3': { action: 'propose contract', status: 'pending', evidence: 'awaiting wrapper evidence', summary: 'A wrapper contract proposal is pending. Execution is waiting for the evidence packet to be produced.' },
  }[String(turn)] || { action: `Turn ${turn}`, status: 'unknown', evidence: 'none', summary: 'No detail has been published for this turn yet.' };
}

function buildPromotionProjection({ projectId = 'ai-engine', promotionKey = '' }) {
  const promo = getPromotion(promotionKey);
  const text = `---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.promotions"
projection_id: "promotion:${projectId}:${promotionKey}"
source_truth: "sql"
primary_question: "What does this promotion enable?"
workspace_mode: "evolution"
active_surfaces: "promotions,cicd"
---

# Promotion
## ${promotionKey}

::breadcrumb
- label: "Promotions"
  target: "/viewer/ai-engine/projects/${projectId}/promotions"
  projection_type: "operator.promotions"
::

::focus
question: "What does this promotion enable?"
answer: "${promo.impact}"
status: "${promo.status}"
::

::panel
title: "${promotionKey}"
status: "${promo.status}"
impact: "${promo.impact}"
summary: "${promo.description}"
::

::next_actions
- Return to promotions
- View workflow runs
- Check downstream consumers
::`;
  return { text, contentType: 'text/markdown; charset=utf-8', projectionType: 'operator.promotions', sourceTruth: 'sql', provenance: { sourceTruth: 'sql', projectionType: 'operator.promotions', projectId, promotionKey, fixture: 'local-promotion-projection' } };
}

function getPromotion(promotionKey) {
  return {
    'startWork': { status: 'promoted', impact: 'Unified governed entrypoint for all workflow execution.', description: 'startWork is the single governed entrypoint for beginning any workflow run. It acquires a claim, initializes the session, and ensures all execution is traceable from the first turn.' },
    'completeTurn': { status: 'promoted', impact: 'Governed execution exit and DB turn persistence.', description: 'completeTurn closes each agent turn with explicit evidence capture and DB persistence, ensuring no turn completes without a durable SQL-backed record.' },
    'runCharter': { status: 'promoted', impact: 'Charter execution through a single workflow primitive.', description: 'runCharter replaces ad hoc charter scripts with a single governed workflow primitive that produces a structured charter artifact and SQL evidence.' },
    'createRefactorImplementationPlan': { status: 'needed', impact: 'Prevents local plan files and bespoke choreography.', description: 'This promotion is needed to replace hand-authored implementation plan files with a governed SDK method that produces a SQL-backed plan artifact reviewable by the operator.' },
    'executeGovernedRefactorWrapper': { status: 'needed', impact: 'Makes wrapper execution observable through the SDK.', description: 'This promotion is needed to replace direct script execution with a governed wrapper call that produces observable, evidence-backed execution records accessible from project surfaces.' },
    'getRefactorWrapperEvidence': { status: 'needed', impact: 'Makes wrapper evidence inspectable from project surfaces.', description: 'This promotion is needed to expose the wrapper execution evidence packet as a first-class SDK surface so operators can verify refactor execution without navigating raw SQL.' },
  }[promotionKey] || { status: 'unknown', impact: 'No detail available.', description: 'No promotion detail has been published for this key yet.' };
}

async function loadLocalProjectionFixture(projType) {
  const safeType = String(projType || '').replace(/[^a-zA-Z0-9._-]/g, '');
  const response = await fetch(`/fixtures/projections/${safeType}.md`);
  if (!response.ok) {
    throw new Error(`Unknown projection type: ${projType}`);
  }

  const text = await response.text();
  return {
    text,
    contentType: 'text/markdown; charset=utf-8',
    projectionType: projType,
    sourceTruth: 'sql',
    provenance: {
      sourceTruth: 'sql',
      projectionType: projType,
      fixture: 'docs/loga-project-projections',
    },
  };
}
