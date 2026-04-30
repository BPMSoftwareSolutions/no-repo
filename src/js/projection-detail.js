import { callAiEngine, renderMarkdownProjection } from './api-client.js';
import { renderProjectionTree } from './projection-tree.js';

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
    
    container.innerHTML = renderMarkdownProjection(proj.text);
    document.getElementById('evidence-content').textContent = JSON.stringify(proj.provenance || proj, null, 2);
  } catch (error) {
    container.innerHTML = `<p style="color: var(--red)">Error loading projection: ${error.message}</p>`;
  }
});

async function renderPersistentTree(tree) {
  try {
    renderProjectionTree(tree);
  } catch (error) {
    tree.innerHTML = `<p style="color: var(--red)">Error loading projection tree: ${error.message}</p>`;
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
      return loadLocalProjectionFixture('operator.workflow_runs');
    }
    return callAiEngine('getLogaWorkflowRunProjection', workflowRunId)
      .catch(() => loadLocalProjectionFixture('operator.workflow_runs'));
  }

  if (projType === 'operator.subtask_detail') {
    return buildSubtaskProjection({ projectId, itemKey, taskKey, subtaskKey });
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

async function loadLocalProjectionFixture(projType) {
  const safeType = String(projType || '').replace(/[^a-zA-Z0-9._-]/g, '');
  const response = await fetch(`/docs/loga-project-projections/markdown-projections/${safeType}.md`);
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
