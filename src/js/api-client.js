import { parseMarkdown } from '../renderer/parser.js';
import { renderMarkdown } from '../renderer/renderer.js';
import { DEFAULT_ITEM_KEY, DEFAULT_PROJECT_ID } from '../shared/projection-schema.js';

const AI_ENGINE_API_KEY_STORAGE_KEY = 'ai-engine.api-key';
const AI_ENGINE_API_KEY_HEADER = 'X-AI-Engine-Api-Key';
const AI_ENGINE_API_KEY_MODAL_ID = 'ai-engine-api-key-modal';
let apiKeyPromptPromise = null;
let cachedApiKey = '';
let lastRejectedApiKey = '';

function getStoredAiEngineApiKey() {
  if (cachedApiKey) return cachedApiKey;
  try {
    const stored = globalThis.localStorage?.getItem(AI_ENGINE_API_KEY_STORAGE_KEY)?.trim() || '';
    if (stored) cachedApiKey = stored;
    return stored;
  } catch {
    return '';
  }
}

function storeAiEngineApiKey(apiKey) {
  cachedApiKey = String(apiKey || '').trim();
  lastRejectedApiKey = '';
  try {
    globalThis.localStorage?.setItem(AI_ENGINE_API_KEY_STORAGE_KEY, cachedApiKey);
  } catch {
    // Ignore localStorage failures and continue with the in-memory cache.
  }
}

export function clearStoredAiEngineApiKey() {
  cachedApiKey = '';
  try {
    globalThis.localStorage?.removeItem(AI_ENGINE_API_KEY_STORAGE_KEY);
  } catch {
    // Ignore localStorage failures.
  }
}

async function ensureAiEngineApiKey({ forcePrompt = false, reason = '' } = {}) {
  const storedApiKey = getStoredAiEngineApiKey();
  if (storedApiKey && !forcePrompt) return storedApiKey;

  const apiKey = (await promptForAiEngineApiKey({
    initialValue: storedApiKey,
    reason,
  })).trim();

  if (!apiKey) {
    throw new Error('AI Engine API key is required.');
  }

  storeAiEngineApiKey(apiKey);
  return apiKey;
}

async function promptForAiEngineApiKey({ initialValue = '', reason = '' } = {}) {
  if (apiKeyPromptPromise) return apiKeyPromptPromise;

  if (typeof document === 'undefined') {
    if (typeof window?.prompt === 'function') {
      const fallback = window.prompt(buildApiKeyPromptText(reason), initialValue);
      if (fallback === null) throw new Error('AI Engine API key entry was cancelled.');
      return fallback;
    }
    throw new Error('AI Engine API key is required, but prompting is unavailable in this environment.');
  }

  apiKeyPromptPromise = openApiKeyModal({ initialValue, reason });
  try {
    return await apiKeyPromptPromise;
  } finally {
    apiKeyPromptPromise = null;
  }
}

function buildApiKeyPromptText(reason) {
  return reason
    ? `Enter your AI Engine API key. ${reason}`
    : 'Enter your AI Engine API key.';
}

function openApiKeyModal({ initialValue = '', reason = '' } = {}) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(AI_ENGINE_API_KEY_MODAL_ID);
    existing?.remove();

    const overlay = document.createElement('div');
    overlay.id = AI_ENGINE_API_KEY_MODAL_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'ai-engine-api-key-title');
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(3,7,18,0.72);backdrop-filter:blur(6px);z-index:9998;"></div>
      <form style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(92vw,480px);background:#111c2b;color:#d6deeb;border:1px solid rgba(124,156,255,0.24);border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,0.45);padding:24px;z-index:9999;display:grid;gap:14px;">
        <div>
          <h2 id="ai-engine-api-key-title" style="margin:0 0 8px;font:600 22px/1.1 'Segoe UI',sans-serif;color:#f8fbff;">AI Engine API Key</h2>
          <p style="margin:0;color:#a8b6cc;font:14px/1.5 'Segoe UI',sans-serif;">${escapeHtml(buildApiKeyPromptText(reason))}</p>
        </div>
        <label style="display:grid;gap:8px;font:600 13px/1.4 'Segoe UI',sans-serif;color:#d6deeb;">
          API key
          <input id="ai-engine-api-key-input" type="password" value="${escapeHtml(initialValue)}" autocomplete="off" spellcheck="false" style="width:100%;box-sizing:border-box;padding:12px 14px;border-radius:10px;border:1px solid rgba(124,156,255,0.24);background:rgba(3,7,18,0.72);color:#f8fbff;font:14px/1.4 Consolas,monospace;">
        </label>
        <div id="ai-engine-api-key-error" style="min-height:1.2em;color:#fca5a5;font:13px/1.4 'Segoe UI',sans-serif;"></div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button type="button" data-action="cancel" style="padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);background:transparent;color:#d6deeb;font:600 13px/1 'Segoe UI',sans-serif;cursor:pointer;">Cancel</button>
          <button type="submit" style="padding:10px 14px;border-radius:10px;border:0;background:#7c9cff;color:#08111d;font:700 13px/1 'Segoe UI',sans-serif;cursor:pointer;">Continue</button>
        </div>
      </form>
    `;

    const cleanup = () => overlay.remove();
    const form = overlay.querySelector('form');
    const input = overlay.querySelector('#ai-engine-api-key-input');
    const error = overlay.querySelector('#ai-engine-api-key-error');
    const cancel = overlay.querySelector('[data-action="cancel"]');

    cancel?.addEventListener('click', () => {
      cleanup();
      reject(new Error('AI Engine API key entry was cancelled.'));
    });

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = String(input?.value || '').trim();
      if (!value) {
        if (error) error.textContent = 'API key is required.';
        input?.focus();
        return;
      }
      cleanup();
      resolve(value);
    });

    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cleanup();
        reject(new Error('AI Engine API key entry was cancelled.'));
      }
    });

    document.body.appendChild(overlay);
    queueMicrotask(() => {
      input?.focus();
      input?.setSelectionRange?.(0, String(input.value || '').length);
    });
  });
}

export async function aiEngineFetch(input, init = {}, { retryOnAuthFailure = true } = {}) {
  const apiKey = await ensureAiEngineApiKey();
  const headers = new Headers(init.headers || {});
  headers.set(AI_ENGINE_API_KEY_HEADER, apiKey);

  let response = await fetch(input, { ...init, headers });
  if (!retryOnAuthFailure || (response.status !== 401 && response.status !== 403)) {
    if (response.status < 400) lastRejectedApiKey = '';
    return response;
  }

  if (apiKey && apiKey === lastRejectedApiKey) {
    throw new Error('AI Engine API key was rejected. Enter a different key and try again.');
  }

  clearStoredAiEngineApiKey();
  const refreshedApiKey = await ensureAiEngineApiKey({
    forcePrompt: true,
    reason: 'The stored key was rejected. Please try again.',
  });
  headers.set(AI_ENGINE_API_KEY_HEADER, refreshedApiKey);
  response = await fetch(input, { ...init, headers });
  if (response.status === 401 || response.status === 403) {
    lastRejectedApiKey = refreshedApiKey;
  } else {
    lastRejectedApiKey = '';
  }
  return response;
}

// Shared AIEngine API wrapper
export async function callAiEngine(method, ...args) {
  try {
    const res = await aiEngineFetch('/api/ai-engine', {
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
  const projectId = params.get('projectId') || DEFAULT_PROJECT_ID;
  const itemKey = params.get('itemKey') || DEFAULT_ITEM_KEY;

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
