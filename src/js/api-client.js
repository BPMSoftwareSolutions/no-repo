import { parseMarkdown } from '../renderer/parser.js';
import { renderMarkdown } from '../renderer/renderer.js';

// Shared AIEngine API wrapper
export async function callAiEngine(method, ...args) {
  try {
    const res = await fetch('/api/ai-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, args })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Unknown error');
    return data.result;
  } catch (err) {
    console.error(`Error calling ${method}:`, err);
    throw err;
  }
}

// --- SPA link resolution ---

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveProjectionHref(rawHref) {
  const href = String(rawHref || '').trim();
  if (!href || href === '#') return '#';
  if (href.startsWith('#')) return href;

  const viewerProject = href.match(/\/viewer\/ai-engine\/projects\/([^/\s]+)$/i);
  if (viewerProject) {
    return `projection-detail.html?type=operator.project_detail&projectId=${encodeURIComponent(viewerProject[1])}`;
  }

  const viewerRoadmapItem = href.match(/\/viewer\/ai-engine\/projects\/([^/\s]+)\/roadmap\/([^/\s]+)/i);
  if (viewerRoadmapItem) {
    return `projection-detail.html?type=operator.roadmap_item&projectId=${encodeURIComponent(viewerRoadmapItem[1])}&itemKey=${encodeURIComponent(viewerRoadmapItem[2])}`;
  }

  const viewerRoadmap = href.match(/\/viewer\/ai-engine\/projects\/([^/\s]+)\/roadmap$/i);
  if (viewerRoadmap) {
    return `projection-detail.html?type=operator.project_roadmap&projectId=${encodeURIComponent(viewerRoadmap[1])}`;
  }

  const viewerEvidence = href.match(/\/viewer\/ai-engine\/projects\/([^/\s]+)\/evidence\/([^/\s]+)/i);
  if (viewerEvidence) {
    return `projection-detail.html?type=operator.evidence_packet&projectId=${encodeURIComponent(viewerEvidence[1])}&evidencePacketKey=${encodeURIComponent(viewerEvidence[2])}`;
  }

  const viewerLane = href.match(/\/viewer\/ai-engine\/projects\/([^/\s]+)\/(promotions|workflow-runs|agent-session|cicd-status)$/i);
  if (viewerLane) {
    const typeByLane = {
      'promotions': 'operator.promotions',
      'workflow-runs': 'operator.workflow_runs',
      'agent-session': 'operator.agent_session',
      'cicd-status': 'operator.cicd_status',
    };
    return `projection-detail.html?type=${encodeURIComponent(typeByLane[viewerLane[2]])}&projectId=${encodeURIComponent(viewerLane[1])}`;
  }

  const roadmapItem = href.match(/projects\/([^/\s]+)\/roadmap\/items\/([^/\s]+)/i);
  if (roadmapItem) {
    return `projection-detail.html?type=operator.roadmap_item&projectId=${encodeURIComponent(roadmapItem[1])}&itemKey=${encodeURIComponent(roadmapItem[2])}`;
  }

  const knownType = href.match(/^(operator\.[a-z0-9_./-]+)(?:[?#].*)?$/i);
  if (knownType) {
    return `projection-detail.html?type=${encodeURIComponent(knownType[1])}`;
  }

  const projectRoadmap = href.match(/projects\/([^/\s]+)\/roadmap(?:\.md)?/i);
  if (projectRoadmap) {
    return `projection-detail.html?type=operator.project_roadmap&projectId=${encodeURIComponent(projectRoadmap[1])}`;
  }

  const workflowRun = href.match(/workflow-runs\/([^/\s]+)/i);
  if (workflowRun) {
    return `projection-detail.html?type=operator.workflow_run&workflowRunId=${encodeURIComponent(workflowRun[1])}`;
  }

  const evidencePacket = href.match(/evidence-packets\/([^/\s]+)/i);
  if (evidencePacket) {
    return `projection-detail.html?type=operator.evidence_packet&evidencePacketKey=${encodeURIComponent(evidencePacket[1])}`;
  }

  if (/^https?:\/\//i.test(href)) return href;
  return `projection-detail.html?target=${encodeURIComponent(href)}`;
}

function currentSearchParams() {
  if (!globalThis.window?.location) return new URLSearchParams();
  return new URLSearchParams(globalThis.window.location.search);
}

function resolveListItemHref(block, key) {
  const params = currentSearchParams();
  const projectId = params.get('projectId') || 'ai-engine';
  const itemKey = params.get('itemKey') || 'generic-wrapper-runtime';

  if (block === 'task_list' && key) {
    return `projection-detail.html?type=operator.task_detail&projectId=${encodeURIComponent(projectId)}&itemKey=${encodeURIComponent(itemKey)}&taskKey=${encodeURIComponent(key)}`;
  }
  if (block === 'promotion_list' && key) {
    return `projection-detail.html?type=operator.promotions&projectId=${encodeURIComponent(projectId)}&promotionKey=${encodeURIComponent(key)}`;
  }
  if (block === 'run_list' && key) {
    return `projection-detail.html?type=operator.workflow_run&workflowRunId=${encodeURIComponent(key)}`;
  }
  if (block === 'turn_list' && key) {
    return `projection-detail.html?type=operator.agent_session&projectId=${encodeURIComponent(projectId)}&turn=${encodeURIComponent(key)}`;
  }
  return '';
}

function resolveRenderedLinks(html) {
  const div = document.createElement('div');
  div.innerHTML = html;

  // Resolve all non-# hrefs (nav pills, breadcrumbs, inline markdown links)
  div.querySelectorAll('a[href]:not([href="#"])').forEach((a) => {
    const raw = a.getAttribute('href');
    if (raw && !raw.startsWith('projection-detail.html')) {
      a.href = resolveProjectionHref(raw);
    }
  });

  // Resolve list item links using block-type-specific routing
  div.querySelectorAll('a.loga-list-item').forEach((a) => {
    const raw = a.getAttribute('href');
    const block = a.dataset.block;
    const key = a.dataset.key;
    if (raw && raw !== '#' && !raw.startsWith('projection-detail.html')) {
      a.href = resolveProjectionHref(raw);
    } else if (block && key && (!raw || raw === '#')) {
      const resolved = resolveListItemHref(block, key);
      if (resolved) a.href = resolved;
    }
  });

  return div.innerHTML;
}

// --- CSS injection from JSON registry ---

let stylesInjected = false;

async function injectRegistryStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  stylesInjected = true;
  try {
    const url = new URL('../renderer/markdown-ui-elements.json', import.meta.url);
    const res = await fetch(url);
    const registry = await res.json();
    const style = document.createElement('style');
    style.id = 'markdown-ui-registry-styles';
    style.textContent = generateCss(registry.styles, registry.media);
    document.head.appendChild(style);
  } catch (err) {
    console.warn('Could not inject markdown UI registry styles:', err);
  }
}

function generateCss(styles, media = {}) {
  const baseCss = Object.entries(styles).map(([selector, props]) => {
    if (selector.startsWith('@')) {
      const inner = Object.entries(props)
        .map(([sel, p]) => `${sel}{${propsToDeclarations(p)}}`)
        .join('');
      return `${selector}{${inner}}`;
    }
    return `${selector}{${propsToDeclarations(props)}}`;
  }).join('');

  const mediaCss = Object.entries(media).map(([query, rules]) => {
    const inner = Object.entries(rules)
      .map(([selector, props]) => `${selector}{${propsToDeclarations(props)}}`)
      .join('');
    return `${query}{${inner}}`;
  }).join('');

  return `${baseCss}${mediaCss}`;
}

function propsToDeclarations(props) {
  return Object.entries(props)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${v}`)
    .join(';');
}

injectRegistryStyles();

// --- Main renderer ---

export function renderMarkdownProjection(text, dataContext = {}) {
  if (!text) return '';
  const { body } = parseMarkdown(text);
  const raw = renderMarkdown(body, dataContext);
  return resolveRenderedLinks(raw);
}
