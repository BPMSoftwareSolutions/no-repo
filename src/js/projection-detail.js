import { callAiEngine, renderMarkdownProjection } from './api-client.js';
import { renderProjectionTree } from './projection-tree.js';
import { parseMarkdown } from '../renderer/parser.js';
import { mountWorkspaceChrome } from './workspace-chrome.js';
import { MARKDOWN_UI_REGISTRY } from '../renderer/element-registry.js';

let pollingInterval = null;

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
      
      // Show live update badge for status and roadmap projections
      if (projType === 'operator.project_status' || projType === 'operator.project_roadmap' || projType === 'operator.roadmap_items') {
        showLiveUpdateBadge();
      }
    } catch (error) {
      container.innerHTML = `<p class="loga-error">Error loading projection: ${error.message}</p>`;
    }
  };

  // Initial load
  await renderProjectionContent();

  // Set up polling for status and roadmap projections (5 second interval)
  if (projType === 'operator.project_status' || projType === 'operator.project_roadmap' || projType === 'operator.roadmap_items') {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
      await renderProjectionContent();
      updateLiveUpdateBadge();
    }, 5000);
    
    // Cleanup on page unload
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
      inProgress: String(item?.item_status || '').toLowerCase() === 'in_progress' ? 1 : 0,
      blocked: String(item?.item_status || '').toLowerCase() === 'blocked' ? 1 : 0,
      awaiting: String(item?.item_status || '').toLowerCase() === 'awaiting_review' ? 1 : 0,
    };
  }

  const status = String(item?.item_status || '').toLowerCase();
  if (status === 'done' || status === 'completed') return { pct: 100, completed: 1, total: 1, inProgress: 0, blocked: 0, awaiting: 0 };
  if (status === 'awaiting_review') return { pct: 90, completed: 0, total: 0, inProgress: 0, blocked: 0, awaiting: 1 };
  if (status === 'in_progress') return { pct: 50, completed: 0, total: 0, inProgress: 1, blocked: 0, awaiting: 0 };
  if (status === 'blocked') return { pct: 25, completed: 0, total: 0, inProgress: 0, blocked: 1, awaiting: 0 };
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
  if (projType !== 'operator.roadmap_item' && projType !== 'operator.project_detail') return;

  container.querySelectorAll('.injected-completion-gauge').forEach((el) => el.remove());

  let report;
  try {
    report = await callAiEngine('getProjectImplementationRoadmapReport', params.projectId);
  } catch {
    return;
  }

  const allItems = Array.isArray(report?.roadmap_summary?.phases) ? report.roadmap_summary.phases : [];

  if (projType === 'operator.roadmap_item') {
    const item = allItems.find((entry) => entry?.item_key === params.itemKey || entry?.stable_item_key === params.itemKey);
    if (!item) return;
    const progress = normalizeItemProgress(item);
    const h2 = container.querySelector('h2');
    if (!h2) return;
    h2.insertAdjacentHTML('afterend', `<section class="injected-completion-gauge"><p class="injected-completion-gauge__title">Item Completion</p>${renderGaugeMarkup(progress)}</section>`);
    return;
  }

  if (projType === 'operator.project_detail') {
    const activeItem = report?.active_item?.active_item;
    if (!activeItem) return;
    const progress = normalizeItemProgress(activeItem);
    const focus = container.querySelector('.loga-focus');
    if (!focus) return;
    focus.insertAdjacentHTML('beforeend', `<section class="injected-completion-gauge"><p class="injected-completion-gauge__title">Active Item Completion</p>${renderGaugeMarkup(progress)}</section>`);
  }
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

  async buildProjectStatusProjection(params) {
    const projectId = params.projectId || 'ai-engine';
    
    // Fetch roadmap with full task lists
    let roadmap = {};
    try {
      roadmap = await callAiEngine('getProjectRoadmap', projectId);
    } catch (error) {
      console.error('Error fetching roadmap:', error);
    }

    const items = Array.isArray(roadmap?.items) ? roadmap.items : [];
    
    // Enrich each item with task counts and detailed status
    const enrichedItems = await Promise.all(items.map(async (item, idx) => {
      let tasks = [];
      try {
        const tasksRes = await callAiEngine('listImplementationTasks', item.implementation_item_id);
        tasks = Array.isArray(tasksRes?.tasks) ? tasksRes.tasks : [];
      } catch {
        // continue with empty tasks
      }
      
      const tasksByStatus = {
        open: tasks.filter(t => t.status === 'open').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        blocked: tasks.filter(t => t.status === 'blocked').length,
      };
      
      // Infer item status from task states and sequence
      let inferredStatus = item.status;
      if (!inferredStatus) {
        // If explicit status not set, infer from tasks
        if (tasksByStatus.completed === tasks.length && tasks.length > 0) {
          inferredStatus = 'completed';
        } else if (tasksByStatus.in_progress > 0 || tasksByStatus.blocked > 0 || tasksByStatus.completed > 0) {
          inferredStatus = 'in_progress';
        } else if (idx === 0 || items.slice(0, idx).some(i => !i.status)) {
          // If first item or previous items aren't explicitly complete, mark as active
          inferredStatus = 'in_progress';
        } else {
          inferredStatus = 'open';
        }
      }
      
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
    const completedItems = enrichedItems.filter(i => i.status === 'completed');
    const inProgressItems = enrichedItems.filter(i => i.status === 'in_progress');
    const notStartedItems = enrichedItems.filter(i => i.status === 'open');
    const blockedItems = enrichedItems.filter(i => i.status === 'blocked');
    
    const allTasks = enrichedItems.flatMap(i => i.allTasks || []);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const activeItem = inProgressItems[0] || notStartedItems[0] || completedItems[0];
    const blockedCount = allTasks.filter(t => t.status === 'blocked').length;

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
    const projectId = params.projectId || 'ai-engine';
    
    // Fetch roadmap with full task lists
    let roadmap = {};
    try {
      roadmap = await callAiEngine('getProjectRoadmap', projectId);
    } catch (error) {
      console.error('Error fetching roadmap:', error);
    }

    const items = Array.isArray(roadmap?.items) ? roadmap.items : [];
    
    // Enrich each item with task counts
    const enrichedItems = await Promise.all(items.map(async (item, idx) => {
      let tasks = [];
      try {
        const tasksRes = await callAiEngine('listImplementationTasks', item.implementation_item_id);
        tasks = Array.isArray(tasksRes?.tasks) ? tasksRes.tasks : [];
      } catch {
        // continue with empty tasks
      }
      
      const tasksByStatus = {
        open: tasks.filter(t => t.status === 'open').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        blocked: tasks.filter(t => t.status === 'blocked').length,
      };
      
      // Infer item status from task states
      let inferredStatus = item.status;
      if (!inferredStatus) {
        if (tasksByStatus.completed === tasks.length && tasks.length > 0) {
          inferredStatus = 'completed';
        } else if (tasksByStatus.in_progress > 0 || tasksByStatus.blocked > 0 || tasksByStatus.completed > 0) {
          inferredStatus = 'in_progress';
        } else if (idx === 0 || items.slice(0, idx).some(i => !i.status)) {
          inferredStatus = 'in_progress';
        } else {
          inferredStatus = 'open';
        }
      }
      
      const completedTasks = tasksByStatus.completed;
      const totalTasks = tasks.length;
      const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
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
    const inProgressItems = enrichedItems.filter((item) => item.status === 'in_progress');
    const completedItems = enrichedItems.filter((item) => item.status === 'completed');
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
    const projectId = params.projectId || 'ai-engine';
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

    const normalizeItemPct = (item) => {
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

      const status = String(item?.item_status || '').toLowerCase();
      if (status === 'done' || status === 'completed') {
        return { pct: 100, completedTasks: 1, totalTasks: 1 };
      }
      if (status === 'awaiting_review') {
        return { pct: 90, completedTasks: 0, totalTasks: 0 };
      }
      if (status === 'in_progress') {
        return { pct: 50, completedTasks: 0, totalTasks: 0 };
      }
      return { pct: 0, completedTasks: 0, totalTasks: 0 };
    };

    const cardModels = rawItems.map((item) => {
      const progress = normalizeItemPct(item);
      const itemKey = item?.item_key || item?.stable_item_key || '';
      const target = itemKey
        ? `projection-detail.html?type=operator.roadmap_item&projectId=${encodeURIComponent(projectId)}&itemKey=${encodeURIComponent(itemKey)}`
        : '#';
      const phaseTitle = item?.phase_title || 'phase';
      const completionLabel = progress.totalTasks > 0
        ? `${progress.completedTasks} / ${progress.totalTasks} tasks complete`
        : `${progress.pct}% from item status`;

      return {
        markdown: `- name: "${quote(item?.item_title || itemKey || 'Roadmap item')}"\n  status: "${quote(humanStatus(item?.item_status))}"\n  stage: "${quote(phaseTitle)}"\n  completion_pct: ${progress.pct}\n  done_items: ${progress.completedTasks}\n  total_items: ${progress.totalTasks}\n  progress: "${quote(completionLabel)}"\n  target: "${quote(target)}"`,
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
    const projectId = params.projectId || 'ai-engine';
    const itemKey = params.itemKey || 'generic-wrapper-runtime';
    const taskKey = params.taskKey || '';

    // If taskKey looks like a UUID, fetch live data from the SDK
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskKey);
    let task = null;
    if (isUuid) {
      try {
        // Resolve the implementation_item_id for this itemKey via the roadmap
        let implementationItemId = null;
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
          const roadmap = await callAiEngine('getProjectRoadmap', projectId);
          const items = Array.isArray(roadmap?.items) ? roadmap.items : [];
          const found = items.find(i => i.item_key === itemKey || i.implementation_item_id === itemKey);
          implementationItemId = found?.implementation_item_id || null;
        }
        if (implementationItemId) {
          const tasksRes = await callAiEngine('listImplementationTasks', implementationItemId);
          const tasks = Array.isArray(tasksRes?.tasks) ? tasksRes.tasks : [];
          const raw = tasks.find(t =>
            t.implementation_item_task_id === taskKey || t.id === taskKey
          );
          if (raw) {
            const fullDescription = raw.description || raw.summary || '';
            // summary must be single-line (used inside YAML-like directive values)
            const firstLine = fullDescription.split('\n')[0].replace(/"/g, "'").trim();
            task = {
              key:                raw.implementation_item_task_id || raw.id || taskKey,
              title:              raw.title || taskKey,
              status:             raw.status || 'unknown',
              summary:            firstLine || 'No detailed projection has been published for this task yet.',
              acceptanceCriteria: parseDescriptionSection(fullDescription, 'Acceptance Criteria'),
              deliverables:       parseDescriptionSection(fullDescription, 'Deliverables'),
            };
          }
        }
      } catch {
        // fall through to fixture lookup
      }
    }

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
      acceptanceCriteria: '',
      deliverables: '',
    },
    'implement-wrapper-operations': {
      key: 'implement-wrapper-operations',
      title: 'Implement Reusable Wrapper Operations',
      status: 'in progress',
      summary: 'Generic wrapper operations are being built to replace bespoke script behavior with contract-driven, reusable execution primitives.',
      acceptanceCriteria: '',
      deliverables: '',
    },
    'replace-hard-coded-scripts': {
      key: 'replace-hard-coded-scripts',
      title: 'Replace Hard-coded Wrapper Scripts',
      status: 'blocked',
      summary: 'The system must replace bespoke source/destination rewrite behavior with generic contract-driven operations. Blocked until the SDK promotes the required execution surfaces.',
      acceptanceCriteria: '',
      deliverables: '',
    },
    'validate-execution-evidence': {
      key: 'validate-execution-evidence',
      title: 'Validate Wrapper Execution Evidence',
      status: 'not started',
      summary: 'Wrapper execution evidence must be validated against the contract before the governed refactor path is considered complete.',
      acceptanceCriteria: '',
      deliverables: '',
    },
  }[taskKey] || {
    key: taskKey || 'task',
    title: taskKey || 'Task',
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
