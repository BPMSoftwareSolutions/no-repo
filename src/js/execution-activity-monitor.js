import { callAiEngine } from './api-client.js';
import { normalizeTelemetryActivities, summarizeTelemetryActivities } from '../shared/execution-telemetry-activity.js';

const STORAGE_KEY = 'ai-engine.telemetry.project-id';

export function mountExecutionActivityMonitor({
  projectIdInputEl,
  loadButtonEl,
  statusEl,
  summaryEl,
  feedEl,
  metaEl,
  projectLabelEl,
  refreshMs = 5000,
} = {}) {
  let disposed = false;
  let currentProjectId = readStoredProjectId();
  let currentItemId = null;

  const refresh = async () => {
    if (disposed || !currentProjectId) return;
    if (statusEl) statusEl.textContent = 'Resolving';

    try {
      const active = await callAiEngine('getProjectRoadmapActiveItem', currentProjectId);
      currentItemId = active?.active_item?.implementation_item_id || active?.implementation_item_id || null;
      if (!currentItemId) {
        throw new Error('No active implementation item available for this project.');
      }

      const payload = await callAiEngine('listImplementationItemActivity', currentItemId);
      const activities = normalizeTelemetryActivities(payload);
      const summary = summarizeTelemetryActivities(activities);

      if (statusEl) {
        statusEl.textContent = 'Live';
        statusEl.dataset.state = 'live';
      }

      if (projectLabelEl) {
        projectLabelEl.textContent = active?.active_item?.project_name || active?.project_name || currentProjectId;
      }

      if (metaEl) {
        metaEl.textContent = `Project ${currentProjectId} · Item ${currentItemId}`;
      }

      if (summaryEl) summaryEl.innerHTML = renderSummary(summary);
      if (feedEl) feedEl.innerHTML = renderFeed(summary.events);
    } catch (error) {
      if (statusEl) {
        statusEl.textContent = 'Degraded';
        statusEl.dataset.state = 'degraded';
      }
      if (summaryEl) {
        summaryEl.innerHTML = `<p class="execution-monitor__empty">Unable to load remote telemetry: ${escapeHtml(error.message)}</p>`;
      }
      if (feedEl) {
        feedEl.innerHTML = `<p class="execution-monitor__empty">No remote telemetry events available.</p>`;
      }
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    const next = String(projectIdInputEl?.value || '').trim();
    if (!next) return;
    persistProjectId(next);
    currentProjectId = next;
    void refresh();
  };

  const formEl = projectIdInputEl?.closest('form') || loadButtonEl?.closest('form') || null;
  formEl?.addEventListener('submit', onSubmit);

  if (projectIdInputEl && currentProjectId) projectIdInputEl.value = currentProjectId;

  void refresh();
  const timer = globalThis.setInterval(refresh, refreshMs);

  return () => {
    disposed = true;
    globalThis.clearInterval(timer);
    formEl?.removeEventListener('submit', onSubmit);
  };
}

function renderSummary(summary) {
  const latest = summary.latestEvent || summary.latestObservedEvent || summary.publishFailures[0] || null;
  return `
    <div class="execution-monitor__metrics">
      <div class="execution-monitor__metric"><strong>${summary.heartbeatCount}</strong><em>heartbeats</em></div>
      <div class="execution-monitor__metric"><strong>${summary.publishFailureCount}</strong><em>publish failures</em></div>
      <div class="execution-monitor__metric"><strong>${summary.latestHeartbeatAt ? escapeHtml(summary.latestHeartbeatAt) : '—'}</strong><em>latest heartbeat</em></div>
      <div class="execution-monitor__metric"><strong>${summary.latestMonitorId ? escapeHtml(summary.latestMonitorId) : '—'}</strong><em>monitor id</em></div>
    </div>
    <p class="execution-monitor__caption">
      ${summary.latestObservedEvent
        ? `Latest observed event: ${escapeHtml(summary.latestObservedEvent.eventType)} · ${escapeHtml(summary.latestObservedEvent.command || summary.latestObservedEvent.processSummary || 'n/a')}`
        : 'Waiting for heartbeat and observed execution events.'}
      ${latest?.errorMessage ? ` · Last issue: ${escapeHtml(latest.errorMessage)}` : ''}
    </p>
  `;
}

function renderFeed(events) {
  const rows = events.slice(0, 20);
  if (!rows.length) return '<p class="execution-monitor__empty">No remote events yet.</p>';

  return `
    <ul class="execution-monitor__list">
      ${rows.map((event) => `
        <li class="execution-monitor__list-item">
          <strong>${escapeHtml(event.eventType)}${event.monitorId ? ` · ${escapeHtml(event.monitorId)}` : ''}</strong>
          <span>${escapeHtml(event.timestamp || 'unknown time')}</span>
          <em>${escapeHtml(event.command || event.processSummary || event.remoteWriteStatus || 'no summary')}</em>
        </li>
      `).join('')}
    </ul>
  `;
}

function readStoredProjectId() {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function persistProjectId(value) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
