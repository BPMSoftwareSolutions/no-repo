import {
  collapseProjectionTree,
  expandFocusPath,
  expandPathToNode,
  refreshSelectedBranch,
  renderProjectionTree,
} from './projection-tree.js';

const SUGGESTIONS = [
  {
    label: 'Generic Wrapper Runtime',
    type: 'Roadmap Item',
    context: 'AI Engine',
    status: 'In progress',
    surfaces: ['roadmap'],
    attention: ['needs-attention', 'high-priority'],
    nodeId: 'project-ai-engine-roadmap-item-generic-wrapper-runtime',
    href: 'projection-detail.html?type=operator.roadmap_item&projectId=ai-engine&itemKey=generic-wrapper-runtime',
    tokens: 'wrap wrapper generic runtime roadmap current focus',
  },
  {
    label: 'Replace hard-coded wrapper scripts',
    type: 'Task',
    context: 'Generic Wrapper Runtime',
    status: 'Blocked',
    surfaces: ['roadmap'],
    attention: ['needs-attention', 'blocked-only', 'high-priority'],
    nodeId: 'project-ai-engine-roadmap-item-generic-wrapper-runtime-tasks-replace-hard-coded-scripts',
    href: 'projection-detail.html?type=operator.task_detail&projectId=ai-engine&itemKey=generic-wrapper-runtime&taskKey=replace-hard-coded-scripts',
    tokens: 'wrap wrapper scripts task blocked hard coded',
  },
  {
    label: 'Wrapper Evidence',
    type: 'Evidence Packet',
    context: 'AI Engine',
    status: 'Awaiting wrapper run',
    surfaces: ['evidence'],
    attention: ['needs-attention'],
    nodeId: 'project-ai-engine-roadmap-item-generic-wrapper-runtime-evidence',
    href: 'projection-detail.html?type=operator.evidence_packet&projectId=ai-engine&evidencePacketKey=generic-wrapper-runtime',
    tokens: 'wrap wrapper evidence trust packet',
  },
  {
    label: 'executeGovernedRefactorWrapper',
    type: 'SDK Promotion',
    context: 'AI Engine',
    status: 'Needed',
    surfaces: ['promotions'],
    attention: ['needs-attention', 'high-priority'],
    nodeId: 'project-ai-engine-promotions-executeGovernedRefactorWrapper',
    href: 'projection-detail.html?type=operator.promotions&projectId=ai-engine&promotionKey=executeGovernedRefactorWrapper',
    tokens: 'wrap wrapper sdk promotion execute governed refactor',
  },
  {
    label: 'Generic Wrapper Runtime Refactor',
    type: 'Workflow Run',
    context: 'AI Engine',
    status: 'Running',
    surfaces: ['workflows'],
    attention: ['needs-attention'],
    nodeId: 'project-ai-engine-workflow-runs-refactor-runtime',
    href: 'projection-detail.html?type=operator.workflow_run&workflowRunId=refactor-runtime',
    tokens: 'wrap wrapper workflow run refactor running',
  },
  {
    label: 'Bind operation records to SQL-backed wrapper evidence',
    type: 'Subtask',
    context: 'Replace hard-coded wrapper scripts',
    status: 'Blocked',
    surfaces: ['roadmap', 'evidence'],
    attention: ['needs-attention', 'blocked-only'],
    nodeId: 'project-ai-engine-roadmap-item-generic-wrapper-runtime-tasks-replace-hard-coded-scripts-bind-sql-evidence',
    href: 'projection-detail.html?type=operator.subtask_detail&projectId=ai-engine&itemKey=generic-wrapper-runtime&taskKey=replace-hard-coded-scripts&subtaskKey=bind-sql-evidence',
    tokens: 'wrap wrapper evidence sql subtask blocked bind operation records',
  },
  {
    label: 'DB Turn 3: propose contract',
    type: 'DB Turn',
    context: 'Agent Memory + DB Turns',
    status: 'Pending',
    surfaces: ['memory'],
    attention: ['needs-attention'],
    nodeId: 'project-ai-engine-turns-3',
    href: 'projection-detail.html?type=operator.agent_session&projectId=ai-engine&turn=3',
    tokens: 'turn db memory agent propose contract pending',
  },
];

document.addEventListener('workspace-chrome:mounted', () => {
  const toolbar = document.querySelector('.workspace-toolbar');
  const tree = document.getElementById('projection-tree');
  if (!toolbar || !tree) return;

  const state = {
    query: '',
    scope: 'ai-engine',
    mode: 'focus',
    surfaces: new Set(['roadmap', 'promotions', 'workflows', 'memory']),
    attention: 'needs-attention',
    activeSuggestion: 0,
  };

  const search = toolbar.querySelector('[data-workspace-search]');
  const suggestions = toolbar.querySelector('[data-search-suggestions]');
  const scope = toolbar.querySelector('[data-workspace-scope]');
  const mode = toolbar.querySelector('[data-workspace-mode]');

  search?.addEventListener('input', () => {
    state.query = search.value.trim().toLowerCase();
    state.activeSuggestion = 0;
    renderSuggestions({ suggestions, state });
    applyTreeFilters(tree, state);
  });

  search?.addEventListener('keydown', (event) => {
    const items = visibleSuggestions(state);
    if (!items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      state.activeSuggestion = Math.min(state.activeSuggestion + 1, items.length - 1);
      renderSuggestions({ suggestions, state });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      state.activeSuggestion = Math.max(state.activeSuggestion - 1, 0);
      renderSuggestions({ suggestions, state });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      openSuggestion(items[state.activeSuggestion]);
    } else if (event.key === 'Escape') {
      suggestions.hidden = true;
    }
  });

  scope?.addEventListener('change', () => {
    state.scope = scope.value;
    tree.dataset.scope = state.scope;
    tree.dispatchEvent(new CustomEvent('projection-workspace:scope-change', { bubbles: true, detail: { scope: state.scope } }));
    renderProjectionTree(tree);
    applyTreeFilters(tree, state);
  });

  mode?.addEventListener('change', () => {
    state.mode = mode.value;
    tree.dataset.mode = state.mode;
    applyModePreset(toolbar, state);
    applyModeHint(toolbar, state.mode);
    renderSuggestions({ suggestions, state });
    applyTreeFilters(tree, state);
  });

  toolbar.querySelectorAll('[data-surface]').forEach((button) => {
    button.addEventListener('click', () => {
      const surface = button.dataset.surface;
      if (state.surfaces.has(surface)) state.surfaces.delete(surface);
      else state.surfaces.add(surface);
      button.classList.toggle('active', state.surfaces.has(surface));
      button.setAttribute('aria-pressed', String(state.surfaces.has(surface)));
      renderSuggestions({ suggestions, state });
      applyTreeFilters(tree, state);
    });
  });

  toolbar.querySelectorAll('[data-attention]').forEach((button) => {
    button.addEventListener('click', () => {
      state.attention = button.dataset.attention;
      toolbar.querySelectorAll('[data-attention]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      renderSuggestions({ suggestions, state });
      applyTreeFilters(tree, state);
    });
  });

  toolbar.querySelector('[data-tree-action="expand-focus"]')?.addEventListener('click', () => expandFocusPath(tree));
  toolbar.querySelector('[data-tree-action="collapse-all"]')?.addEventListener('click', () => collapseProjectionTree(tree));
  toolbar.querySelector('[data-tree-action="refresh-branch"]')?.addEventListener('click', () => refreshSelectedBranch(tree));

  tree.addEventListener('projection-tree:changed', () => applyTreeFilters(tree, state));
  applyModeHint(toolbar, state.mode);
  applyTreeFilters(tree, state);
});

function renderSuggestions({ suggestions, state }) {
  if (!suggestions) return;
  const items = visibleSuggestions(state);
  suggestions.innerHTML = '';
  suggestions.hidden = !state.query || !items.length;
  items.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `workspace-toolbar__button search-suggestion${index === state.activeSuggestion ? ' is-active' : ''}`;
    button.innerHTML = `
      <strong>${escapeHtml(item.label)}</strong>
      <span>${escapeHtml(item.type)} · ${escapeHtml(item.context)} · ${escapeHtml(item.status)}</span>
    `;
    button.addEventListener('click', () => openSuggestion(item));
    suggestions.appendChild(button);
  });
}

function visibleSuggestions(state) {
  if (!state.query) return [];
  return SUGGESTIONS
    .filter((item) => item.tokens.toLowerCase().includes(state.query) || item.label.toLowerCase().includes(state.query))
    .filter((item) => item.surfaces.some((surface) => state.surfaces.has(surface)))
    .filter((item) => state.attention === 'needs-attention' || item.attention.includes(state.attention))
    .slice(0, 7);
}

async function openSuggestion(item) {
  await expandPathToNode(item.nodeId);
  window.location.href = item.href;
}

function applyTreeFilters(tree, state) {
  const query = state.query;
  const activeSurfaces = state.surfaces;
  tree.querySelectorAll('.tree-node').forEach((node) => {
    const row = node.querySelector(':scope > .tree-summary');
    if (!row) return;
    const text = row.dataset.searchText || row.textContent.toLowerCase();
    const surface = surfaceFor(row.dataset.type, text);
    const status = (row.dataset.status || '').toLowerCase();
    const isBranch = row.classList.contains('tree-branch');
    const matchesQuery = !query || isBranch || text.includes(query);
    const matchesSurface = !surface || activeSurfaces.has(surface);
    const matchesScope = isBranch || state.scope !== 'system-surfaces' || /system|workflow|promotion|cicd|agent|memory|turn|repository|pattern/.test(text);
    const matchesAttention = state.attention === 'needs-attention'
      || (state.attention === 'blocked-only' && /blocked|failed|waiting|pending/.test(status))
      || (state.attention === 'high-priority' && /high|critical|2 \/ 4|needed/.test(status + ' ' + text));
    node.hidden = !(matchesQuery && matchesSurface && matchesScope && matchesAttention);
  });
}

function surfaceFor(type = '', text = '') {
  const value = `${type} ${text}`.toLowerCase();
  if (/roadmap|task|focus/.test(value)) return 'roadmap';
  if (/promotion|sdk/.test(value)) return 'promotions';
  if (/workflow|run/.test(value)) return 'workflows';
  if (/ci\/cd|cicd/.test(value)) return 'cicd';
  if (/memory|turn|agent/.test(value)) return 'memory';
  if (/evidence|trust/.test(value)) return 'evidence';
  return '';
}

function applyModeHint(toolbar, mode) {
  const hint = toolbar.querySelector('[data-mode-hint]');
  if (!hint) return;
  hint.textContent = {
    focus: 'Current focus and active roadmap item',
    execution: 'Tasks, workflow runs, and active work',
    diagnostic: 'Blocked, failed, and waiting items',
    evidence: 'Evidence packets, gates, and trust material',
    evolution: 'Promotions, SDK changes, and release posture',
  }[mode] || '';
}

function applyModePreset(toolbar, state) {
  const presets = {
    focus: ['roadmap', 'memory'],
    execution: ['roadmap', 'workflows'],
    diagnostic: ['roadmap', 'workflows', 'cicd', 'evidence'],
    evidence: ['evidence', 'memory', 'workflows'],
    evolution: ['promotions', 'cicd'],
  };
  state.surfaces = new Set(presets[state.mode] || presets.focus);
  toolbar.querySelectorAll('[data-surface]').forEach((button) => {
    const active = state.surfaces.has(button.dataset.surface);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
