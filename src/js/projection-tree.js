const childrenCache = new Map();

export function renderProjectionTree(container, { currentUrl = window.location.href } = {}) {
  const currentNodeId = getCurrentNodeId(currentUrl);

  container.innerHTML = '<p class="tree-loading">Loading root nodes...</p>';
  loadTreeRoot()
    .then((payload) => {
      container.innerHTML = '';
      const root = document.createElement('div');
      root.className = 'tree-root';
      payload.nodes.forEach((node) => root.appendChild(renderNode(node, { currentNodeId })));
      container.appendChild(root);
      expandCurrentPath(container, currentNodeId);
    })
    .catch((error) => {
      container.innerHTML = `<p style="color: var(--red)">Error loading projection tree: ${escapeHtml(error.message)}</p>`;
    });
}

async function loadTreeRoot() {
  const response = await fetch('/api/loga/tree');
  if (!response.ok) throw new Error(`Tree root failed: ${response.status}`);
  return response.json();
}

async function loadChildren(node, { refresh = false } = {}) {
  if (!node.lazyLoadUrl) return { parent_id: node.id, nodes: [] };
  if (!refresh && childrenCache.has(node.id)) return childrenCache.get(node.id);

  const response = await fetch(node.lazyLoadUrl);
  if (!response.ok) throw new Error(`Tree node ${node.id} failed: ${response.status}`);

  const payload = await response.json();
  childrenCache.set(node.id, payload);
  return payload;
}

function renderNode(node, { currentNodeId }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'tree-node';
  wrapper.dataset.nodeId = node.id;
  wrapper.dataset.nodePayload = JSON.stringify(node);
  wrapper.dataset.childrenLoaded = 'false';

  const row = document.createElement('div');
  row.className = getRowClassName(node, currentNodeId);
  row.setAttribute('role', 'treeitem');
  if (node.hasChildren) row.setAttribute('aria-expanded', 'false');
  if (node.id === currentNodeId) row.setAttribute('aria-current', 'page');

  const caret = document.createElement('button');
  caret.className = 'tree-caret';
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
  label.className = 'tree-label-action';
  if (node.contentHref) {
    label.href = node.contentHref;
  } else {
    label.type = 'button';
    label.addEventListener('click', () => toggleNode(wrapper, node, { currentNodeId }));
  }
  label.innerHTML = renderTreeLabel(node);

  const refresh = document.createElement('button');
  refresh.className = 'tree-refresh';
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
    childContainer.className = 'tree-children';
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

  const childContainer = wrapper.querySelector(':scope > .tree-children');
  childContainer.hidden = false;
  childContainer.innerHTML = '<p class="tree-loading">loading children...</p>';

  try {
    const payload = await loadChildren(node, { refresh });
    childContainer.innerHTML = '';
    payload.nodes.forEach((child) => {
      childContainer.appendChild(renderNode(child, { currentNodeId }));
    });
    wrapper.dataset.childrenLoaded = 'true';
  } catch (error) {
    childContainer.innerHTML = `<p style="color: var(--red)">Error loading children: ${escapeHtml(error.message)}</p>`;
  }
}

function setExpanded(wrapper, expanded) {
  wrapper.dataset.expanded = String(expanded);
  const row = wrapper.querySelector(':scope > .tree-summary');
  const childContainer = wrapper.querySelector(':scope > .tree-children');
  const caret = wrapper.querySelector(':scope > .tree-summary > .tree-caret');

  row?.setAttribute('aria-expanded', String(expanded));
  if (childContainer) childContainer.hidden = !expanded;
  if (caret) caret.classList.toggle('is-expanded', expanded);
}

async function expandCurrentPath(container, currentNodeId) {
  const path = getAncestorPath(currentNodeId);
  for (const nodeId of path) {
    const wrapper = container.querySelector(`[data-node-id="${cssEscape(nodeId)}"]`);
    if (!wrapper) return;

    const payloadNode = getNodePayload(wrapper);
    if (!payloadNode) return;

    await ensureChildren(wrapper, payloadNode, { currentNodeId });
    setExpanded(wrapper, true);
  }
}

function getNodePayload(wrapper) {
  const raw = wrapper.dataset.nodePayload;
  return raw ? JSON.parse(raw) : null;
}

function getRowClassName(node, currentNodeId) {
  return [
    'tree-summary',
    node.hasChildren ? 'tree-branch' : 'tree-leaf',
    node.id === currentNodeId ? 'is-current' : '',
    getAncestorPath(currentNodeId).includes(node.id) ? 'is-active-branch' : '',
  ].filter(Boolean).join(' ');
}

function renderTreeLabel(node) {
  return `
    <span class="tree-copy">
      <span class="tree-label">${escapeHtml(node.label)}</span>
      ${node.meta || node.status ? `<span class="tree-meta">${escapeHtml(node.meta || node.status)}</span>` : ''}
    </span>
  `;
}

function getCurrentNodeId(currentUrl) {
  const url = new URL(currentUrl, window.location.href);
  const type = url.searchParams.get('type');
  const surface = url.searchParams.get('surface');
  const projectId = url.searchParams.get('projectId') || 'ai-engine';
  const itemKey = url.searchParams.get('itemKey') || 'generic-wrapper-runtime';

  if (surface === 'operator.project_detail') return 'project-detail-group';
  if (surface === 'operator.project_roadmap') return 'project-roadmap-group';
  if (type === 'operator.home') return 'operator-home';
  if (type === 'operator.project_catalog') return 'project-catalog';
  if (type === 'operator.project_detail') return `project-${projectId}-detail`;
  if (type === 'operator.project_roadmap') return `project-${projectId}-roadmap`;
  if (type === 'operator.roadmap_item') return `project-${projectId}-roadmap-item-${itemKey}`;
  if (type === 'operator.task_detail') return `project-${projectId}-roadmap-item-${itemKey}-tasks`;
  if (type === 'operator.evidence_packet') return `project-${projectId}-roadmap-item-${itemKey}-evidence`;
  if (type === 'operator.workflow_runs') return `project-${projectId}-workflow-runs`;
  if (type === 'operator.promotions') return `project-${projectId}-promotions`;
  if (type === 'operator.cicd_status') return `project-${projectId}-cicd`;
  if (type === 'operator.agent_session') return `project-${projectId}-agent-session`;
  return 'projections';
}

function getAncestorPath(nodeId) {
  if (!nodeId) return [];
  if (nodeId === 'projections') return [];
  const path = ['projections'];

  if (['operator-home', 'project-catalog', 'project-detail-group', 'project-roadmap-group'].includes(nodeId)) {
    return path;
  }

  const projectMatch = nodeId.match(/^project-(.+?)(?:-(detail|roadmap|promotions|cicd|agent-session|workflow-runs)|$)/);
  if (!projectMatch) return path;

  const projectId = projectMatch[1];
  path.push('project-surfaces', `project-${projectId}`);

  if (nodeId.includes(`project-${projectId}-roadmap`)) {
    path.push(`project-${projectId}-roadmap`);
  }

  if (nodeId.includes(`project-${projectId}-roadmap-item-`)) {
    path.push(`project-${projectId}-current-focus`);
    const itemKey = nodeId
      .replace(`project-${projectId}-roadmap-item-`, '')
      .replace(/-(tasks|evidence|workflow-runs)$/, '');
    path.push(`project-${projectId}-roadmap-item-${itemKey}`);
  }

  return path;
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
