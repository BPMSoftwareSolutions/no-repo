import {
  collapseProjectionTree,
  expandFocusPath,
  expandPathToNode,
  refreshSelectedBranch,
  renderProjectionTree,
} from './projection-tree.js';
import { aiEngineFetch } from './api-client.js';
import { DEFAULT_PROJECT_ID, WORKSPACE_SCHEMA, normalizeStatus } from '../shared/projection-schema.js';

let projectSearchIndex = null;

async function ensureProjectSearchIndex() {
  if (projectSearchIndex) return;
  try {
    const res = await aiEngineFetch('/api/loga/tree/nodes/project-portfolio/children');
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    projectSearchIndex = (data.nodes || []).map((node) => ({
      label: node.label || node.id,
      type: 'Project',
      status: node.status || node.meta || '',
      nodeId: node.id,
      href: node.contentHref || '',
      surfaces: ['roadmap', 'promotions', 'workflows', 'memory'],
    }));
  } catch {
    projectSearchIndex = [];
  }
}

document.addEventListener('workspace-chrome:mounted', () => {
  const toolbar = document.querySelector('.workspace-toolbar');
  const tree = document.getElementById('projection-tree');
  if (!toolbar || !tree) return;

  ensureProjectSearchIndex();

  const state = {
    query: '',
    scope: DEFAULT_PROJECT_ID,
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
    renderSuggestions({ suggestions, state, tree });
    applyTreeFilters(tree, state);
  });

  search?.addEventListener('keydown', (event) => {
    const items = visibleSuggestions(state, tree);
    if (!items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      state.activeSuggestion = Math.min(state.activeSuggestion + 1, items.length - 1);
      renderSuggestions({ suggestions, state, tree });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      state.activeSuggestion = Math.max(state.activeSuggestion - 1, 0);
      renderSuggestions({ suggestions, state, tree });
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
    renderSuggestions({ suggestions, state, tree });
    applyTreeFilters(tree, state);
  });

  toolbar.querySelectorAll('[data-surface]').forEach((button) => {
    button.addEventListener('click', () => {
      const surface = button.dataset.surface;
      if (state.surfaces.has(surface)) state.surfaces.delete(surface);
      else state.surfaces.add(surface);
      button.classList.toggle('active', state.surfaces.has(surface));
      button.setAttribute('aria-pressed', String(state.surfaces.has(surface)));
      renderSuggestions({ suggestions, state, tree });
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
      renderSuggestions({ suggestions, state, tree });
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

function renderSuggestions({ suggestions, state, tree }) {
  if (!suggestions) return;
  const items = visibleSuggestions(state, tree);
  suggestions.innerHTML = '';
  suggestions.hidden = !state.query || !items.length;
  items.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `workspace-toolbar__button search-suggestion${index === state.activeSuggestion ? ' is-active' : ''}`;
    button.innerHTML = `
      <strong>${escapeHtml(item.label)}</strong>
      <span>${escapeHtml(item.type)}${item.status ? ' · ' + escapeHtml(item.status) : ''}</span>
    `;
    button.addEventListener('click', () => openSuggestion(item));
    suggestions.appendChild(button);
  });
}

function visibleSuggestions(state, tree) {
  if (!state.query) return [];
  const query = state.query.toLowerCase();

  // Merge project index (all active projects) with loaded tree nodes (roadmap items, tasks, etc.)
  const seen = new Set();
  const candidates = [...(projectSearchIndex || []), ...buildTreeSuggestions(tree)];

  return candidates
    .filter((item) => {
      if (seen.has(item.nodeId)) return false;
      seen.add(item.nodeId);
      return item.label.toLowerCase().includes(query);
    })
    .filter((item) => !item.surfaces.length || item.surfaces.some((s) => state.surfaces.has(s)))
    .slice(0, 7);
}

function buildTreeSuggestions(tree) {
  const results = [];
  tree.querySelectorAll('.projection-tree__node').forEach((node) => {
    const row = node.querySelector(':scope > .projection-tree__summary');
    if (!row || !row.dataset.label) return;
    const payload = (() => { try { return JSON.parse(node.dataset.nodePayload || '{}'); } catch { return {}; } })();
    if (!payload.contentHref) return;
    results.push({
      label: row.dataset.label,
      type: formatNodeType(row.dataset.type),
      status: row.dataset.status || '',
      nodeId: node.dataset.nodeId || '',
      href: payload.contentHref,
      surfaces: surfacesForType(row.dataset.type),
    });
  });
  return results;
}

function formatNodeType(type) {
  return WORKSPACE_SCHEMA.nodeTypeLabels[type] || type || 'Item';
}

function surfacesForType(type) {
  return WORKSPACE_SCHEMA.surfaceByType[type] || [];
}

async function openSuggestion(item) {
  await expandPathToNode(item.nodeId);
  window.location.href = item.href;
}

function applyTreeFilters(tree, state) {
  const query = state.query;
  const activeSurfaces = state.surfaces;
  tree.querySelectorAll('.projection-tree__node').forEach((node) => {
    const row = node.querySelector(':scope > .projection-tree__summary');
    if (!row) return;
    const text = row.dataset.searchText || row.textContent.toLowerCase();
    const surface = surfaceFor(row.dataset.type, text);
    const status = (row.dataset.status || '').toLowerCase();
    const statusLabel = normalizeStatus(row.dataset.status || row.dataset.state || '').replace(/_/g, ' ');
    const isBranch = row.classList.contains('projection-tree__branch');
    const matchesQuery = !query || isBranch || text.includes(query);
    const matchesSurface = !surface || activeSurfaces.has(surface);
    const matchesScope = isBranch || state.scope !== 'system-surfaces' || /system|workflow|promotion|cicd|agent|memory|turn|repository|pattern/.test(text);
    const matchesAttention = state.attention === 'needs-attention'
      || (state.attention === 'blocked-only' && /blocked|failed|waiting|pending/.test(`${status} ${statusLabel}`))
      || (state.attention === 'high-priority' && /high|critical|needed/.test(`${status} ${statusLabel} ${text}`));
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
  hint.textContent = WORKSPACE_SCHEMA.modeHints[mode] || '';
}

function applyModePreset(toolbar, state) {
  state.surfaces = new Set(WORKSPACE_SCHEMA.modePresets[state.mode] || WORKSPACE_SCHEMA.modePresets.focus);
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
