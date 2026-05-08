import { postAiEngine } from './api-client.js';

const STORAGE_KEY = 'ai-engine.telemetry.watch-session-id';
const REFRESH_MS = 5000;
const STALE_AFTER_MS = 30000;

const elements = {
  status: document.getElementById('telemetry-connection-status'),
  sessionInput: document.getElementById('telemetry-session-id'),
  refreshButton: document.getElementById('telemetry-refresh-button'),
  latestButton: document.getElementById('telemetry-latest-button'),
  meta: document.getElementById('telemetry-meta'),
  summary: document.getElementById('telemetry-summary-strip'),
  details: document.getElementById('telemetry-session-details'),
  feed: document.getElementById('telemetry-event-feed'),
  projection: document.getElementById('telemetry-projection-note'),
};

const state = {
  disposed: false,
  refreshing: false,
  lastSuccessAt: 0,
  lastObservedAt: 0,
  refreshCount: 0,
  currentSessionId: '',
  currentWorkflowRunId: '',
  currentProjection: null,
  currentTelemetry: null,
  currentSubstrate: null,
  currentCandidates: [],
};

if (elements.sessionInput) {
  elements.sessionInput.value = readStoredSessionId();
}

elements.sessionInput?.addEventListener('change', () => {
  persistSessionId(String(elements.sessionInput?.value || '').trim());
});

elements.sessionInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    persistSessionId(String(elements.sessionInput?.value || '').trim());
    void refreshTelemetry({ manual: true });
  }
});

elements.refreshButton?.addEventListener('click', () => {
  persistSessionId(String(elements.sessionInput?.value || '').trim());
  void refreshTelemetry({ manual: true });
});

elements.latestButton?.addEventListener('click', () => {
  if (elements.sessionInput) elements.sessionInput.value = '';
  persistSessionId('');
  void refreshTelemetry({ manual: true, forceLatest: true });
});

void refreshTelemetry({ forceLatest: true });
const timer = globalThis.setInterval(() => {
  void refreshTelemetry();
}, REFRESH_MS);

window.addEventListener('beforeunload', () => {
  state.disposed = true;
  globalThis.clearInterval(timer);
});

async function refreshTelemetry({ manual = false, forceLatest = false } = {}) {
  if (state.disposed || state.refreshing) return;
  state.refreshing = true;
  renderStatus('polling', manual ? 'Refreshing telemetry' : 'Polling live telemetry');

  try {
    const sessionHint = forceLatest
      ? ''
      : String(elements.sessionInput?.value || '').trim();
    const snapshot = await resolveTelemetrySnapshot(sessionHint);
    state.currentProjection = snapshot.projection;
    state.currentSessionId = snapshot.session?.agent_session_id || snapshot.projection?.summary?.agent_session_id || '';
    state.currentWorkflowRunId = snapshot.workflowRunId || snapshot.session?.workflow_run_id || snapshot.projection?.workflow_run_id || '';

    const [telemetryResult, substrateResult, candidateResult] = await Promise.allSettled([
      postAiEngine('getExecutionTelemetryCurrent', [], { recordTelemetry: false }),
      state.currentWorkflowRunId
        ? postAiEngine('getWorkflowRunSubstrate', [state.currentWorkflowRunId], { recordTelemetry: false })
        : Promise.resolve(null),
      state.currentWorkflowRunId
        ? postAiEngine('listPromotionCandidates', [{
            workflowRunId: state.currentWorkflowRunId,
            limit: 25,
          }], { recordTelemetry: false })
        : Promise.resolve({ workflow_candidates: [] }),
    ]);

    if (state.disposed) return;

    state.currentTelemetry = telemetryResult.status === 'fulfilled' ? telemetryResult.value : null;
    state.currentSubstrate = substrateResult.status === 'fulfilled' ? substrateResult.value : null;
    let currentCandidates = normalizeCandidates(candidateResult);
    let candidateError = candidateResult.status === 'rejected' ? candidateResult.reason : null;
    if (!currentCandidates.length && candidateResult.status === 'rejected') {
      const fallback = await resolveWorkflowCandidatesFallback();
      if (fallback) {
        currentCandidates = fallback;
        candidateError = null;
      }
    }
    state.currentCandidates = currentCandidates;
    state.lastSuccessAt = Date.now();
    state.lastObservedAt = deriveObservedTimestamp(state.currentTelemetry, snapshot.session, snapshot.projection);
    renderCockpit({
      projection: snapshot.projection,
      session: snapshot.session,
      telemetry: state.currentTelemetry,
      substrate: state.currentSubstrate,
      candidates: state.currentCandidates,
      telemetryError: telemetryResult.status === 'rejected' ? telemetryResult.reason : null,
      substrateError: substrateResult.status === 'rejected' ? substrateResult.reason : null,
      candidatesError: candidateError,
    });
    state.refreshing = false;
    updateStatusFromData();
  } catch (error) {
    renderStatus('failed', error?.message || 'Unable to load telemetry');
    if (elements.summary) {
      elements.summary.innerHTML = `<p class="execution-monitor__empty">Unable to load live telemetry: ${escapeHtml(error?.message || 'Unknown error')}</p>`;
    }
    if (elements.feed) {
      elements.feed.innerHTML = `<p class="execution-monitor__empty">The watch surface is unavailable.</p>`;
    }
  } finally {
    state.refreshing = false;
  }
}

async function resolveWorkflowCandidatesFallback() {
  try {
    const fallback = await postAiEngine('listWorkflowCandidates', [{ limit: 25 }], { recordTelemetry: false });
    return normalizeCandidates({ status: 'fulfilled', value: fallback });
  } catch {
    return null;
  }
}

async function resolveTelemetrySnapshot(sessionHint) {
  const projection = await postAiEngine('getLatestMemoryProjection', [], { recordTelemetry: false });
  const latestSessionId = cleanText(projection?.summary?.agent_session_id || projection?.summary?.session_key || '');
  const latestWorkflowRunId = cleanText(projection?.workflow_run_id || projection?.summary?.workflow_run_id || '');
  const requestedSession = cleanText(sessionHint);

  let session = null;
  let workflowRunId = latestWorkflowRunId;

  if (requestedSession) {
    if (requestedSession.startsWith('workflow-run:')) {
      const parsedWorkflowRunId = extractWorkflowRunId(requestedSession);
      if (parsedWorkflowRunId) {
        const result = await postAiEngine('getSessionPerformanceMetrics', [{ workflowRunId: parsedWorkflowRunId }], { recordTelemetry: false });
        session = pickSession(result, requestedSession);
        workflowRunId = cleanText(session?.workflow_run_id || parsedWorkflowRunId || workflowRunId);
      }
    } else {
      const result = await postAiEngine('getSessionPerformanceMetrics', [{ sessionId: requestedSession }], { recordTelemetry: false });
      session = pickSession(result, requestedSession);
      workflowRunId = cleanText(session?.workflow_run_id || workflowRunId);
    }
  }

  if (!session && latestSessionId) {
    const result = await postAiEngine('getSessionPerformanceMetrics', [{ sessionId: latestSessionId }], { recordTelemetry: false });
    session = pickSession(result, latestSessionId);
    workflowRunId = cleanText(session?.workflow_run_id || workflowRunId);
  }

  if (!session) {
    session = {
      agent_session_id: latestSessionId || '',
      session_key: cleanText(projection?.summary?.session_key || ''),
      workflow_run_id: workflowRunId || '',
      session_status: cleanText(projection?.summary?.session_status || projection?.workflow_run_status || ''),
    };
  }

  return {
    projection,
    session,
    workflowRunId,
  };
}

function renderCockpit({ projection, session, telemetry, substrate, candidates, telemetryError, substrateError, candidatesError }) {
  const summary = buildSummary({ projection, session, telemetry, substrate, candidates });
  if (elements.meta) {
    elements.meta.textContent = `Watching ${summary.sessionId || 'no session'} · workflow run ${summary.workflowRunId || 'unresolved'}`;
  }
  if (elements.projection) {
    elements.projection.innerHTML = renderProjectionNote(projection, session);
  }
  if (elements.summary) {
    elements.summary.innerHTML = renderSummaryStrip(summary, telemetryError, substrateError, candidatesError);
  }
  if (elements.details) {
    elements.details.innerHTML = renderSessionDetails(summary);
  }
  if (elements.feed) {
    elements.feed.innerHTML = renderEventFeed(substrate, telemetry, session);
  }
  if (elements.sessionInput && !String(elements.sessionInput.value || '').trim() && summary.sessionId) {
    elements.sessionInput.value = summary.sessionId;
    persistSessionId(summary.sessionId);
  }
}

function buildSummary({ projection, session, telemetry, substrate, candidates }) {
  const events = collectEvents({ ...substrate, telemetry });
  const orderedEvents = [...events].sort((left, right) => timestampValue(left.timestamp) - timestampValue(right.timestamp));
  const substantiveEvents = orderedEvents.filter((event) => event.type !== 'execution_telemetry_current');
  const latestSubstantiveEvent = substantiveEvents.at(-1) || events.at(-1) || null;
  const sessionId = cleanText(session?.agent_session_id || projection?.summary?.agent_session_id || '');
  const sessionKey = cleanText(session?.session_key || projection?.summary?.session_key || '');
  const workflowRunId = cleanText(session?.workflow_run_id || projection?.workflow_run_id || projection?.summary?.workflow_run_id || '');
  const telemetryStatus = cleanText(telemetry?.status || session?.session_status || projection?.summary?.session_status || projection?.workflow_run_status || 'unknown');
  const heartbeatTimestamp = cleanText(telemetry?.last_observed_at || projection?.latest_turn_completed_at || projection?.summary?.updated_at || '');
  const frictionCount = numberOrZero(telemetry?.failed_process_count);
  const surfaceGapCount = numberOrZero(projection?.execution_context_posture?.open_gap_count);
  const promotionCandidateCount = Array.isArray(candidates) ? candidates.length : 0;
  const latestSignalType = cleanText(projection?.latest_tool_event_kind || projection?.latest_tool_name || telemetry?.status || 'unknown');
  const recommendedNextAction = cleanText(projection?.operator_handoff?.next_action || projection?.next_action || projection?.summary?.next_action || 'No recommendation available.');
  const latestEventId = cleanText(latestSubstantiveEvent?.id || '');
  const lastObservedAt = heartbeatTimestamp;
  return {
    sessionId,
    sessionKey,
    workflowRunId,
    telemetryStatus,
    heartbeatTimestamp,
    frictionCount,
    surfaceGapCount,
    promotionCandidateCount,
    latestSignalType,
    recommendedNextAction,
    latestEventId,
    lastObservedAt,
    telemetryState: cleanText(telemetry?.status || session?.session_status || 'unknown'),
  };
}

function renderSummaryStrip(summary, telemetryError, substrateError, candidatesError) {
  const ageMs = summary.heartbeatTimestamp ? Date.now() - Date.parse(summary.heartbeatTimestamp) : null;
  const connectionState = determineConnectionState(ageMs, telemetryError || substrateError || candidatesError);
  renderStatus(connectionState, buildStatusMessage(connectionState, summary, ageMs));

  return `
    <div class="execution-monitor__metrics">
      ${metric('session id', summary.sessionId || '—')}
      ${metric('telemetry status', summary.telemetryStatus || '—')}
      ${metric('heartbeat / update', summary.heartbeatTimestamp ? `${summary.heartbeatTimestamp}${Number.isFinite(ageMs) ? ` · ${formatAge(ageMs)}` : ''}` : '—')}
      ${metric('friction count', String(summary.frictionCount))}
      ${metric('surface gaps', String(summary.surfaceGapCount))}
      ${metric('promotion candidates', String(summary.promotionCandidateCount))}
      ${metric('latest signal', summary.latestSignalType || '—')}
      ${metric('next action', summary.recommendedNextAction || '—')}
    </div>
    <p class="execution-monitor__caption">${buildSummaryCaption(summary, connectionState, telemetryError, substrateError, candidatesError)}</p>
  `;
}

function renderSessionDetails(summary) {
  return `
    <div class="execution-monitor__definition">
      <h4>Session details</h4>
      <dl>
        ${definition('agent session id', summary.sessionId)}
        ${definition('session key', summary.sessionKey)}
        ${definition('workflow run id', summary.workflowRunId)}
        ${definition('latest event id', summary.latestEventId)}
        ${definition('observed at', summary.heartbeatTimestamp)}
      </dl>
    </div>
  `;
}

function renderProjectionNote(projection, session) {
  const lines = [
    projection?.operator_handoff?.operator_summary || projection?.operator_summary || projection?.status_headline || 'Live execution telemetry loaded.',
    projection?.current_objective ? `Objective: ${projection.current_objective}` : '',
    session?.session_status ? `Session status: ${session.session_status}` : '',
  ].filter(Boolean);
  return lines.map((line) => `<div>${escapeHtml(line)}</div>`).join('');
}

function renderEventFeed(substrate, telemetry, session) {
  const events = collectEvents({ ...substrate, telemetry });
  events.sort((left, right) => timestampValue(left.timestamp) - timestampValue(right.timestamp));
  const rows = events.slice(-20);

  if (!rows.length) {
    return '<p class="execution-monitor__empty">No live events were returned for this session.</p>';
  }

  return `
    <ul class="execution-monitor__list">
      ${rows.map((event) => `
        <li class="execution-monitor__list-item">
          <strong>${escapeHtml(event.type)}${event.id ? ` · ${escapeHtml(event.id)}` : ''}</strong>
          <span>${escapeHtml(event.timestamp || 'unknown')}</span>
          <em>${escapeHtml(event.label || event.detail || 'no detail')}</em>
        </li>
      `).join('')}
    </ul>
  `;
}

function collectEvents(substrate = {}) {
  const events = [];

  if (substrate?.telemetry) {
    events.push({
      id: cleanText(substrate.telemetry.last_observed_at || 'telemetry-current'),
      timestamp: substrate.telemetry.last_observed_at,
      type: 'execution_telemetry_current',
      label: substrate.telemetry.status || 'unknown',
      detail: `active=${substrate.telemetry.active_process_count ?? 'n/a'} failed=${substrate.telemetry.failed_process_count ?? 'n/a'} recent=${substrate.telemetry.recent_process_count ?? 'n/a'}`,
    });
  }

  const fragments = Array.isArray(substrate?.context_fragments) ? substrate.context_fragments : [];
  const activity = Array.isArray(substrate?.recent_activity) ? substrate.recent_activity : [];

  fragments.forEach((fragment) => {
    events.push({
      id: cleanText(fragment.context_fragment_id || fragment.metadata?.agent_turn_id || fragment.source_ref || ''),
      timestamp: fragment.created_at,
      type: fragment.fragment_type || 'context_fragment',
      label: fragment.fragment_role || fragment.source_ref || 'fragment',
      detail: fragment.content_text || fragment.metadata?.status_headline || '',
    });
  });

  activity.forEach((entry) => {
    events.push({
      id: cleanText(entry.agent_turn_id || entry.workflow_artifact_id || entry.created_at || ''),
      timestamp: entry.created_at,
      type: 'recent_activity',
      label: entry.tool_name || entry.model_name || entry.workflow_stage || 'activity',
      detail: entry.summary_text || '',
    });
  });

  return events;
}

function updateStatusFromData() {
  const ageMs = state.lastObservedAt ? Date.now() - state.lastObservedAt : null;
  const connectionState = determineConnectionState(ageMs, null);
  renderStatus(connectionState, buildStatusMessage(connectionState, buildSummary({
    projection: state.currentProjection,
    session: state.currentProjection ? { agent_session_id: state.currentSessionId, workflow_run_id: state.currentWorkflowRunId } : null,
    telemetry: state.currentTelemetry,
    substrate: state.currentSubstrate,
    candidates: state.currentCandidates,
  }), ageMs));
}

function buildSummaryCaption(summary, connectionState, telemetryError, substrateError, candidatesError) {
  const reasons = [
    telemetryError ? `telemetry: ${telemetryError.message || telemetryError}` : '',
    substrateError ? `substrate: ${substrateError.message || substrateError}` : '',
    candidatesError ? `promotion candidates: ${candidatesError.message || candidatesError}` : '',
  ].filter(Boolean);
  const lead = `${capitalize(connectionState)} live session watch`;
  const tail = reasons.length ? ` · ${reasons.join(' · ')}` : '';
  return `${lead}. ${summary.recommendedNextAction}${tail}`;
}

function buildStatusMessage(connectionState, summary, ageMs) {
  if (connectionState === 'failed') return 'Failed';
  if (connectionState === 'polling') return 'Polling';
  if (connectionState === 'stale') return `Stale${summary.heartbeatTimestamp ? ` · ${formatAge(ageMs)}` : ''}`;
  return `Connected${summary.heartbeatTimestamp ? ` · ${formatAge(ageMs)}` : ''}`;
}

function determineConnectionState(ageMs, error) {
  if (error) return 'failed';
  if (state.refreshing) return 'polling';
  if (ageMs != null && Number.isFinite(ageMs) && ageMs > STALE_AFTER_MS) return 'stale';
  return 'connected';
}

function renderStatus(stateName, label) {
  if (!elements.status) return;
  elements.status.textContent = label;
  elements.status.dataset.state = stateName;
}

function metric(label, value) {
  return `
    <div class="execution-monitor__metric">
      <strong>${escapeHtml(value)}</strong>
      <em>${escapeHtml(label)}</em>
    </div>
  `;
}

function definition(label, value) {
  if (!value) return '';
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

function normalizeCandidates(result) {
  if (result.status !== 'fulfilled') return [];
  const payload = result.value;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.workflow_candidates)) return payload.workflow_candidates;
  if (Array.isArray(payload?.promotion_candidates)) return payload.promotion_candidates;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function pickSession(result, preferredSessionId) {
  const sessions = Array.isArray(result?.sessions) ? result.sessions : [];
  if (!sessions.length) return null;
  const normalized = cleanText(preferredSessionId);
  return sessions.find((session) =>
    cleanText(session.agent_session_id) === normalized ||
    cleanText(session.session_key) === normalized ||
    cleanText(session.workflow_run_id) === normalized
  ) || sessions[0];
}

function deriveObservedTimestamp(telemetry, session, projection) {
  const candidates = [
    telemetry?.last_observed_at,
    session?.session_updated_at,
    projection?.latest_turn_completed_at,
    projection?.projected_at,
    projection?.summary?.updated_at,
    projection?.summary?.latest_turn_completed_at,
  ].map((value) => Date.parse(value)).filter((value) => Number.isFinite(value));
  return candidates[0] || Date.now();
}

function extractWorkflowRunId(sessionKey) {
  const match = String(sessionKey || '').match(/^workflow-run:([^:]+):/);
  return match ? match[1] : '';
}

function timestampValue(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function readStoredSessionId() {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function persistSessionId(value) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, value);
  } catch {
    // ignore storage failures
  }
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAge(ageMs) {
  if (!Number.isFinite(ageMs)) return 'now';
  if (ageMs < 1000) return `${Math.max(0, Math.round(ageMs))}ms ago`;
  const seconds = Math.round(ageMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

function capitalize(value) {
  const text = String(value || '');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
