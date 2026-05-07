import { callAiEngine, aiEngineFetch } from './api-client.js';
import {
  DEFAULT_ITEM_KEY,
  DEFAULT_PROJECT_ID,
  buildFocusNodeId,
  getItemKey,
  getProjectId,
} from '../shared/projection-schema.js';

const childrenCache = new Map();
let activeContainer = null;
let activeCurrentNodeId = null;

export function renderProjectionTree(container, { currentUrl = window.location.href } = {}) {
  const currentNodeId = getCurrentNodeId(currentUrl);
  activeContainer = container;
  activeCurrentNodeId = currentNodeId;

  container.innerHTML = '<p class="projection-tree__loading">Loading root nodes...</p>';
  loadTreeRoot()
    .then((payload) => {
      container.innerHTML = '';
      const root = document.createElement('div');
      root.className = 'projection-tree__root';
      payload.nodes.forEach((node) => root.appendChild(renderNode(node, { currentNodeId })));
      container.appendChild(root);
      expandCurrentPath(container, currentNodeId);
      notifyTreeChanged(container);
    })
    .catch((error) => {
      container.innerHTML = `<p class="loga-error">Error loading projection tree: ${escapeHtml(error.message)}</p>`;
    });
}

export function collapseProjectionTree(container = activeContainer) {
  if (!container) return;
  container.querySelectorAll('.projection-tree__node[data-expanded="true"]').forEach((node) => setExpanded(node, false));
  notifyTreeChanged(container);
}

export async function expandFocusPath(container = activeContainer) {
  if (!container) return;
  const { projectId, itemKey } = getProjectedFocusContext();
  let nodeId = buildFocusNodeId(projectId, itemKey);
  try {
    const activeItem = await callAiEngine('getProjectRoadmapActiveItem', projectId);
    const activeItemKey = getCurrentRoadmapItemKey(activeItem);
    if (activeItemKey) {
      nodeId = buildFocusNodeId(projectId, activeItemKey);
    }
  } catch {
    // Fall back to the current URL context if the engine cannot resolve the active item yet.
  }
  await expandPathToNode(nodeId, container);
}

export async function refreshSelectedBranch(container = activeContainer) {
  if (!container) return;
  const current = container.querySelector('.projection-tree__summary.is-current')?.closest('.projection-tree__node');
  const branch = current?.querySelector(':scope > .projection-tree__children')
    ? current
    : current?.parentElement?.closest('.projection-tree__node');
  if (!branch) return;
  const node = getNodePayload(branch);
  if (!node?.hasChildren) return;
  await refreshBranch(branch, node, { currentNodeId: activeCurrentNodeId });
  notifyTreeChanged(container);
}

export async function expandPathToNode(nodeId, container = activeContainer) {
  if (!container) return;
  const path = [...getAncestorPath(nodeId), nodeId];
  for (const pathNodeId of path) {
    const wrapper = container.querySelector(`[data-node-id="${cssEscape(pathNodeId)}"]`);
    if (!wrapper) return;
    const payloadNode = getNodePayload(wrapper);
    if (!payloadNode) return;
    if (payloadNode.hasChildren) {
      await ensureChildren(wrapper, payloadNode, { currentNodeId: activeCurrentNodeId });
      setExpanded(wrapper, true);
    }
  }
  notifyTreeChanged(container);
}

async function loadTreeRoot() {
  const response = await aiEngineFetch('/api/loga/tree');
  if (!response.ok) throw new Error(`Tree root failed: ${response.status}`);
  return response.json();
}

async function loadChildren(node, { refresh = false } = {}) {
  if (!node.lazyLoadUrl) return { parent_id: node.id, nodes: [] };
  if (!refresh && childrenCache.has(node.id)) return childrenCache.get(node.id);

  const response = await aiEngineFetch(node.lazyLoadUrl);
  if (!response.ok) throw new Error(`Tree node ${node.id} failed: ${response.status}`);

  const payload = await response.json();
  childrenCache.set(node.id, payload);
  return payload;
}

function renderNode(node, { currentNodeId }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'projection-tree__node';
  wrapper.dataset.nodeId = node.id;
  wrapper.dataset.nodePayload = JSON.stringify(node);
  wrapper.dataset.childrenLoaded = 'false';

  const row = document.createElement('div');
  row.className = getRowClassName(node, currentNodeId);
  row.setAttribute('role', 'treeitem');
  row.dataset.label = node.label || '';
  row.dataset.type = node.type || '';
  row.dataset.status = node.status || node.meta || '';
  row.dataset.searchText = [
    node.label,
    node.type,
    node.status,
    node.meta,
    node.projectionType,
  ].filter(Boolean).join(' ').toLowerCase();
  if (node.hasChildren) row.setAttribute('aria-expanded', 'false');
  if (node.id === currentNodeId) row.setAttribute('aria-current', 'page');

  const caret = document.createElement('button');
  caret.className = 'projection-tree__caret';
  caret.type = 'button';
  caret.disabled = !node.hasChildren;
  caret.setAttribute('aria-label', `${node.hasChildren ? 'Expand' : 'Open'} ${node.label}`);
  caret.innerHTML = node.hasChildren ? '&#9654;' : '';
  caret.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleNode(wrapper, node, { currentNodeId });
  });

  const label = node.contentHref ? document.createElement('a') : document.createElement('button');
  label.className = 'projection-tree__label-action';
  if (node.contentHref) {
    label.href = node.contentHref;
  } else {
    label.type = 'button';
    label.addEventListener('click', () => toggleNode(wrapper, node, { currentNodeId }));
  }
  label.innerHTML = renderTreeLabel(node);

  const refresh = document.createElement('button');
  refresh.className = 'projection-tree__refresh';
  refresh.type = 'button';
  refresh.textContent = 'Refresh this branch';
  refresh.hidden = !node.hasChildren;
  refresh.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    refreshBranch(wrapper, node, { currentNodeId });
  });

  row.append(caret, label, refresh);
  wrapper.appendChild(row);

  if (node.hasChildren) {
    const childContainer = document.createElement('div');
    childContainer.className = 'projection-tree__children';
    childContainer.hidden = true;
    wrapper.appendChild(childContainer);
  }

  return wrapper;
}

async function toggleNode(wrapper, node, { currentNodeId }) {
  if (!node.hasChildren) return;

  const isExpanded = wrapper.dataset.expanded === 'true';
  if (isExpanded) {
    setExpanded(wrapper, false);
    return;
  }

  await ensureChildren(wrapper, node, { currentNodeId });
  setExpanded(wrapper, true);
}

async function refreshBranch(wrapper, node, { currentNodeId }) {
  if (!node.hasChildren) return;
  childrenCache.delete(node.id);
  wrapper.dataset.childrenLoaded = 'false';
  await ensureChildren(wrapper, node, { currentNodeId, refresh: true });
  setExpanded(wrapper, true);
}

async function ensureChildren(wrapper, node, { currentNodeId, refresh = false }) {
  if (!refresh && wrapper.dataset.childrenLoaded === 'true') return;

  const childContainer = wrapper.querySelector(':scope > .projection-tree__children');
  childContainer.hidden = false;
  childContainer.innerHTML = '<p class="projection-tree__loading">loading children...</p>';

  try {
    const payload = await loadChildren(node, { refresh });
    childContainer.innerHTML = '';
    payload.nodes.forEach((child) => {
      childContainer.appendChild(renderNode(child, { currentNodeId }));
    });
    wrapper.dataset.childrenLoaded = 'true';
    notifyTreeChanged(activeContainer);
  } catch (error) {
    childContainer.innerHTML = `<p class="loga-error">Error loading children: ${escapeHtml(error.message)}</p>`;
  }
}

function setExpanded(wrapper, expanded) {
  wrapper.dataset.expanded = String(expanded);
  const row = wrapper.querySelector(':scope > .projection-tree__summary');
  const childContainer = wrapper.querySelector(':scope > .projection-tree__children');
  const caret = wrapper.querySelector(':scope > .projection-tree__summary > .projection-tree__caret');

  row?.setAttribute('aria-expanded', String(expanded));
  if (childContainer) childContainer.hidden = !expanded;
  if (caret) caret.classList.toggle('is-expanded', expanded);
}

async function expandCurrentPath(container, currentNodeId) {
  const path = getAncestorPath(currentNodeId);
  let searchScope = container;
  for (const nodeId of path) {
    const wrapper = searchScope.querySelector(`[data-node-id="${cssEscape(nodeId)}"]`);
    if (!wrapper) return;

    const payloadNode = getNodePayload(wrapper);
    if (!payloadNode) return;

    await ensureChildren(wrapper, payloadNode, { currentNodeId });
    setExpanded(wrapper, true);

    const childContainer = wrapper.querySelector(':scope > .projection-tree__children');
    if (childContainer) searchScope = childContainer;
  }
}

function getNodePayload(wrapper) {
  const raw = wrapper.dataset.nodePayload;
  return raw ? JSON.parse(raw) : null;
}

function getRowClassName(node, currentNodeId) {
  return [
    'projection-tree__summary',
    node.hasChildren ? 'projection-tree__branch' : 'projection-tree__leaf',
    node.id === currentNodeId ? 'is-current' : '',
    getAncestorPath(currentNodeId).includes(node.id) ? 'is-active-branch' : '',
  ].filter(Boolean).join(' ');
}

function renderTreeLabel(node) {
  return `
    <span class="projection-tree__copy">
      <span class="projection-tree__label">${escapeHtml(node.label)}</span>
      ${node.meta || node.status ? `<span class="projection-tree__meta">${escapeHtml(node.meta || node.status)}</span>` : ''}
    </span>
  `;
}

function notifyTreeChanged(container) {
  container?.dispatchEvent(new CustomEvent('projection-tree:changed', { bubbles: true }));
}

function getCurrentNodeId(currentUrl) {
  const url = new URL(currentUrl, window.location.href);
  const type = url.searchParams.get('type');
  const surface = url.searchParams.get('surface');
  const projectId = getProjectId(url.searchParams.get('projectId'));
  const itemKey = getItemKey(url.searchParams.get('itemKey'));
  const taskKey = url.searchParams.get('taskKey');
  const subtaskKey = url.searchParams.get('subtaskKey');
  const promotionKey = url.searchParams.get('promotionKey');
  const workflowRunId = url.searchParams.get('workflowRunId');
  const turn = url.searchParams.get('turn');

  if (surface === 'operator.project_detail') return 'project-detail-group';
  if (surface === 'operator.project_roadmap') return 'project-roadmap-group';
  if (type === 'operator.home') return 'operator-home';
  if (type === 'operator.project_catalog') return 'project-catalog';
  if (type === 'operator.project_portfolio') return 'project-portfolio';
  if (type === 'operator.project_detail') return `project-${projectId}-detail`;
  if (type === 'operator.project_roadmap') return `project-${projectId}-roadmap`;
  if (type === 'operator.roadmap_items') return `project-${projectId}-roadmap-items`;
  if (type === 'operator.roadmap_item') return `project-${projectId}-roadmap-item-${itemKey}`;
  if (type === 'operator.task_detail') {
    return taskKey
      ? `project-${projectId}-roadmap-item-${itemKey}-tasks-${taskKey}`
      : `project-${projectId}-roadmap-item-${itemKey}-tasks`;
  }
  if (type === 'operator.subtask_detail') {
    return `project-${projectId}-roadmap-item-${itemKey}-tasks-${taskKey || 'replace-hard-coded-scripts'}-${subtaskKey || ''}`;
  }
  if (type === 'operator.evidence_packet') return `project-${projectId}-roadmap-item-${itemKey}-evidence`;
  if (type === 'operator.workflow_run') return `project-${projectId}-workflow-runs-${workflowRunId || 'refactor-runtime'}`;
  if (type === 'operator.workflow_runs') return `project-${projectId}-workflow-runs`;
  if (type === 'operator.promotions') {
    return promotionKey
      ? `project-${projectId}-promotions-${promotionKey}`
      : `project-${projectId}-promotions`;
  }
  if (type === 'operator.cicd_status') return `project-${projectId}-cicd`;
  if (type === 'operator.agent_session') {
    return turn
      ? `project-${projectId}-turns-${turn}`
      : `project-${projectId}-agent-session`;
  }
  return 'projections';
}

function getProjectedFocusContext() {
  if (!globalThis.window?.location) {
    return { projectId: DEFAULT_PROJECT_ID, itemKey: DEFAULT_ITEM_KEY };
  }
  const url = new URL(globalThis.window.location.href);
  return {
    projectId: getProjectId(url.searchParams.get('projectId')),
    itemKey: getItemKey(url.searchParams.get('itemKey')),
  };
}

function getCurrentRoadmapItemKey(item) {
  return String(
    item?.item_key
    || item?.key
    || item?.slug
    || item?.implementation_item_id
    || ''
  ).trim();
}

function getAncestorPath(nodeId) {
  if (!nodeId) return [];
  if (nodeId === 'projections') return [];
  const path = ['projections'];

  if (['operator-home', 'project-catalog', 'project-portfolio', 'project-detail-group', 'project-roadmap-group'].includes(nodeId)) {
    return path;
  }

  const projectMatch = nodeId.match(/^project-(.+?)(?:-(detail|roadmap|promotions|cicd|agent-session|workflow-runs|memory|turns)|$)/);
  if (!projectMatch) return path;

  const projectId = projectMatch[1];
  path.push('project-surfaces', `project-${projectId}`);

  if (nodeId.startsWith(`project-${projectId}-promotions-`)) {
    path.push(`project-${projectId}-promotions`);
  }

  if (nodeId.startsWith(`project-${projectId}-workflow-runs-`)) {
    path.push(`project-${projectId}-workflow-runs`);
  }

  if (nodeId.startsWith(`project-${projectId}-memory-`)) {
    path.push(`project-${projectId}-agent-session`, `project-${projectId}-memory`);
  }

  if (nodeId.startsWith(`project-${projectId}-turns-`)) {
    path.push(`project-${projectId}-agent-session`, `project-${projectId}-turns`);
  }

  if (nodeId.includes(`project-${projectId}-roadmap`)) {
    path.push(`project-${projectId}-roadmap`);
  }

  if (nodeId.includes(`project-${projectId}-roadmap-item-`)) {
    path.push(`project-${projectId}-roadmap-items`);
    const itemKey = getRoadmapItemKey(nodeId, projectId);
    path.push(`project-${projectId}-roadmap-item-${itemKey}`);

    if (nodeId.includes(`project-${projectId}-roadmap-item-${itemKey}-tasks`)) {
      path.push(`project-${projectId}-roadmap-item-${itemKey}-tasks`);
      const taskKey = getTaskKey(nodeId, projectId, itemKey);
      if (taskKey) path.push(`project-${projectId}-roadmap-item-${itemKey}-tasks-${taskKey}`);
    }

    if (nodeId.includes(`project-${projectId}-roadmap-item-${itemKey}-workflow-runs`)) {
      path.push(`project-${projectId}-roadmap-item-${itemKey}-workflow-runs`);
    }
  }

  return path;
}

function getRoadmapItemKey(nodeId, projectId) {
  return nodeId
    .replace(`project-${projectId}-roadmap-item-`, '')
    .replace(/-(tasks|evidence|workflow-runs)(?:-.+)?$/, '');
}

function getTaskKey(nodeId, projectId, itemKey) {
  const prefix = `project-${projectId}-roadmap-item-${itemKey}-tasks-`;
  if (!nodeId.startsWith(prefix)) return '';
  return nodeId.slice(prefix.length).replace(/-(identify-hard-coded-paths|extract-operation-model|bind-sql-evidence|replace-script-path)$/, '');
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/"/g, '\\"');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
