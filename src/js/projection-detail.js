import { callAiEngine, renderMarkdownProjection } from './api-client.js';
import { renderProjectionTree } from './projection-tree.js';
import { parseMarkdown } from '../renderer/parser.js';
import { mountWorkspaceChrome } from './workspace-chrome.js';
import { MARKDOWN_UI_REGISTRY } from '../renderer/element-registry.js';
import {
  DEFAULT_TASK_KEY,
  DEFAULT_SUBTASK_KEY,
  getItemCompletionPct,
  getItemKey,
  getItemStatus,
  getProjectId,
  getTaskKey,
  normalizeStatus,
} from '../shared/projection-schema.js';

let pollingInterval = null;
let gaugeRefreshInFlight = false;

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
  setupSidePanelControls();

  mountWorkspaceChrome({});
  renderPersistentTree(tree);

  const renderProjectionContent = async () => {
    try {
      if (params.target) {
        throw new Error(`No local projection route is registered for target: ${params.target}`);
      }

      const proj = await loadProjection(projType, params);
      const { frontmatter } = parseMarkdown(proj.text || '');
      const dataContext = await hydrateDataSources(proj.text || '', params);

      renderPageHeader(frontmatter);
      mountWorkspaceChrome(frontmatter);
      applyShellRules(frontmatter);

      container.innerHTML = renderMarkdownProjection(proj.text, dataContext);
      await injectCompletionGauge({ projType, params, container });
      document.getElementById('evidence-content').textContent = JSON.stringify(proj.provenance || proj, null, 2);
      
      // Show live update badge for live status projections
      if (projType === 'operator.project_status' || projType === 'operator.roadmap_items' || projType === 'operator.project_detail') {
        showLiveUpdateBadge();
      }
    } catch (error) {
      container.innerHTML = `<p class="loga-error">Error loading projection: ${error.message}</p>`;
    }
  };

  // Initial load
  await renderProjectionContent();

  // Set up polling for live status projections (5 second interval)
  if (projType === 'operator.project_status' || projType === 'operator.roadmap_items') {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
      await renderProjectionContent();
      updateLiveUpdateBadge();
    }, 5000);

    window.addEventListener('beforeunload', () => {
      if (pollingInterval) clearInterval(pollingInterval);
    });
  }

  // For project detail, only refresh the gauge — avoids full DOM replacement distortion
  if (projType === 'operator.project_detail') {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
      if (gaugeRefreshInFlight) return;
      gaugeRefreshInFlight = true;
      try {
        await injectCompletionGauge({ projType, params, container });
        updateLiveUpdateBadge();
      } finally {
        gaugeRefreshInFlight = false;
      }
    }, 5000);

    window.addEventListener('beforeunload', () => {
      if (pollingInterval) clearInterval(pollingInterval);
    });
  }
});

// --- Live update indicator ---

function showLiveUpdateBadge() {
  let badge = document.getElementById('live-update-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'live-update-badge';
    badge.className = 'live-update-badge';
    badge.innerHTML = '<span class="live-dot"></span> Live monitoring active';
    const header = document.querySelector('body > header');
    if (header) header.appendChild(badge);
  }
}

function updateLiveUpdateBadge() {
  const badge = document.getElementById('live-update-badge');
  if (badge) {
    badge.classList.add('live-pulse');
    setTimeout(() => badge.classList.remove('live-pulse'), 300);
  }
}

function setupSidePanelControls() {
  const shell = document.querySelector('.projection-shell');
  const toggle = document.getElementById('tree-panel-toggle');
  const resizer = document.getElementById('tree-panel-resizer');
  if (!shell || !toggle || !resizer) return;

  const WIDTH_KEY = 'projectionTreePanelWidth';
  const COLLAPSED_KEY = 'projectionTreePanelCollapsed';
  const MIN_WIDTH = 240;
  const MAX_WIDTH = 680;
  const mobile = () => window.matchMedia('(max-width: 760px)').matches;

  const clampWidth = (value) => Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, value));
  const applyWidth = (value) => {
    if (mobile() || shell.classList.contains('projection-shell--tree-collapsed')) return;
    const safe = clampWidth(Number(value) || 300);
    shell.style.gridTemplateColumns = `${safe}px 10px minmax(0, 1fr)`;
    localStorage.setItem(WIDTH_KEY, String(safe));
  };

  const syncCollapsedState = (collapsed) => {
    shell.classList.toggle('projection-shell--tree-collapsed', collapsed);
    toggle.textContent = collapsed ? 'Show panel' : 'Hide panel';
    toggle.setAttribute('aria-expanded', String(!collapsed));
    localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    if (!collapsed && !mobile()) {
      applyWidth(localStorage.getItem(WIDTH_KEY) || '320');
    }
    if (collapsed || mobile()) shell.style.gridTemplateColumns = '';
  };

  toggle.addEventListener('click', () => {
    const collapsed = !shell.classList.contains('projection-shell--tree-collapsed');
    syncCollapsedState(collapsed);
  });

  resizer.addEventListener('dblclick', () => applyWidth(320));
  resizer.addEventListener('pointerdown', (event) => {
    if (mobile() || shell.classList.contains('projection-shell--tree-collapsed')) return;
    event.preventDefault();
    const shellRect = shell.getBoundingClientRect();
    const firstTrack = shellRect.width * 0.28;
    const startWidth = clampWidth(parseInt(localStorage.getItem(WIDTH_KEY) || `${Math.round(firstTrack)}`, 10));
    const startX = event.clientX;
    resizer.setPointerCapture(event.pointerId);

    const onMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      applyWidth(startWidth + delta);
    };

    const onUp = (upEvent) => {
      resizer.releasePointerCapture(upEvent.pointerId);
      resizer.removeEventListener('pointermove', onMove);
      resizer.removeEventListener('pointerup', onUp);
      resizer.removeEventListener('pointercancel', onUp);
    };

    resizer.addEventListener('pointermove', onMove);
    resizer.addEventListener('pointerup', onUp);
    resizer.addEventListener('pointercancel', onUp);
  });

  const persistedCollapsed = localStorage.getItem(COLLAPSED_KEY) === 'true';
  syncCollapsedState(persistedCollapsed);
  if (!persistedCollapsed && !mobile()) {
    applyWidth(localStorage.getItem(WIDTH_KEY) || '320');
  }

  window.addEventListener('resize', () => {
    if (mobile()) {
      shell.style.gridTemplateColumns = '';
    } else if (!shell.classList.contains('projection-shell--tree-collapsed')) {
      applyWidth(localStorage.getItem(WIDTH_KEY) || '320');
    }
  });
}

function normalizeItemProgress(item) {
  const totalTasks = Number(item?.total_task_count || 0);
  const openTasks = Number(item?.open_task_count || 0);
  if (Number.isFinite(totalTasks) && totalTasks > 0) {
    const doneTasks = Math.max(0, totalTasks - (Number.isFinite(openTasks) ? openTasks : 0));
    const pct = Math.round((doneTasks / totalTasks) * 100);
    return {
      pct,
      completed: doneTasks,
      total: totalTasks,
      inProgress: getItemStatus(item) === 'in_progress' ? 1 : 0,
      blocked: getItemStatus(item) === 'blocked' ? 1 : 0,
      awaiting: getItemStatus(item) === 'awaiting_review' ? 1 : 0,
    };
  }

  const status = getItemStatus(item);
  const pct = getItemCompletionPct(item);
  if (pct > 0 || status) {
    return {
      pct,
      completed: pct >= 100 ? 1 : 0,
      total: pct >= 100 ? 1 : 0,
      inProgress: status === 'in_progress' ? 1 : 0,
      blocked: status === 'blocked' ? 1 : 0,
      awaiting: status === 'awaiting_review' ? 1 : 0,
    };
  }
  return { pct: 0, completed: 0, total: 0, inProgress: 0, blocked: 0, awaiting: 0 };
}

function renderGaugeMarkup({ pct, completed, total, inProgress, blocked, awaiting }) {
  const safePct = Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 0));
  const tier = safePct >= 80 ? 'high' : safePct >= 30 ? 'mid' : 'low';
  const tierColor = { high: '#22c55e', mid: '#f59e0b', low: '#ef4444' }[tier];
  const R = 75;
  const gx = 100;
  const gy = 110;
  const toRad = (d) => (d * Math.PI) / 180;
  const pt = (deg) => [gx + R * Math.cos(toRad(deg)), gy + R * Math.sin(toRad(deg))];
  const [sx, sy] = pt(135);
  const [ex, ey] = pt(45);
  const bgPath = `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${R} ${R} 0 1 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  const fillDeg = 270 * safePct / 100;
  let fillPath = '';
  if (fillDeg > 0.5) {
    const [fx, fy] = pt(135 + Math.min(fillDeg, 269.99));
    const la = fillDeg > 180 ? 1 : 0;
    fillPath = `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${R} ${R} 0 ${la} 1 ${fx.toFixed(2)} ${fy.toFixed(2)}`;
  }

  const stats = [
    { label: 'done', val: completed, mod: '' },
    { label: 'total tasks', val: total, mod: '' },
    inProgress ? { label: 'in progress', val: inProgress, mod: 'progress' } : null,
    blocked ? { label: 'blocked', val: blocked, mod: 'blocked' } : null,
    awaiting ? { label: 'review', val: awaiting, mod: 'review' } : null,
  ].filter(Boolean);

  return `<div class="portfolio-gauge" data-tier="${escapeHtml(tier)}"><svg class="portfolio-gauge__svg" viewBox="0 0 200 200" aria-label="${escapeHtml(safePct.toFixed(1))} percent complete"><path class="portfolio-gauge__track" d="${bgPath}" fill="none" stroke-width="14" stroke-linecap="round"/>${fillPath ? `<path class="portfolio-gauge__fill" d="${fillPath}" fill="none" stroke="${escapeHtml(tierColor)}" stroke-width="14" stroke-linecap="round"/>` : ''}<text class="portfolio-gauge__pct-text" x="${gx}" y="102" text-anchor="middle">${escapeHtml(safePct.toFixed(1))}%</text><text class="portfolio-gauge__sub-text" x="${gx}" y="122" text-anchor="middle">complete</text></svg><div class="portfolio-gauge__stats">${stats.map((s) => `<span class="portfolio-gauge__stat${s.mod ? ` portfolio-gauge__stat--${s.mod}` : ''}"><strong>${escapeHtml(String(s.val))}</strong><em>${escapeHtml(s.label)}</em></span>`).join('')}</div></div>`;
}

async function injectCompletionGauge({ projType, params, container }) {
  if (!container || !params?.projectId) return;
  if (projType !== 'operator.roadmap_item' && projType !== 'operator.project_detail' && projType !== 'operator.project_roadmap') return;

  let report = null;
  try {
    report = await callAiEngine('getProjectImplementationRoadmapReport', params.projectId);
  } catch {
    // fall through and use DOM-based fallback where possible
  }

  const allItems = Array.isArray(report?.roadmap_summary?.phases) ? report.roadmap_summary.phases : [];

  if (projType === 'operator.roadmap_item') {
    container.querySelectorAll('.injected-completion-gauge').forEach((el) => el.remove());
    container.querySelectorAll('.injected-completion-gauge-grid').forEach((el) => el.remove());

    const item = allItems.find((entry) => entry?.item_key === params.itemKey || entry?.stable_item_key === params.itemKey);
    if (!item) return;
    const progress = normalizeItemProgress(item);
    const h2 = container.querySelector('h2');
    if (!h2) return;
    h2.insertAdjacentHTML('afterend', `<section class="injected-completion-gauge"><p class="injected-completion-gauge__title">Item Completion</p>${renderGaugeMarkup(progress)}</section>`);
    return;
  }

  if (projType === 'operator.project_detail' || projType === 'operator.project_roadmap') {
    const activeItem = report?.active_item?.active_item;
    const host = projType === 'operator.project_detail'
      ? container.querySelector('.loga-focus')
      : (container.querySelector('h2') || container.querySelector('h1'));
    if (!host) return;

    const gaugeBlocks = [];

    if (activeItem) {
      const activeProgress = normalizeItemProgress(activeItem);
      gaugeBlocks.push(`<section class="injected-completion-gauge"><p class="injected-completion-gauge__title">Active Item Completion</p>${renderGaugeMarkup(activeProgress)}</section>`);
    }

    const summary = report?.roadmap_summary?.summary || {};
    const totalItems = Number(summary?.total_items || 0);
    const doneItems = Number(summary?.done_count || 0);
    const inProgressItems = Number(summary?.in_progress_count || 0);
    const blockedItems = Number(summary?.blocked_count || 0);
    const awaitingItems = Number(summary?.awaiting_review_count || 0);
    const overallPct = Number(summary?.completion_percentage || (totalItems > 0 ? (doneItems / totalItems) * 100 : 0));

    const overallProgress = {
      pct: overallPct,
      completed: doneItems,
      total: totalItems,
      inProgress: inProgressItems,
      blocked: blockedItems,
      awaiting: awaitingItems,
    };

    gaugeBlocks.push(`<section class="injected-completion-gauge"><p class="injected-completion-gauge__title">Overall Roadmap Completion</p>${renderGaugeMarkup(overallProgress)}</section>`);

    // For roadmap page, keep gauges visible during live polling even if report endpoint is transiently unavailable.
    if (projType === 'operator.project_roadmap' && !report) {
      const tables = [...container.querySelectorAll('table')];
      const itemsTable = tables.find((table) => {
        const headers = [...table.querySelectorAll('thead th')].map((th) => (th.textContent || '').trim().toLowerCase());
        return headers.includes('item key') && headers.includes('status');
      });

      if (itemsTable) {
        const rows = [...itemsTable.querySelectorAll('tbody tr')];
        const statuses = rows.map((row) => {
          const cells = row.querySelectorAll('td');
          return (cells[2]?.textContent || '').trim().toLowerCase().replace(/\s+/g, '_');
        });

        const total = statuses.length;
        const done = statuses.filter((s) => s === 'done' || s === 'completed').length;
        const inProgress = statuses.filter((s) => s === 'in_progress').length;
        const blocked = statuses.filter((s) => s === 'blocked').length;
        const awaiting = statuses.filter((s) => s === 'awaiting_review').length;
        const pct = total > 0 ? (done / total) * 100 : 0;

        const activeStatus = statuses.find((s) => s === 'in_progress')
          || statuses.find((s) => s === 'awaiting_review')
          || statuses.find((s) => s === 'blocked')
          || statuses[0]
          || 'not_started';

        gaugeBlocks.length = 0;
        gaugeBlocks.push(`<section class="injected-completion-gauge"><p class="injected-completion-gauge__title">Active Item Completion</p>${renderGaugeMarkup(normalizeItemProgress({ item_status: activeStatus }))}</section>`);
        gaugeBlocks.push(`<section class="injected-completion-gauge"><p class="injected-completion-gauge__title">Overall Roadmap Completion</p>${renderGaugeMarkup({ pct, completed: done, total, inProgress, blocked, awaiting })}</section>`);
      }
    }

    if (!gaugeBlocks.length) return;

    const gridMarkup = `<div class="injected-completion-gauge-grid">${gaugeBlocks.join('')}</div>`;
    if (projType === 'operator.project_detail') {
      const nextSignature = JSON.stringify({
        activeItemKey: activeItem?.item_key || activeItem?.stable_item_key || '',
        activeItemStatus: activeItem?.item_status || '',
        activeItemOpenTaskCount: activeItem?.open_task_count ?? null,
        activeItemTotalTaskCount: activeItem?.total_task_count ?? null,
        summary,
      });

      const existingGrid = host.querySelector('.injected-completion-gauge-grid');
      if (existingGrid?.dataset.signature === nextSignature) return;

      if (existingGrid) {
        existingGrid.outerHTML = gridMarkup;
      } else {
        host.insertAdjacentHTML('beforeend', gridMarkup);
      }

      const currentGrid = host.querySelector('.injected-completion-gauge-grid');
      if (currentGrid) currentGrid.dataset.signature = nextSignature;
    } else {
      container.querySelectorAll('.injected-completion-gauge').forEach((el) => el.remove());
      container.querySelectorAll('.injected-completion-gauge-grid').forEach((el) => el.remove());
      host.insertAdjacentHTML('afterend', gridMarkup);
    }
  }
}

function aggregateRoadmapPhases(items) {
  const phaseMap = new Map();

  items.forEach((item, index) => {
    const key = item?.phase_key || item?.phase_title || `phase-${index}`;
    if (!phaseMap.has(key)) {
      phaseMap.set(key, {
        key,
        title: item?.phase_title || 'Phase',
        total: 0,
        done: 0,
        inProgress: 0,
        awaitingReview: 0,
        blocked: 0,
        notStarted: 0,
        order: index,
      });
    }

    const phase = phaseMap.get(key);
    const status = String(item?.item_status || 'not_started').toLowerCase();
    phase.total += 1;

    if (status === 'done' || status === 'completed') {
      phase.done += 1;
    } else if (status === 'in_progress') {
      phase.inProgress += 1;
    } else if (status === 'awaiting_review') {
      phase.awaitingReview += 1;
    } else if (status === 'blocked') {
      phase.blocked += 1;
    } else {
      phase.notStarted += 1;
    }
  });

  return [...phaseMap.values()].sort((left, right) => left.order - right.order);
}

function summarizePhaseStatus(phase) {
  if (!phase || !phase.total) return 'pending';
  if (phase.blocked > 0) return 'blocked';
  if (phase.inProgress > 0) return 'in progress';
  if (phase.awaitingReview > 0) return 'awaiting review';
  if (phase.done === phase.total) return 'done';
  return 'pending';
}

function renderPhaseSummaryMarkdown(phases) {
  return phases.map((phase) => `### ${phase.title}

::panel type="phase_summary" status="${summarizePhaseStatus(phase)}"
::

::metric_row
Total Items: ${phase.total}
Done: ${phase.done}
In Progress: ${phase.inProgress}
Awaiting Review: ${phase.awaitingReview}
Not Started: ${phase.notStarted}
::`).join('\n\n');
}

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
  const eachPattern = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  const withEach = template.replace(eachPattern, (_, collectionExpr, body) => {
    const collection = resolveTokenValue(tokens, collectionExpr);
    if (!Array.isArray(collection) || !collection.length) return '';
    return collection.map((item) => {
      const itemTokens = (item && typeof item === 'object') ? item : { value: item };
      return applyTemplate(body, { ...tokens, ...itemTokens });
    }).join('');
  });

  return withEach.replace(/\{\{([^}]+)\}\}/g, (_, expression) => {
    const value = resolveTokenValue(tokens, expression);
    return value != null ? String(value) : '';
  });
}

function resolveTokenValue(tokens, expression) {
  const candidates = String(expression || '')
    .split('||')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!candidates.length) return undefined;

  for (const candidate of candidates) {
    const value = resolvePathValue(tokens, candidate);
    if (value !== undefined && value !== null && value !== '') return value;
  }

  return resolvePathValue(tokens, candidates[candidates.length - 1]);
}

function resolvePathValue(source, path) {
  const segments = String(path || '')
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);

  let current = source;
  for (const segment of segments) {
    current = current?.[segment];
  }
  return current;
}

function applyDataMap(apiData, dataMap) {
  const mapped = {};
  for (const [target, mapDef] of Object.entries(dataMap || {})) {
    if (typeof mapDef === 'string') {
      mapped[target] = resolvePathValue(apiData, mapDef);
      continue;
    }

    if (!mapDef || typeof mapDef !== 'object') {
      mapped[target] = mapDef;
      continue;
    }

    if (typeof mapDef.source === 'string') {
      const sourceValue = resolvePathValue(apiData, mapDef.source);
      if (Array.isArray(sourceValue)) {
        mapped[target] = mapDef.filter
          ? sourceValue.filter((item) => matchFilter(item, mapDef.filter))
          : sourceValue;
      } else {
        mapped[target] = sourceValue;
      }
      continue;
    }

    if (typeof mapDef.path === 'string') {
      mapped[target] = resolvePathValue(apiData, mapDef.path);
      continue;
    }

    mapped[target] = mapDef;
  }
  return mapped;
}

function matchFilter(item, filterDef) {
  return Object.entries(filterDef || {}).every(([field, expected]) => {
    const actual = resolvePathValue(item, field);

    if (Array.isArray(expected)) {
      const normalizedActual = typeof actual === 'string' ? actual.toLowerCase() : actual;
      return expected.some((entry) => {
        const normalizedEntry = typeof entry === 'string' ? entry.toLowerCase() : entry;
        return normalizedEntry === normalizedActual;
      });
    }

    if (expected && typeof expected === 'object') {
      if (Object.prototype.hasOwnProperty.call(expected, 'gt')) {
        return Number(actual) > Number(expected.gt);
      }
      return false;
    }

    if (typeof expected === 'string') {
      return String(actual || '').toLowerCase() === expected.toLowerCase();
    }

    return actual === expected;
  });
}

function evaluateDerived(item, deriveSpec) {
  const derived = {};
  for (const [field, spec] of Object.entries(deriveSpec || {})) {
    if (!spec || typeof spec !== 'object') continue;

    let value = '';
    if (Array.isArray(spec.rules)) {
      value = evaluateRules(item, spec.rules);
    } else if (typeof spec.template === 'string') {
      value = renderDerivedTemplate(spec.template, item);
    }

    if ((value === '' || value == null) && Object.prototype.hasOwnProperty.call(spec, 'fallback')) {
      value = spec.fallback;
    }

    derived[field] = value;
  }
  return derived;
}

function evaluateRules(item, rules) {
  for (const rule of rules) {
    if (!rule || typeof rule !== 'object') continue;
    if (Object.prototype.hasOwnProperty.call(rule, 'default')) return rule.default;

    if (matchFilter(item, rule.if || {})) {
      return rule.value ?? '';
    }
  }
  return '';
}

function renderDerivedTemplate(template, item) {
  return String(template || '').replace(/\{([^}|]+)(\|[^}]+)?\}/g, (_, rawField, rawPipe = '') => {
    const value = resolvePathValue(item, rawField.trim());
    let result = value != null ? String(value) : '';

    const pipe = rawPipe.trim().replace(/^\|/, '');
    if (pipe === 'encode') result = encodeURIComponent(result);

    return result;
  });
}

async function applyContractTransform(transformName, params, apiData, projectionType) {
  const contractTransforms = MARKDOWN_UI_REGISTRY.transforms || {};
  const spec = contractTransforms[transformName];
  if (!spec) throw new Error(`Unknown contract transform: ${transformName}`);

  const mappedTokens = applyDataMap(apiData || {}, spec.dataMap || {});
  const tokens = { ...mappedTokens };

  if (spec.derive) {
    for (const [key, value] of Object.entries(tokens)) {
      if (!Array.isArray(value)) continue;
      tokens[key] = value.map((item) => {
        if (!item || typeof item !== 'object') return item;
        return { ...item, ...evaluateDerived(item, spec.derive) };
      });
    }
  }

  const template = await loadTemplate(spec.template);
  const text = applyTemplate(template, tokens);

  return {
    text,
    contentType: 'text/markdown; charset=utf-8',
    projectionType: projectionType || transformName,
    sourceTruth: 'sql',
    provenance: {
      sourceTruth: 'sql',
      projectionType: projectionType || transformName,
      transform: transformName,
    },
  };
}

// --- Transforms (registry-named, async, load templates from files) ---

const TRANSFORMS = {
  async buildProjectPortfolioProjection(params, apiData) {
    return applyContractTransform('buildProjectPortfolioProjection', params, apiData, 'operator.project_portfolio');
  },

  async buildProjectDetailProjection(params, apiData) {
    const summary = apiData || {};
    const projectId = getProjectId(params.projectId);
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

  async buildProjectStatusProjection(params) {
    const projectId = getProjectId(params.projectId);
    
    // Fetch roadmap with full task lists
    let roadmap = {};
    try {
      roadmap = await callAiEngine('getProjectRoadmap', projectId);
    } catch (error) {
      console.error('Error fetching roadmap:', error);
    }

    const items = Array.isArray(roadmap?.items) ? roadmap.items : [];
    
    // Enrich each item with task counts and detailed status
    const enrichedItems = await Promise.all(items.map(async (item) => {
      let tasks = [];
      try {
        const tasksRes = await callAiEngine('listImplementationTasks', item.implementation_item_id);
        tasks = Array.isArray(tasksRes?.tasks) ? tasksRes.tasks : [];
      } catch {
        // continue with empty tasks
      }
      
      const tasksByStatus = {
        open: tasks.filter((t) => normalizeStatus(t.status) === 'open').length,
        in_progress: tasks.filter((t) => normalizeStatus(t.status) === 'in_progress').length,
        completed: tasks.filter((t) => normalizeStatus(t.status) === 'completed' || normalizeStatus(t.status) === 'done').length,
        blocked: tasks.filter((t) => normalizeStatus(t.status) === 'blocked').length,
      };
      
      const inferredStatus = normalizeStatus(item?.status || item?.item_status || 'open') || 'open';
      
      return {
        ...item,
        status: inferredStatus,
        taskCount: tasks.length,
        tasksByStatus,
        allTasks: tasks,
      };
    }));

    // Calculate aggregate stats based on inferred status
    const totalItems = enrichedItems.length;
    const completedItems = enrichedItems.filter((i) => normalizeStatus(i.status) === 'completed' || normalizeStatus(i.status) === 'done');
    const inProgressItems = enrichedItems.filter((i) => normalizeStatus(i.status) === 'in_progress');
    const notStartedItems = enrichedItems.filter((i) => normalizeStatus(i.status) === 'open');
    const blockedItems = enrichedItems.filter((i) => normalizeStatus(i.status) === 'blocked');
    
    const allTasks = enrichedItems.flatMap(i => i.allTasks || []);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => normalizeStatus(t.status) === 'completed' || normalizeStatus(t.status) === 'done').length;
    const roadmapCompletion = Number(roadmap?.completion_pct ?? roadmap?.completion_percentage);
    const completionPercent = Number.isFinite(roadmapCompletion)
      ? roadmapCompletion
      : (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
    
    const activeItem = inProgressItems[0] || notStartedItems[0] || completedItems[0];
    const blockedCount = allTasks.filter((t) => normalizeStatus(t.status) === 'blocked').length;

    const lastRefresh = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const tokens = {
      projectId,
      projectTitle: roadmap.implementation_packet_title || 'Implementation Roadmap',
      activeItemTitle: activeItem?.title || 'None',
      activeItemStatus: activeItem?.status || 'unknown',
      completedCount: completedItems.length,
      inProgressCount: inProgressItems.length,
      notStartedCount: notStartedItems.length,
      totalCount: totalItems,
      completionPercent,
      blockedCount,
      lastRefresh,
      inProgressItems,
      completedItems,
      notStartedItems,
    };

    const template = await loadTemplate('operator.project_status');
    const text = applyTemplate(template, tokens);
    
    return {
      text,
      contentType: 'text/markdown; charset=utf-8',
      projectionType: 'operator.project_status',
      sourceTruth: 'sdk',
      provenance: { 
        sourceTruth: 'sdk',
        projectionType: 'operator.project_status',
        projectId,
        itemCount: totalItems,
        taskCount: totalTasks,
        completionPercent,
      },
    };
  },

  async buildProjectRoadmapProjection(params) {
    const projectId = getProjectId(params.projectId);
    
    // Fetch roadmap with full task lists
    let roadmap = {};
    try {
      roadmap = await callAiEngine('getProjectRoadmap', projectId);
    } catch (error) {
      console.error('Error fetching roadmap:', error);
    }

    const items = Array.isArray(roadmap?.items) ? roadmap.items : [];
    
    // Enrich each item with task counts
    const enrichedItems = await Promise.all(items.map(async (item) => {
      let tasks = [];
      try {
        const tasksRes = await callAiEngine('listImplementationTasks', item.implementation_item_id);
        tasks = Array.isArray(tasksRes?.tasks) ? tasksRes.tasks : [];
      } catch {
        // continue with empty tasks
      }
      
      const tasksByStatus = {
        open: tasks.filter((t) => normalizeStatus(t.status) === 'open').length,
        in_progress: tasks.filter((t) => normalizeStatus(t.status) === 'in_progress').length,
        completed: tasks.filter((t) => normalizeStatus(t.status) === 'completed' || normalizeStatus(t.status) === 'done').length,
        blocked: tasks.filter((t) => normalizeStatus(t.status) === 'blocked').length,
      };
      
      const inferredStatus = normalizeStatus(item?.status || item?.item_status || 'open') || 'open';
      
      const completedTasks = tasksByStatus.completed;
      const totalTasks = tasks.length;
      const completionPercent = Number.isFinite(Number(item?.completion_pct ?? item?.completion_percentage))
        ? Number(item?.completion_pct ?? item?.completion_percentage)
        : (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
      
      return {
        ...item,
        status: inferredStatus,
        taskCount: tasks.length,
        tasksByStatus,
        completedTasks,
        totalTasks,
        completionPercent,
        allTasks: tasks,
      };
    }));

    // Build markdown roadmap representation with task counts
    const lastRefresh = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const formatStatus = (value, fallback = 'not started') =>
      String(value || fallback).replace(/_/g, ' ');
    const quote = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const humanizeKey = (value) => String(value || 'untitled item')
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const totalTasks = enrichedItems.reduce((sum, item) => sum + item.totalTasks, 0);
    const completedTasks = enrichedItems.reduce((sum, item) => sum + item.completedTasks, 0);
    const blockedTasks = enrichedItems.reduce((sum, item) => sum + item.tasksByStatus.blocked, 0);
    const inProgressItems = enrichedItems.filter((item) => normalizeStatus(item.status) === 'in_progress');
    const completedItems = enrichedItems.filter((item) => normalizeStatus(item.status) === 'completed' || normalizeStatus(item.status) === 'done');
    const activeItem = inProgressItems[0] || enrichedItems[0] || null;
    const projectTitle = roadmap.implementation_packet_title || 'Implementation Roadmap';
    const focusTitle = activeItem?.title || humanizeKey(activeItem?.item_key) || 'Implementation roadmap';
    const focusSummary = activeItem?.summary
      || activeItem?.description
      || `Track roadmap execution across ${enrichedItems.length} items and ${totalTasks} implementation tasks.`;

    // Create roadmap items markdown
    const roadmapItemsMarkdown = enrichedItems.map(item => {
      const itemKey = item.item_key || item.implementation_item_id;
      const title = item.title || humanizeKey(itemKey);
      const status = formatStatus(item.status);
      const priority = item.priority || 'medium';
      const completed = item.completedTasks || 0;
      const total = item.totalTasks || 0;
      const target = `projection-detail.html?type=operator.roadmap_item&projectId=${encodeURIComponent(projectId)}&itemKey=${encodeURIComponent(itemKey)}`;
      
      return `- key: "${quote(item.implementation_item_id)}"\n  title: "${quote(title)}"\n  status: "${quote(status)}"\n  priority: "${quote(priority)}"\n  progress: "${completed} / ${total} tasks complete"\n  target: "${quote(target)}"`;
    }).join('\n');

    // Build the markdown projection
    const roadmapMarkdown = `---
loga_contract: "ai-engine-ui/v1"
interaction_contract: "loga-choreography/v1"
navigation_contract: "loga-navigation/v1"
projection_type: "operator.project_roadmap"
projection_id: "project:${projectId}:roadmap"
source_system: "ai-engine"
source_truth: "sql"
primary_question: "What should I care about right now?"
workspace_mode: "focus"
surface_label: "Project Roadmap"
allowed_actions:
  - open_roadmap_item
  - open_evidence_packet
  - refresh_projection
---

# Roadmap

## ${quote(projectTitle)}

::focus
question: "What should I care about right now?"
answer: "${quote(focusSummary)}"
status: "${quote(formatStatus(activeItem?.status, 'in progress'))}"
::

## Current Focus

::panel
title: "${quote(focusTitle)}"
status: "${quote(formatStatus(activeItem?.status, 'in progress'))}"
owner: "operator"
summary: "${quote(focusSummary)}"
::

## Implementation Roadmap

::roadmap
${roadmapItemsMarkdown}
::

## Delivery Snapshot

- ${completedItems.length} of ${enrichedItems.length} roadmap items complete.
- ${inProgressItems.length} roadmap items currently in progress.
- ${completedTasks} of ${totalTasks} implementation tasks complete.
- ${blockedTasks} blocked tasks currently need attention.

*Auto-refreshing — Last updated ${lastRefresh} (every 5 seconds)*`;

    return {
      text: roadmapMarkdown,
      contentType: 'text/markdown; charset=utf-8',
      projectionType: 'operator.project_roadmap',
      sourceTruth: 'sdk',
      provenance: { 
        sourceTruth: 'sdk',
        projectionType: 'operator.project_roadmap',
        projectId,
        itemCount: items.length,
        enrichedItems,
      },
    };
  },

  async buildRoadmapItemsProjection(params) {
    const projectId = getProjectId(params.projectId);
    let report = {};

    try {
      report = await callAiEngine('getProjectImplementationRoadmapReport', projectId);
    } catch (error) {
      console.error('Error fetching implementation roadmap report:', error);
    }

    const summary = report?.roadmap_summary?.summary || {};
    const rawItems = Array.isArray(report?.roadmap_summary?.phases) ? report.roadmap_summary.phases : [];
    const quote = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const humanStatus = (value) => String(value || 'unknown').replace(/_/g, ' ');
    const humanizeKey = (value) => String(value || 'untitled item')
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const normalizeItemPct = (item) => {
      const explicitPct = Number(item?.completion_pct ?? item?.completion_percentage);
      if (Number.isFinite(explicitPct)) {
        return {
          pct: explicitPct,
          completedTasks: Number(item?.completed_tasks ?? item?.completed_items ?? 0),
          totalTasks: Number(item?.total_tasks ?? item?.total_task_count ?? 0),
        };
      }

      const totalTasks = Number(item?.total_task_count || 0);
      const openTasks = Number(item?.open_task_count || 0);
      if (Number.isFinite(totalTasks) && totalTasks > 0) {
        const completedTasks = Math.max(0, totalTasks - (Number.isFinite(openTasks) ? openTasks : 0));
        const pct = Math.round((completedTasks / totalTasks) * 100);
        return {
          pct,
          completedTasks,
          totalTasks,
        };
      }

      const pct = getItemCompletionPct(item);
      return {
        pct,
        completedTasks: pct >= 100 ? 1 : 0,
        totalTasks: pct >= 100 ? 1 : 0,
      };
    };

    const cardModels = rawItems.map((item) => {
      const progress = normalizeItemPct(item);
      const itemKey = item?.item_key || item?.stable_item_key || item?.implementation_item_id || '';
      const itemLabel = item?.item_title || item?.title || item?.name || humanizeKey(itemKey);
      const target = itemKey
        ? `projection-detail.html?type=operator.roadmap_item&projectId=${encodeURIComponent(projectId)}&itemKey=${encodeURIComponent(itemKey)}`
        : '#';
      const phaseTitle = item?.phase_title || 'phase';
      const completionLabel = progress.totalTasks > 0
        ? `${progress.completedTasks} / ${progress.totalTasks} tasks complete`
        : `${progress.pct}% from item status`;

      return {
        markdown: `- name: "${quote(itemLabel)}"\n  status: "${quote(humanStatus(item?.item_status))}"\n  stage: "${quote(phaseTitle)}"\n  completion_pct: ${progress.pct}\n  done_items: ${progress.completedTasks}\n  total_items: ${progress.totalTasks}\n  progress: "${quote(completionLabel)}"\n  target: "${quote(target)}"`,
        completedTasks: progress.completedTasks,
        totalTasks: progress.totalTasks,
      };
    });

    const cards = cardModels.map((entry) => entry.markdown).join('\n');

    const projectName = report?.project?.project_name || report?.project?.name || 'Implementation Roadmap';
    const completionPct = Number(summary?.completion_percentage || 0);
    const completedTasks = Number(summary?.completed_tasks || cardModels.reduce((sum, entry) => sum + entry.completedTasks, 0));
    const totalTasks = Number(summary?.total_tasks || cardModels.reduce((sum, entry) => sum + entry.totalTasks, 0));
    const lastRefresh = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const text = `---
loga_contract: "ai-engine-ui/v1"
interaction_contract: "loga-choreography/v1"
navigation_contract: "loga-navigation/v1"
projection_type: "operator.roadmap_items"
projection_id: "project:${projectId}:roadmap-items"
source_system: "ai-engine"
source_truth: "sql"
primary_question: "How far along is each roadmap item?"
workspace_mode: "focus"
surface_label: "All Roadmap Items"
allowed_actions:
  - open_roadmap_item
  - refresh_projection
---

# All Roadmap Items

## ${quote(projectName)}

- Overall completion: ${completionPct.toFixed(1)}%
- Task completion: ${completedTasks} of ${totalTasks} tasks complete

::portfolio_grid
${cards}
::

*Auto-refreshing - Last updated ${lastRefresh} (every 5 seconds)*`;

    return {
      text,
      contentType: 'text/markdown; charset=utf-8',
      projectionType: 'operator.roadmap_items',
      sourceTruth: 'sql',
      provenance: {
        sourceTruth: 'sql',
        projectionType: 'operator.roadmap_items',
        projectId,
        itemCount: rawItems.length,
      },
    };
  },

  async buildTaskProjection(params) {
    const projectId = getProjectId(params.projectId);
    const itemKey = getItemKey(params.itemKey);
    const taskKey = getTaskKey(params.taskKey);
    let task = await resolveLiveTaskProjection({ projectId, itemKey, taskKey });
    if (!task) task = getTask(taskKey);

    const template = await loadTemplate('operator.task_detail');
    const text = applyTemplate(template, { projectId, itemKey, task });
    return {
      text,
      contentType: 'text/markdown; charset=utf-8',
      projectionType: 'operator.task_detail',
      sourceTruth: 'sql',
      provenance: { sourceTruth: 'sql', projectionType: 'operator.task_detail', projectId, itemKey, taskKey, fixture: isUuid ? 'live-sdk' : 'local-task-projection' },
    };
  },

  async buildSubtaskProjection(params) {
    const projectId = getProjectId(params.projectId);
    const itemKey = getItemKey(params.itemKey);
    const taskKey = getTaskKey(params.taskKey || DEFAULT_TASK_KEY);
    const subtaskKey = String(params.subtaskKey || DEFAULT_SUBTASK_KEY).trim();
    const subtask = await resolveLiveSubtaskProjection({ projectId, itemKey, taskKey, subtaskKey }) || getSubtask(subtaskKey);
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
    const projectId = getProjectId(params.projectId);
    const turn = params.turn || '';
    const turnData = await resolveLiveTurnProjection({ projectId, turn, workflowRunId: params.workflowRunId }) || getTurn(turn);
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
    const projectId = getProjectId(params.projectId);
    const promotionKey = params.promotionKey || '';
    const promo = await resolveLivePromotionProjection({ projectId, promotionKey }) || getPromotion(promotionKey);
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
  const contractTransforms = MARKDOWN_UI_REGISTRY.transforms || {};
  const def = routes[projType];

  if (!def) return loadLocalProjectionFixture(projType);

  for (const req of (def.required || [])) {
    if (!params[req]) throw new Error(`${projType} requires ${req}. Add ?${req}=... to the URL.`);
  }

  const paramValues = (def.params || []).map(p => params[p]);
  const allParamsPresent = paramValues.every(Boolean);
  const applyTransform = (apiData) => {
    if (!def.transform) throw new Error(`No transform configured for ${projType}.`);
    if (contractTransforms[def.transform]) {
      return applyContractTransform(def.transform, params, apiData, projType);
    }
    if (!TRANSFORMS[def.transform]) throw new Error(`Unknown transform: ${def.transform}`);
    return TRANSFORMS[def.transform](params, apiData);
  };

  // Transform-only route (no API)
  if (def.transform && !def.api) {
    if (!allParamsPresent && def.fixtureFallback) return loadLocalProjectionFixture(projType);
    return applyTransform();
  }

  // API route (with optional transform)
  if (def.api) {
    if (!allParamsPresent && def.fixtureFallback) return loadLocalProjectionFixture(projType);
    const apiArgs = paramValues.filter(Boolean);
    const apiCall = () => callAiEngine(def.api, ...apiArgs);
    if (def.transform) {
      const promise = apiCall().then(data => {
        const apiData = def.transformDataPath ? (data[def.transformDataPath] || data) : data;
        return applyTransform(apiData);
      });
      return def.fixtureFallback ? promise.catch(() => loadLocalProjectionFixture(projType)) : promise;
    }
    const promise = apiCall().then((projection) => normalizeProjectionPayload(projType, projection, params));
    return def.fixtureFallback ? promise.catch(() => loadLocalProjectionFixture(projType)) : promise;
  }

  return loadLocalProjectionFixture(projType);
}

async function normalizeProjectionPayload(projType, projection, params) {
  if (projType !== 'operator.project_roadmap' || !projection?.text || !params?.projectId) return projection;

  let report = null;
  try {
    report = await callAiEngine('getProjectImplementationRoadmapReport', params.projectId);
  } catch {
    return projection;
  }

  const phaseItems = Array.isArray(report?.roadmap_summary?.phases) ? report.roadmap_summary.phases : [];
  if (!phaseItems.length) return projection;

  const groupedPhases = aggregateRoadmapPhases(phaseItems);
  const activeItemKey = report?.active_item?.active_item?.item_key || report?.active_item?.active_item?.stable_item_key || '';
  let text = projection.text;

  if (activeItemKey) {
    const target = `projection-detail.html?type=operator.roadmap_item&projectId=${encodeURIComponent(params.projectId)}&itemKey=${encodeURIComponent(activeItemKey)}`;
    text = text.replace(/(- label: "Open Item Detail"\s+target: ")([^"]+)(")/, `$1${target}$3`);
  }

  if (groupedPhases.length) {
    const replacement = `## Phase Summary\n\n${renderPhaseSummaryMarkdown(groupedPhases)}\n\n## Roadmap Items`;
    text = text.replace(/## Phase Summary[\s\S]*?## Roadmap Items/, replacement);
  }

  return {
    ...projection,
    text,
  };
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

// --- Data source hydration ---

async function hydrateDataSources(text, params) {
  const sourceDefs = (MARKDOWN_UI_REGISTRY.dataSources) || {};
  const matches = [...text.matchAll(/::each\s+[^\n]*source="([^"]+)"/gm)];
  const sourceNames = [...new Set(matches.map(m => m[1]))];
  if (!sourceNames.length) return {};
  const sources = {};
  await Promise.all(sourceNames.map(async sourceName => {
    const def = sourceDefs[sourceName];
    if (!def) return;
    const apiArgs = (def.params || []).map(p => params[p]).filter(Boolean);
    try {
      sources[sourceName] = await callAiEngine(def.api, ...apiArgs);
    } catch {
      sources[sourceName] = null;
    }
  }));
  return sources;
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

// --- Live resolvers ---

async function resolveLiveTaskProjection({ projectId, itemKey, taskKey }) {
  try {
    const roadmap = await callAiEngine('getProjectRoadmap', projectId);
    const items = Array.isArray(roadmap?.items) ? roadmap.items : [];
    const roadmapItem = findByLookupKey(items, itemKey, ['item_key', 'key', 'slug', 'implementation_item_id']);
    const implementationItemId = roadmapItem?.implementation_item_id || roadmapItem?.id || roadmapItem?.key;
    if (!implementationItemId) return null;

    const result = await callAiEngine('listImplementationTasks', implementationItemId);
    const tasks = normalizeCollection(result, ['tasks', 'items', 'data']);
    const rawTask = findByLookupKey(tasks, taskKey, [
      'implementation_item_task_id',
      'task_key',
      'key',
      'slug',
      'id',
      'title',
    ]);
    return rawTask ? mapTaskRecord(rawTask, projectId, itemKey) : null;
  } catch {
    return null;
  }
}

async function resolveLiveSubtaskProjection({ projectId, itemKey, taskKey, subtaskKey }) {
  try {
    const task = await resolveLiveTaskProjection({ projectId, itemKey, taskKey });
    const taskId = task?.implementation_item_task_id || task?.id || task?.taskId || task?.key;
    if (!taskId) return null;

    const result = await callAiEngine('listImplementationSubtasks', taskId);
    const subtasks = normalizeCollection(result, ['subtasks', 'tasks', 'items', 'data']);
    const rawSubtask = findByLookupKey(subtasks, subtaskKey, [
      'implementation_item_subtask_id',
      'subtask_key',
      'key',
      'slug',
      'id',
      'title',
    ]);
    return rawSubtask ? mapSubtaskRecord(rawSubtask, taskId) : null;
  } catch {
    return null;
  }
}

async function resolveLiveTurnProjection({ workflowRunId, turn }) {
  if (!workflowRunId) return null;
  try {
    const substrate = await callAiEngine('getWorkflowRunSubstrate', workflowRunId);
    const rawTurn = findTurnRecord(substrate, turn);
    return rawTurn ? mapTurnRecord(rawTurn, turn) : null;
  } catch {
    return null;
  }
}

async function resolveLivePromotionProjection({ promotionKey }) {
  if (!promotionKey) return null;
  try {
    const candidate = await callAiEngine('getPromotionCandidate', promotionKey);
    return candidate ? mapPromotionRecord(candidate, promotionKey) : null;
  } catch {
    try {
      const candidates = await callAiEngine('listPromotionCandidates', { limit: 100 });
      const list = normalizeCollection(candidates, ['candidates', 'promotion_candidates', 'items', 'data']);
      const match = findByLookupKey(list, promotionKey, ['candidate_key', 'promotion_key', 'key', 'slug', 'id', 'title']);
      return match ? mapPromotionRecord(match, promotionKey) : null;
    } catch {
      return null;
    }
  }
}

function normalizeCollection(value, keys) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    for (const key of keys) {
      if (Array.isArray(value[key])) return value[key];
    }
  }
  return [];
}

function normalizeLookupValue(value) {
  return String(value ?? '').trim().toLowerCase();
}

function findByLookupKey(items, lookupKey, fields = []) {
  const target = normalizeLookupValue(lookupKey);
  if (!target) return null;
  return items.find((item) => fields.some((field) => normalizeLookupValue(item?.[field]) === target)) || null;
}

function mapTaskRecord(raw, projectId, itemKey) {
  const description = raw?.description || raw?.summary || raw?.details || '';
  const summary = description.split('\n').find((line) => line.trim())?.trim() || raw?.title || 'No detailed projection has been published for this task yet.';
  const taskId = raw?.implementation_item_task_id || raw?.id || raw?.key || raw?.task_key || '';
  return {
    key: taskId || raw?.title || DEFAULT_TASK_KEY,
    id: taskId || undefined,
    taskId: taskId || undefined,
    title: raw?.title || raw?.name || taskId || 'Task',
    status: normalizeStatus(raw?.status || raw?.item_status || 'unknown') || 'unknown',
    summary,
    acceptanceCriteria: parseDescriptionSection(description, 'Acceptance Criteria'),
    deliverables: parseDescriptionSection(description, 'Deliverables'),
    projectId,
    itemKey,
    implementation_item_task_id: raw?.implementation_item_task_id || undefined,
  };
}

function mapSubtaskRecord(raw, taskId) {
  const description = raw?.description || raw?.summary || raw?.details || '';
  const summary = description.split('\n').find((line) => line.trim())?.trim() || raw?.title || 'No detailed projection has been published for this subtask yet.';
  const subtaskId = raw?.implementation_item_subtask_id || raw?.id || raw?.key || raw?.subtask_key || '';
  return {
    key: subtaskId || raw?.title || DEFAULT_SUBTASK_KEY,
    id: subtaskId || undefined,
    title: raw?.title || raw?.name || subtaskId || 'Subtask',
    status: normalizeStatus(raw?.status || raw?.item_status || 'unknown') || 'unknown',
    summary,
    taskId,
  };
}

function mapTurnRecord(raw, turn) {
  const action = raw?.action || raw?.step || raw?.name || `Turn ${turn}`;
  const status = normalizeStatus(raw?.status || raw?.turn_status || 'unknown') || 'unknown';
  const evidence = raw?.evidence || raw?.note || raw?.artifact || raw?.summary || 'none';
  const summary = raw?.summary || raw?.detail || raw?.description || evidence || `No detail has been published for turn ${turn} yet.`;
  return {
    action,
    status,
    evidence,
    summary,
  };
}

function mapPromotionRecord(raw, promotionKey) {
  const status = normalizeStatus(raw?.status || raw?.promotion_status || 'unknown') || 'unknown';
  const impact = raw?.impact || raw?.summary || raw?.benefit || 'No detail available.';
  const description = raw?.description || raw?.detail || raw?.rationale || `No promotion detail has been published for ${promotionKey} yet.`;
  return {
    status,
    impact,
    description,
  };
}

function findTurnRecord(value, turn) {
  const target = normalizeLookupValue(turn);
  const queue = [value];
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    if (typeof current !== 'object') continue;
    const turnValue = normalizeLookupValue(current.turn ?? current.turn_number ?? current.turn_index ?? current.index ?? current.id);
    if (turnValue && (turnValue === target || turnValue === normalizeLookupValue(`turn ${turn}`))) {
      return current;
    }
    queue.push(...Object.values(current));
  }
  return null;
}

// --- Data lookup tables ---

function getSubtask(subtaskKey) {
  const key = String(subtaskKey || DEFAULT_SUBTASK_KEY).trim();
  return {
    key,
    title: key || 'Subtask',
    status: 'unknown',
    summary: 'This subtask is available structurally, but no detailed projection has been published yet.',
  };
}

function getTask(taskKey) {
  const key = String(taskKey || DEFAULT_TASK_KEY).trim();
  return {
    key,
    title: key || 'Task',
    status: 'unknown',
    summary: 'No detailed projection has been published for this task yet.',
    acceptanceCriteria: '',
    deliverables: '',
  };
}

// Parse a named section out of a description string and return a LOGA ::checklist directive block.
// Looks for a heading line like "Acceptance Criteria:" or "Deliverables:" and collects
// the following "- ..." bullet lines until the next heading or end of string.
function parseDescriptionSection(text, sectionName) {
  if (!text) return '';
  const lines = text.split('\n');
  const headingPattern = new RegExp(`^\\s*${sectionName}\\s*:?\\s*$`, 'i');
  // Known section headings that delimit sections
  const knownHeadings = /^\s*(Acceptance Criteria|Deliverables|Notes|Background|Context)\s*:?\s*$/i;
  let inSection = false;
  const items = [];
  for (const line of lines) {
    if (headingPattern.test(line)) { inSection = true; continue; }
    if (inSection && knownHeadings.test(line) && !headingPattern.test(line)) break;
    if (inSection && /^\s*-\s+/.test(line)) {
      items.push(line.trim().replace(/^-\s+/, '').replace(/"/g, "'"));
    }
  }
  if (!items.length) return '';
  const header = `## ${sectionName}\n`;
  const block = `::checklist\n${items.map(i => `- text: "${i}"`).join('\n')}\n::`;
  return header + block;
}

function getTurn(turn) {
  const key = String(turn || '').trim();
  return { action: `Turn ${key || '?'}`, status: 'unknown', evidence: 'none', summary: 'No detail has been published for this turn yet.' };
}

function getPromotion(promotionKey) {
  const key = String(promotionKey || '').trim();
  return {
    status: 'unknown',
    impact: 'No detail available.',
    description: `No promotion detail has been published for ${key || 'this key'} yet.`,
  };
}
