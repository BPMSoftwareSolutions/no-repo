import { postAiEngine } from './api-client.js';
import { readExecutionTelemetryEvents, summarizeExecutionTelemetry } from './execution-telemetry-store.js';

export function mountExecutionTelemetryMonitor({
  statusEl,
  currentEl,
  runsEl,
  localEl,
  compactEl,
  refreshMs = 15000,
} = {}) {
  let disposed = false;

  const refresh = async () => {
    if (disposed) return;
    if (statusEl) statusEl.textContent = 'Refreshing';

    const [currentResult, runsResult] = await Promise.allSettled([
      postAiEngine('getExecutionTelemetryCurrent', [], { recordTelemetry: false }),
      postAiEngine('listExecutionProcessRuns', [{ limit: 5 }], { recordTelemetry: false }),
    ]);

    if (disposed) return;
    const current = currentResult.status === 'fulfilled' ? currentResult.value : null;
    const runs = normalizeRunList(runsResult);
    const localSummary = summarizeExecutionTelemetry(readExecutionTelemetryEvents(12));

    if (statusEl) {
      statusEl.textContent = current ? 'Live' : 'Degraded';
      statusEl.dataset.state = current ? 'live' : 'degraded';
    }

    if (currentEl) currentEl.innerHTML = renderCurrentTelemetry(current, currentResult);
    if (runsEl) runsEl.innerHTML = renderProcessRuns(runs, runsResult);
    if (localEl) localEl.innerHTML = renderLocalTelemetry(localSummary);
    if (compactEl) compactEl.innerHTML = renderCompactTelemetry(current, runs, localSummary, currentResult, runsResult);
  };

  void refresh();
  const timer = globalThis.setInterval(refresh, refreshMs);

  return () => {
    disposed = true;
    globalThis.clearInterval(timer);
  };
}

globalThis.mountExecutionTelemetryMonitor = mountExecutionTelemetryMonitor;

function normalizeRunList(result) {
  if (result.status !== 'fulfilled') return [];
  const payload = result.value;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.process_runs)) return payload.process_runs;
  if (Array.isArray(payload?.runs)) return payload.runs;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function renderCurrentTelemetry(current, result) {
  if (!current) {
    return `<p class="execution-monitor__empty">Unable to load execution telemetry: ${escapeHtml(result.reason?.message || 'Unknown error')}</p>`;
  }

  const entries = pickPairs(current, [
    ['status', 'status'],
    ['execution_status', 'execution status'],
    ['state', 'state'],
    ['correlation_id', 'correlation id'],
    ['correlationId', 'correlation id'],
    ['workflow_run_id', 'workflow run'],
    ['workflowRunId', 'workflow run'],
    ['base_url', 'base url'],
    ['source', 'source'],
    ['updated_at', 'updated at'],
    ['updatedAt', 'updated at'],
    ['generated_at', 'generated at'],
    ['generatedAt', 'generated at'],
  ]);

  return renderDefinitionList(entries, 'Current execution telemetry');
}

function renderProcessRuns(runs, result) {
  if (!result || result.status !== 'fulfilled') {
    return `<p class="execution-monitor__empty">Unable to load process runs: ${escapeHtml(result?.reason?.message || 'Unknown error')}</p>`;
  }

  if (!runs.length) {
    return '<p class="execution-monitor__empty">No execution process runs were returned for this snapshot.</p>';
  }

  return `
    <ul class="execution-monitor__list">
      ${runs.map((run) => {
        const runId = firstText(run, ['process_run_id', 'processRunId', 'id']) || 'unknown';
        const status = firstText(run, ['status', 'run_status', 'state']) || 'unknown';
        const startedAt = firstText(run, ['started_at', 'startedAt', 'created_at', 'createdAt']);
        const completedAt = firstText(run, ['completed_at', 'completedAt', 'finished_at', 'finishedAt']);
        const artifactKind = firstText(run, ['artifact_kind', 'artifactKind']);
        return `
          <li class="execution-monitor__list-item">
            <strong>${escapeHtml(runId)}</strong>
            <span>${escapeHtml(status)}${artifactKind ? ` · ${escapeHtml(artifactKind)}` : ''}</span>
            <em>${escapeHtml(startedAt || completedAt || 'recent')}</em>
          </li>
        `;
      }).join('')}
    </ul>
  `;
}

function renderLocalTelemetry(summary) {
  const lastEvent = summary.lastEvent;
  return `
    <div class="execution-monitor__metrics">
      <div class="execution-monitor__metric"><strong>${summary.total}</strong><em>calls</em></div>
      <div class="execution-monitor__metric"><strong>${summary.successful}</strong><em>ok</em></div>
      <div class="execution-monitor__metric"><strong>${summary.failed}</strong><em>errors</em></div>
      <div class="execution-monitor__metric"><strong>${summary.avgLatencyMs == null ? '—' : `${summary.avgLatencyMs}ms`}</strong><em>avg latency</em></div>
    </div>
    <p class="execution-monitor__caption">
      ${lastEvent
        ? `Last call: ${escapeHtml(lastEvent.label)} · ${escapeHtml(lastEvent.status)} · ${escapeHtml(formatDuration(lastEvent.durationMs))}`
        : 'No local execution telemetry recorded yet.'}
    </p>
  `;
}

function renderCompactTelemetry(current, runs, localSummary, currentResult, runsResult) {
  if (!current && currentResult.status !== 'fulfilled') {
    return `<p class="execution-monitor__empty">Execution telemetry unavailable: ${escapeHtml(currentResult.reason?.message || 'Unknown error')}</p>`;
  }

  const currentStatus = firstText(current, ['status', 'execution_status', 'state']) || 'unknown';
  const runCount = runs.length;
  const latestRun = runs[0] || null;
  const latestRunStatus = latestRun ? firstText(latestRun, ['status', 'run_status', 'state']) || 'unknown' : 'none';

  return `
    <div class="execution-monitor__compact">
      <div class="execution-monitor__compact-row">
        <strong>${escapeHtml(currentStatus)}</strong>
        <span>current substrate state</span>
      </div>
      <div class="execution-monitor__compact-row">
        <strong>${runCount}</strong>
        <span>recent process runs</span>
      </div>
      <div class="execution-monitor__compact-row">
        <strong>${escapeHtml(latestRunStatus)}</strong>
        <span>latest run</span>
      </div>
      <div class="execution-monitor__compact-row">
        <strong>${localSummary.total}</strong>
        <span>local trace events</span>
      </div>
    </div>
    <p class="execution-monitor__caption">${runsResult.status === 'fulfilled' ? 'Monitoring refreshes every 15 seconds.' : 'Process runs are currently unavailable.'}</p>
  `;
}

function renderDefinitionList(entries, title) {
  return `
    <div class="execution-monitor__definition">
      <h4>${escapeHtml(title)}</h4>
      <dl>
        ${entries.map(([label, value]) => `
          <div>
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(value)}</dd>
          </div>
        `).join('')}
      </dl>
    </div>
  `;
}

function pickPairs(source, pairs) {
  return pairs
    .map(([key, label]) => [label, firstText(source, [key])])
    .filter(([, value]) => value);
}

function firstText(source, keys) {
  if (!source || typeof source !== 'object') return '';
  for (const key of keys) {
    const value = source[key];
    if (value == null || value === '') continue;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  return '';
}

function formatDuration(durationMs) {
  if (!Number.isFinite(durationMs)) return 'n/a';
  return `${Math.max(0, Math.round(durationMs))}ms`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
