/**
 * Chrome renderer — translates an `operator.workspace_chrome` contract
 * into the workspace toolbar HTML that global-inspection.css and
 * projection-workspace.js expect.
 *
 * The chrome contract is the single source of truth for every toolbar
 * control. projection-detail.js loads it, applies per-projection
 * frontmatter overrides (workspace_mode, agent_status, agent_href,
 * workspace_scope), then mounts the rendered HTML into #workspace-chrome.
 */

import { parseMarkdown, collectBlock, collectChildBlocks, parseAttrs, parseKeyValues, parseRecords } from '../renderer/parser.js';
import { escapeHtml } from '../renderer/html.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse and render a workspace chrome contract.
 *
 * @param {string} markdown      Raw markdown of the operator.workspace_chrome fixture.
 * @param {object} overrides     Per-projection frontmatter values to merge into
 *                               the chrome (workspace_mode, workspace_scope,
 *                               agent_status, agent_href, active_surfaces).
 * @returns {string}             HTML ready to inject into #workspace-chrome.
 */
export function renderWorkspaceChrome(markdown, overrides = {}) {
  const { frontmatter, body } = parseMarkdown(markdown);
  const merged = { ...frontmatter, ...cleanOverrides(overrides) };
  const blocks = parseTopLevelBlocks(body);

  const toolbar = blocks.find((b) => b.name === 'toolbar');
  const surfaceChips = blocks.find((b) => b.name === 'surface_chips');
  const attentionControls = blocks.find((b) => b.name === 'attention_controls');
  const treeControls = blocks.find((b) => b.name === 'tree_controls');

  const primaryRow = toolbar ? renderPrimaryRow(toolbar, merged) : '';
  const secondaryRow = renderSecondaryRow(
    surfaceChips,
    attentionControls,
    treeControls,
    merged,
  );

  return `
    <section class="workspace-toolbar" aria-label="Projection workspace controls">
      ${primaryRow}
      ${secondaryRow}
    </section>
  `.trim();
}

// ---------------------------------------------------------------------------
// Primary row (brand · search · scope · mode · agent pill)
// ---------------------------------------------------------------------------

function renderPrimaryRow(toolbarBlock, merged) {
  const zones = collectChildBlocks(toolbarBlock.lines).filter((b) => b.name === 'toolbar_zone');
  const parts = zones.map((zone) => renderZone(zone, merged));
  return `<div class="toolbar-row">${parts.join('')}</div>`;
}

function renderZone(zone, merged) {
  const name = zone.attrs.name || '';
  const zoneValues = parseKeyValues(zone.lines);
  const children = collectChildBlocks(zone.lines);

  switch (name) {
    case 'brand':
      return renderBrandZone(zoneValues, merged);
    case 'search':
      return renderSearchZone(children);
    case 'scope':
      return renderSelectZone(children, merged, 'scope');
    case 'mode':
      return renderModeZone(children, merged);
    case 'agent':
      return renderAgentZone(children, merged);
    default:
      return '';
  }
}

function renderBrandZone(zoneValues, merged) {
  const eyebrow = escapeHtml(merged.workspace || zoneValues.eyebrow || 'Inspection Workspace');
  const context = escapeHtml(merged.context || zoneValues.context || 'Projection Graph');
  return `
    <div class="toolbar-brand">
      <span>${eyebrow}</span>
      <strong>${context}</strong>
    </div>
  `;
}

function renderSearchZone(children) {
  const searchBlock = children.find((c) => c.name === 'search');
  const placeholder = searchBlock
    ? (parseKeyValues(searchBlock.lines).placeholder || 'Search...')
    : 'Search...';
  return `
    <label class="toolbar-field">
      <span>Search</span>
      <input data-workspace-search type="search" placeholder="${escapeHtml(placeholder)}" autocomplete="off">
      <div data-search-suggestions class="search-suggestions" hidden></div>
    </label>
  `;
}

function renderSelectZone(children, merged, zoneName) {
  const selectBlock = children.find((c) => c.name === 'select');
  if (!selectBlock) return '';
  const kv = parseKeyValues(selectBlock.lines);
  const label = escapeHtml(kv.label || zoneName);
  const bind = kv.bind || `workspace-${zoneName}`;
  const options = parseSelectOptions(selectBlock.lines);
  const currentValue = zoneName === 'scope'
    ? (merged.workspace_scope || kv.value || options[0] || '')
    : (merged.workspace_mode || kv.value || options[0] || '');
  const optionHtml = options
    .map((opt) => `<option value="${escapeHtml(opt)}"${opt === currentValue ? ' selected' : ''}>${escapeHtml(opt)}</option>`)
    .join('');
  return `
    <label class="toolbar-field">
      <span>${label}</span>
      <select data-${escapeHtml(bind)}>${optionHtml}</select>
    </label>
  `;
}

function renderModeZone(children, merged) {
  const selectBlock = children.find((c) => c.name === 'select');
  if (!selectBlock) return '';
  const kv = parseKeyValues(selectBlock.lines);
  const options = parseSelectOptions(selectBlock.lines);
  const currentMode = merged.workspace_mode || kv.value || options[0] || 'focus';
  const optionHtml = options
    .map((opt) => `<option value="${escapeHtml(opt)}"${opt === currentMode ? ' selected' : ''}>${escapeHtml(opt)}</option>`)
    .join('');
  const modeHints = {
    focus: 'Current focus and active roadmap item',
    execution: 'Tasks, workflow runs, and active work',
    diagnostic: 'Blocked, failed, and waiting items',
    evidence: 'Evidence packets, gates, and trust material',
    evolution: 'Promotions, SDK changes, and release posture',
  };
  return `
    <label class="toolbar-field">
      <span>Mode</span>
      <select data-workspace-mode>${optionHtml}</select>
      <small data-mode-hint>${escapeHtml(modeHints[currentMode] || '')}</small>
    </label>
  `;
}

function renderAgentZone(children, merged) {
  const pillBlock = children.find((c) => c.name === 'agent_pill');
  if (!pillBlock) return '';
  const kv = parseKeyValues(pillBlock.lines);
  const label = escapeHtml(merged.agent_status || kv.label || 'Agent active');
  const href = escapeHtml(merged.agent_href || kv.href || '#');
  return `
    <a class="runtime-pill" href="${href}">
      <span class="pulse"></span>
      <span>${label}</span>
    </a>
  `;
}

// ---------------------------------------------------------------------------
// Secondary row (surface chips · attention · tree controls)
// ---------------------------------------------------------------------------

function renderSecondaryRow(surfaceChips, attentionControls, treeControls, merged) {
  const activeSurfaceSet = parseActiveSurfaces(merged.active_surfaces);
  return `
    <div class="toolbar-row secondary">
      ${surfaceChips ? renderSurfaceChips(surfaceChips, activeSurfaceSet) : ''}
      <div class="toolbar-actions">
        ${attentionControls ? renderAttentionControls(attentionControls) : ''}
        ${treeControls ? renderTreeControls(treeControls) : ''}
      </div>
    </div>
  `;
}

function renderSurfaceChips(block, activeSurfaceSet) {
  const chips = parseRecords(block.lines);
  const chipHtml = chips.map((chip) => {
    const value = chip.value || chip.label?.toLowerCase() || '';
    const isActive = activeSurfaceSet
      ? activeSurfaceSet.has(value)
      : (chip.active === 'true');
    const activeClass = isActive ? ' active' : '';
    const pressed = String(isActive);
    return `<button type="button" data-surface="${escapeHtml(value)}" class="chip${activeClass}" aria-pressed="${pressed}">${escapeHtml(chip.label || value)}</button>`;
  }).join('');
  return `<nav class="surface-chips" aria-label="Surface filters">${chipHtml}</nav>`;
}

function renderAttentionControls(block) {
  const controls = parseRecords(block.lines);
  const html = controls.map((ctrl, index) => {
    const value = ctrl.value || ctrl.label?.toLowerCase().replace(/\s+/g, '-') || '';
    const isActive = index === 0;
    return `<button type="button" data-attention="${escapeHtml(value)}"${isActive ? ' class="active"' : ''} aria-pressed="${String(isActive)}">${escapeHtml(ctrl.label || value)}</button>`;
  }).join('');
  return `<div class="attention-controls">${html}</div>`;
}

function renderTreeControls(block) {
  const controls = parseRecords(block.lines);
  const html = controls.map((ctrl) => {
    const action = ctrl.action || ctrl.value || '';
    return `<button type="button" data-tree-action="${escapeHtml(action)}">${escapeHtml(ctrl.label || action)}</button>`;
  }).join('');
  return `<div class="tree-controls">${html}</div>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTopLevelBlocks(body) {
  const lines = body.split(/\r?\n/);
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const directive = lines[i].trim().match(/^:{2,3}([a-zA-Z0-9_]+)(?:\s+(.*))?$/);
    if (!directive) continue;
    const collected = collectBlock(lines, i);
    blocks.push({
      name: directive[1],
      attrs: parseAttrs(directive[2]),
      lines: collected.lines,
    });
    i = collected.endIndex;
  }
  return blocks;
}

function parseSelectOptions(lines) {
  const options = [];
  let inOptions = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^options:\s*$/.test(line)) { inOptions = true; continue; }
    if (inOptions && line.startsWith('- ')) { options.push(line.slice(2).replace(/^"|"$/g, '')); continue; }
    if (inOptions && line && !line.startsWith('- ')) inOptions = false;
  }
  return options;
}

function parseActiveSurfaces(raw) {
  if (!raw) return null;
  return new Set(String(raw).split(',').map((s) => s.trim()).filter(Boolean));
}

function cleanOverrides(raw) {
  const allowed = ['workspace_scope', 'workspace_mode', 'agent_status', 'agent_href', 'active_surfaces', 'workspace', 'context'];
  return Object.fromEntries(
    Object.entries(raw).filter(([k]) => allowed.includes(k))
  );
}
