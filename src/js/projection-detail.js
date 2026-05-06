import { callAiEngine, renderMarkdownProjection } from './api-client.js';
import { renderProjectionTree } from './projection-tree.js';
import { parseMarkdown } from '../renderer/parser.js';
import { mountWorkspaceChrome } from './workspace-chrome.js';
import { MARKDOWN_UI_REGISTRY } from '../renderer/element-registry.js';

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const projType = urlParams.get('type') || 'operator.home';
  const params = {
    projectId: urlParams.get('projectId'),
    itemKey: urlParams.get('itemKey'),
    taskKey: urlParams.get('taskKey'),
    subtaskKey: urlParams.get('subtaskKey'),
    workflowRunId: urlParams.get('workflowRunId'),
    evidencePacketKey: urlParams.get('evidencePacketKey'),
    turn: urlParams.get('turn'),
    promotionKey: urlParams.get('promotionKey'),
    target: urlParams.get('target'),
  };

  const container = document.getElementById('projection-content');
  const tree = document.getElementById('projection-tree');

  mountWorkspaceChrome({});
  renderPersistentTree(tree);

  try {
    if (params.target) {
      throw new Error(`No local projection route is registered for target: ${params.target}`);
    }

    const proj = await loadProjection(projType, params);
    const { frontmatter } = parseMarkdown(proj.text || '');

    renderPageHeader(frontmatter);
    mountWorkspaceChrome(frontmatter);
    applyShellRules(frontmatter);

    container.innerHTML = renderMarkdownProjection(proj.text);
    document.getElementById('evidence-content').textContent = JSON.stringify(proj.provenance || proj, null, 2);
  } catch (error) {
    container.innerHTML = `<p class="loga-error">Error loading projection: ${error.message}</p>`;
  }
});

// --- Page header ---

function renderPageHeader(frontmatter) {
  const header = document.getElementById('page-header');
  if (!header) return;
  const label = frontmatter.surface_label || '';
  const question = frontmatter.primary_question || '';
  header.innerHTML = [
    `<p><a href="index.html">Inspection Home</a> / <a href="projections.html">Projection Inspection</a></p>`,
    label ? `<h1>${escapeHtml(label)}</h1>` : '',
    question ? `<p><strong>Primary question:</strong> <span>${escapeHtml(question)}</span></p>` : '',
  ].join('');
}

// --- Shell rules ---

function applyShellRules(frontmatter) {
  const mode = frontmatter.workspace_mode || 'default';
  const rules = (MARKDOWN_UI_REGISTRY.shell || {})[mode] || (MARKDOWN_UI_REGISTRY.shell || {}).default || {};
  const aside = document.querySelector('.projection-shell__tree');
  if (aside) aside.hidden = rules.showTree === false;
  const treeTitle = document.getElementById('tree-title');
  if (treeTitle && rules.treeTitle !== undefined) {
    treeTitle.textContent = rules.treeTitle || 'Knowledge Tree';
  }
}

// --- Persistent tree ---

async function renderPersistentTree(tree) {
  try {
    renderProjectionTree(tree);
  } catch (error) {
    tree.innerHTML = `<p class="loga-error">Error loading projection tree: ${error.message}</p>`;
  }
}

// --- Template loading ---

const templateCache = new Map();

async function loadTemplate(name) {
  if (templateCache.has(name)) return templateCache.get(name);
  const res = await fetch(`/fixtures/templates/${name}.md.tmpl`);
  if (!res.ok) throw new Error(`Template not found: ${name}`);
  const text = await res.text();
  templateCache.set(name, text);
  return text;
}

function applyTemplate(template, tokens) {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const parts = key.trim().split('.');
    let val = tokens;
    for (const p of parts) val = val?.[p];
    return val != null ? String(val) : '';
  });
}

// --- Transforms (registry-named, async, load templates from files) ---

const TRANSFORMS = {
  async buildProjectDetailProjection(params, apiData) {
    const summary = apiData || {};
    const projectId = params.projectId || 'ai-engine';
    const rawTitle = summary.implementation_packet_title || projectId;
    const title = rawTitle.replace(/\s*Implementation Roadmap\s*$/i, '').trim();
    const tokens = {
      projectId,
      title,
      objective: (summary.objective || '').replace(/"/g, "'"),
      charter: summary.charter_status || 'unknown',
      activeItem: summary.active_item_title || 'None',
      activeStatus: summary.active_item_status || '',
      owner: summary.current_owner || 'operator',
      completion: summary.completion_pct ? `${summary.completion_pct}%` : 'unknown',
      doneItems: summary.done_items ?? '',
      blockers: summary.blocker_count ?? 0,
    };
    const template = await loadTemplate('operator.project_detail');
    const text = applyTemplate(template, tokens);
    const packetKey = summary.implementation_packet_key || '';
    return {
      text,
      contentType: 'text/markdown; charset=utf-8',
      projectionType: 'operator.project_detail',
      sourceTruth: 'sql',
      provenance: { sourceTruth: 'sql', projectionType: 'operator.project_detail', projectId, implementationPacketKey: packetKey },
    };
  },

  async buildTaskProjection(params) {
    const projectId = params.projectId || 'ai-engine';
    const itemKey = params.itemKey || 'generic-wrapper-runtime';
    const task = getTask(params.taskKey || '');
    const template = await loadTemplate('operator.task_detail');
    const text = applyTemplate(template, { projectId, itemKey, task });
    return {
      text,
      contentType: 'text/markdown; charset=utf-8',
      projectionType: 'operator.task_detail',
      sourceTruth: 'sql',
      provenance: { sourceTruth: 'sql', projectionType: 'operator.task_detail', projectId, itemKey, taskKey: params.taskKey, fixture: 'local-task-projection' },
    };
  },

  async buildSubtaskProjection(params) {
    const projectId = params.projectId || 'ai-engine';
    const itemKey = params.itemKey || 'generic-wrapper-runtime';
    const taskKey = params.taskKey || 'replace-hard-coded-scripts';
    const subtask = getSubtask(params.subtaskKey || '');
    const template = await loadTemplate('operator.subtask_detail');
    const text = applyTemplate(template, { projectId, itemKey, taskKey, subtask });
    return {
      text,
      contentType: 'text/markdown; charset=utf-8',
      projectionType: 'operator.subtask_detail',
      sourceTruth: 'sql',
      provenance: { sourceTruth: 'sql', projectionType: 'operator.subtask_detail', projectId, itemKey, taskKey, subtaskKey: params.subtaskKey, fixture: 'local-subtask-projection' },
    };
  },

  async buildTurnProjection(params) {
    const projectId = params.projectId || 'ai-engine';
    const turn = params.turn || '';
    const turnData = getTurn(turn);
    const template = await loadTemplate('operator.turn_detail');
    const text = applyTemplate(template, { projectId, turn, turnData });
    return {
      text,
      contentType: 'text/markdown; charset=utf-8',
      projectionType: 'operator.agent_session',
      sourceTruth: 'sql',
      provenance: { sourceTruth: 'sql', projectionType: 'operator.agent_session', projectId, turn, fixture: 'local-turn-projection' },
    };
  },

  async buildPromotionProjection(params) {
    const projectId = params.projectId || 'ai-engine';
    const promotionKey = params.promotionKey || '';
    const promo = getPromotion(promotionKey);
    const template = await loadTemplate('operator.promotion_detail');
    const text = applyTemplate(template, { projectId, promotionKey, promo });
    return {
      text,
      contentType: 'text/markdown; charset=utf-8',
      projectionType: 'operator.promotions',
      sourceTruth: 'sql',
      provenance: { sourceTruth: 'sql', projectionType: 'operator.promotions', projectId, promotionKey, fixture: 'local-promotion-projection' },
    };
  },
};

// --- Registry-driven route executor ---

async function loadProjection(projType, params) {
  const routes = MARKDOWN_UI_REGISTRY.routes || {};
  const def = routes[projType];

  if (!def) return loadLocalProjectionFixture(projType);

  for (const req of (def.required || [])) {
    if (!params[req]) throw new Error(`${projType} requires ${req}. Add ?${req}=... to the URL.`);
  }

  const paramValues = (def.params || []).map(p => params[p]);
  const allParamsPresent = paramValues.every(Boolean);

  // Transform-only route (no API)
  if (def.transform && !def.api) {
    if (!allParamsPresent && def.fixtureFallback) return loadLocalProjectionFixture(projType);
    return TRANSFORMS[def.transform](params);
  }

  // API route (with optional transform)
  if (def.api) {
    if (!allParamsPresent && def.fixtureFallback) return loadLocalProjectionFixture(projType);
    const apiArgs = paramValues.filter(Boolean);
    const apiCall = () => callAiEngine(def.api, ...apiArgs);
    if (def.transform) {
      const promise = apiCall().then(data => {
        const apiData = def.transformDataPath ? (data[def.transformDataPath] || data) : data;
        return TRANSFORMS[def.transform](params, apiData);
      });
      return def.fixtureFallback ? promise.catch(() => loadLocalProjectionFixture(projType)) : promise;
    }
    return def.fixtureFallback ? apiCall().catch(() => loadLocalProjectionFixture(projType)) : apiCall();
  }

  return loadLocalProjectionFixture(projType);
}

async function loadLocalProjectionFixture(projType) {
  const safeType = String(projType || '').replace(/[^a-zA-Z0-9._-]/g, '');
  const response = await fetch(`/fixtures/projections/${safeType}.md`);
  if (!response.ok) throw new Error(`Unknown projection type: ${projType}`);
  const text = await response.text();
  return {
    text,
    contentType: 'text/markdown; charset=utf-8',
    projectionType: projType,
    sourceTruth: 'sql',
    provenance: { sourceTruth: 'sql', projectionType: projType, fixture: 'docs/loga-project-projections' },
  };
}

// --- Utility ---

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- Data lookup tables ---

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

function getTurn(turn) {
  return {
    '1': { action: 'startWork', status: 'persisted', evidence: 'claim acquired', summary: 'Work was started. A governed claim was acquired and the session was initialized under the refactor workflow.' },
    '2': { action: 'analyze candidate', status: 'persisted', evidence: 'responsibility map produced', summary: 'The refactor candidate was analyzed. A responsibility map was produced and persisted as SQL-backed evidence.' },
    '3': { action: 'propose contract', status: 'pending', evidence: 'awaiting wrapper evidence', summary: 'A wrapper contract proposal is pending. Execution is waiting for the evidence packet to be produced.' },
  }[String(turn)] || { action: `Turn ${turn}`, status: 'unknown', evidence: 'none', summary: 'No detail has been published for this turn yet.' };
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
