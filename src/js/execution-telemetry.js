import { postAiEngine } from './api-client.js';

const STORAGE_KEY = 'ai-engine.telemetry.watch-session-id';
const REFRESH_MS = 5000;
const STALE_AFTER_MS = 30000;
const NEW_YORK_TIME_ZONE = 'America/New_York';

const elements = {
  copySummaryButton: document.getElementById('telemetry-copy-summary'),
  openEvidenceButton: document.getElementById('telemetry-open-evidence'),
  refreshProjectionButton: document.getElementById('telemetry-refresh-projection'),
  sessionInput: document.getElementById('telemetry-session-id'),
  watchSessionButton: document.getElementById('telemetry-watch-session'),
  useLatestButton: document.getElementById('telemetry-use-latest'),
  refreshButton: document.getElementById('telemetry-refresh'),
  timezoneLabel: document.getElementById('telemetry-timezone-label'),
  connectionState: document.getElementById('telemetry-connection-state'),
  eventCount: document.getElementById('telemetry-event-count'),
  workflowCount: document.getElementById('telemetry-workflow-count'),
  promotionCount: document.getElementById('telemetry-promotion-count'),
  schemaCount: document.getElementById('telemetry-schema-count'),
  currentRunHeadline: document.getElementById('telemetry-current-run-headline'),
  currentRunStatus: document.getElementById('telemetry-current-run-status'),
  sessionLabel: document.getElementById('telemetry-session-label'),
  sessionSubtitle: document.getElementById('telemetry-session-subtitle'),
  projectionSource: document.getElementById('telemetry-projection-source'),
  primaryAnswer: document.getElementById('telemetry-primary-answer'),
  postureDot: document.getElementById('telemetry-posture-dot'),
  postureValue: document.getElementById('telemetry-posture-value'),
  postureSubtitle: document.getElementById('telemetry-posture-subtitle'),
  recentProcesses: document.getElementById('telemetry-recent-processes'),
  frictionDot: document.getElementById('telemetry-friction-dot'),
  frictionCount: document.getElementById('telemetry-friction-count'),
  frictionSubtitle: document.getElementById('telemetry-friction-subtitle'),
  gapDot: document.getElementById('telemetry-gap-dot'),
  gapCount: document.getElementById('telemetry-gap-count'),
  gapSubtitle: document.getElementById('telemetry-gap-subtitle'),
  filterChips: document.getElementById('telemetry-filter-chips'),
  filterSummary: document.getElementById('telemetry-filter-summary'),
  searchInput: document.getElementById('telemetry-search'),
  typeSuggestions: document.getElementById('telemetry-type-suggestions'),
  errorBanner: document.getElementById('telemetry-error-banner'),
  staleBanner: document.getElementById('telemetry-stale-banner'),
  stream: document.getElementById('telemetry-stream'),
  detailBody: document.getElementById('telemetry-detail-body'),
  scopeCockpit: document.getElementById('telemetry-scope-cockpit'),
};

const state = {
  disposed: false,
  refreshing: false,
  lastSuccessAt: 0,
  lastObservedAt: 0,
  currentSessionId: '',
  currentWorkflowRunId: '',
  currentProjection: null,
  currentTelemetry: null,
  currentSubstrate: null,
  currentCandidates: [],
  currentEvents: [],
  selectedEventId: '',
  activeFilterKind: '',
  searchQuery: '',
  projectionError: null,
  telemetryError: null,
  substrateError: null,
  candidatesError: null,
  latestModel: null,
  promotionCandidatesDisabled: false,
};

init();

function init() {
  if (elements.sessionInput) {
    elements.sessionInput.value = readStoredSessionId();
  }

  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', () => {
      state.searchQuery = String(elements.searchInput?.value || '').trim();
      renderFromState();
    });
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

  elements.watchSessionButton?.addEventListener('click', () => {
    persistSessionId(String(elements.sessionInput?.value || '').trim());
    void refreshTelemetry({ manual: true });
  });

  elements.useLatestButton?.addEventListener('click', () => {
    if (elements.sessionInput) elements.sessionInput.value = '';
    persistSessionId('');
    void refreshTelemetry({ manual: true, forceLatest: true });
  });

  elements.refreshButton?.addEventListener('click', () => {
    persistSessionId(String(elements.sessionInput?.value || '').trim());
    void refreshTelemetry({ manual: true });
  });

  elements.refreshProjectionButton?.addEventListener('click', () => {
    void refreshTelemetry({ manual: true });
  });

  elements.copySummaryButton?.addEventListener('click', async () => {
    const text = buildCopySummaryText(state.latestModel);
    await copyToClipboard(text);
  });

  elements.openEvidenceButton?.addEventListener('click', () => {
    const payload = buildEvidencePacket(state.latestModel);
    openEvidencePacket(payload);
  });

  elements.filterChips?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter-kind]');
    if (!button) return;
    state.activeFilterKind = String(button.dataset.filterKind || '');
    renderFromState();
  });

  elements.typeSuggestions?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-suggestion-kind]');
    if (!button) return;
    state.activeFilterKind = String(button.dataset.suggestionKind || '');
    renderFromState();
  });

  elements.stream?.addEventListener('click', (event) => {
    const card = event.target.closest('[data-event-id]');
    if (!card) return;
    state.selectedEventId = String(card.dataset.eventId || '');
    renderFromState();
  });

  elements.stream?.addEventListener('keydown', (event) => {
    const card = event.target.closest('[data-event-id]');
    if (!card) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      state.selectedEventId = String(card.dataset.eventId || '');
      renderFromState();
    }
  });

  elements.scopeCockpit?.addEventListener('click', () => {
    document.querySelector('.main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  void refreshTelemetry({ forceLatest: true });
  const timer = globalThis.setInterval(() => {
    void refreshTelemetry();
  }, REFRESH_MS);

  window.addEventListener('beforeunload', () => {
    state.disposed = true;
    globalThis.clearInterval(timer);
  });
}

async function refreshTelemetry({ manual = false, forceLatest = false } = {}) {
  if (state.disposed || state.refreshing) return;
  state.refreshing = true;
  renderConnectionStatus('polling', manual ? 'Refreshing projection' : 'Polling live telemetry');

  try {
    const sessionHint = forceLatest
      ? ''
      : String(elements.sessionInput?.value || '').trim();

    const snapshot = await resolveTelemetrySnapshot(sessionHint);
    if (state.disposed) return;

    state.currentProjection = snapshot.projection;
    state.projectionError = snapshot.projectionError;
    state.currentSessionId = snapshot.session?.agent_session_id
      || snapshot.projection?.summary?.agent_session_id
      || readStoredSessionId()
      || '';
    state.currentWorkflowRunId = snapshot.workflowRunId
      || snapshot.session?.workflow_run_id
      || snapshot.projection?.workflow_run_id
      || snapshot.projection?.summary?.workflow_run_id
      || '';

    const [telemetryResult, substrateResult, candidateResult] = await Promise.allSettled([
      postAiEngine('getExecutionTelemetryCurrent', [], { recordTelemetry: false }),
      state.currentWorkflowRunId
        ? postAiEngine('getWorkflowRunSubstrate', [state.currentWorkflowRunId], { recordTelemetry: false })
        : Promise.resolve(null),
      state.currentWorkflowRunId && !state.promotionCandidatesDisabled
        ? postAiEngine('listPromotionCandidates', [{
            workflowRunId: state.currentWorkflowRunId,
            limit: 25,
          }], { recordTelemetry: false })
        : Promise.resolve({ workflow_candidates: [] }),
    ]);

    if (state.disposed) return;

    state.currentTelemetry = telemetryResult.status === 'fulfilled' ? telemetryResult.value : null;
    state.currentSubstrate = substrateResult.status === 'fulfilled' ? substrateResult.value : null;
    state.currentCandidates = candidateResult.status === 'fulfilled' ? normalizeCandidates(candidateResult.value) : [];
    state.telemetryError = telemetryResult.status === 'rejected' ? telemetryResult.reason : null;
    state.substrateError = substrateResult.status === 'rejected' ? substrateResult.reason : null;
    state.candidatesError = candidateResult.status === 'rejected' ? summarizePromotionsError(candidateResult.reason) : null;
    if (candidateResult.status === 'rejected') {
      state.promotionCandidatesDisabled = true;
    }
    state.currentEvents = buildEvents({
      projection: state.currentProjection,
      session: snapshot.session,
      telemetry: state.currentTelemetry,
      substrate: state.currentSubstrate,
      candidates: state.currentCandidates,
    });
    state.lastSuccessAt = Date.now();
    state.lastObservedAt = deriveObservedTimestamp({
      events: state.currentEvents,
      telemetry: state.currentTelemetry,
      session: snapshot.session,
      projection: state.currentProjection,
    });

    if (!elements.sessionInput?.value?.trim() && state.currentSessionId) {
      elements.sessionInput.value = state.currentSessionId;
      persistSessionId(state.currentSessionId);
    }

    state.refreshing = false;
    renderFromState();
  } catch (error) {
    state.telemetryError = error;
    state.currentEvents = [];
    renderFailure(error);
  } finally {
    state.refreshing = false;
  }
}

async function resolveTelemetrySnapshot(sessionHint) {
  let projection = null;
  let projectionError = null;

  try {
    projection = await postAiEngine('getLatestMemoryProjection', [], { recordTelemetry: false });
  } catch (error) {
    projectionError = error;
  }

  const latestSessionId = cleanText(projection?.summary?.agent_session_id || projection?.summary?.session_key || '');
  const latestWorkflowRunId = cleanText(projection?.workflow_run_id || projection?.summary?.workflow_run_id || '');
  const requestedSession = cleanText(sessionHint);

  let session = null;
  let workflowRunId = latestWorkflowRunId;

  if (requestedSession) {
    if (requestedSession.startsWith('workflow-run:')) {
      const parsedWorkflowRunId = extractWorkflowRunId(requestedSession);
      if (parsedWorkflowRunId) {
        const result = await postAiEngine('getSessionPerformanceMetrics', [{
          workflowRunId: parsedWorkflowRunId,
        }], { recordTelemetry: false });
        session = pickSession(result, requestedSession);
        workflowRunId = cleanText(session?.workflow_run_id || parsedWorkflowRunId || workflowRunId);
      }
    } else {
      const result = await postAiEngine('getSessionPerformanceMetrics', [{
        sessionId: requestedSession,
      }], { recordTelemetry: false });
      session = pickSession(result, requestedSession);
      workflowRunId = cleanText(session?.workflow_run_id || workflowRunId);
    }
  }

  if (!session && latestSessionId) {
    const result = await postAiEngine('getSessionPerformanceMetrics', [{
      sessionId: latestSessionId,
    }], { recordTelemetry: false });
    session = pickSession(result, latestSessionId);
    workflowRunId = cleanText(session?.workflow_run_id || workflowRunId);
  }

  if (!session) {
    session = {
      agent_session_id: latestSessionId || '',
      session_key: cleanText(projection?.summary?.session_key || requestedSession || ''),
      workflow_run_id: workflowRunId || '',
      session_status: cleanText(projection?.summary?.session_status || projection?.workflow_run_status || ''),
    };
  }

  return {
    projection,
    projectionError,
    session,
    workflowRunId,
  };
}

function renderFromState() {
  const model = buildModel({
    projection: state.currentProjection,
    session: state.currentSessionId || state.currentWorkflowRunId ? {
      agent_session_id: state.currentSessionId,
      workflow_run_id: state.currentWorkflowRunId,
      session_status: cleanText(state.currentTelemetry?.status || state.currentProjection?.summary?.session_status || ''),
      session_key: cleanText(state.currentProjection?.summary?.session_key || ''),
    } : null,
    telemetry: state.currentTelemetry,
    substrate: state.currentSubstrate,
    candidates: state.currentCandidates,
    events: state.currentEvents,
    projectionError: state.projectionError,
    telemetryError: state.telemetryError,
    substrateError: state.substrateError,
    candidatesError: state.candidatesError,
  });

  state.latestModel = model;

  renderTimeZone();
  renderConnection(model);
  renderRail(model);
  renderFocus(model);
  renderMetrics(model);
  renderFilters(model);
  renderSuggestions(model);
  renderBanners(model);
  renderStream(model);
  renderDetail(model);
}

function renderFailure(error) {
  const message = error?.message || 'Unable to load telemetry';
  renderConnectionStatus('failed', message);

  if (elements.errorBanner) {
    elements.errorBanner.hidden = false;
    elements.errorBanner.textContent = `Unable to load live telemetry: ${message}`;
  }

  if (elements.staleBanner) {
    elements.staleBanner.hidden = true;
  }

  if (elements.stream) {
    elements.stream.innerHTML = '<div class="focus-empty-state">The watch surface is unavailable.</div>';
  }

  if (elements.detailBody) {
    elements.detailBody.innerHTML = `
      <div class="pill"><span class="dot bad"></span>failed</div>
      <h2 class="detail-title">No event selected</h2>
      <p class="detail-summary">${escapeHtml(message)}</p>
    `;
  }
}

function buildModel({ projection, session, telemetry, substrate, candidates, events, projectionError, telemetryError, substrateError, candidatesError }) {
  const eventList = Array.isArray(events) ? [...events] : [];
  const query = state.searchQuery.toLowerCase();
  const filteredByKind = state.activeFilterKind
    ? eventList.filter((event) => event.kind === state.activeFilterKind)
    : eventList;
  const filteredEvents = query
    ? filteredByKind.filter((event) => event.searchText.includes(query))
    : filteredByKind;

  let selectedEvent = filteredEvents.find((event) => event.id === state.selectedEventId) || filteredEvents[0] || null;
  if (!selectedEvent && !state.activeFilterKind && !query) {
    selectedEvent = eventList[0] || null;
  }
  if (selectedEvent && state.selectedEventId !== selectedEvent.id) {
    state.selectedEventId = selectedEvent.id;
  } else if (!selectedEvent) {
    state.selectedEventId = '';
  }

  const kindCounts = countByKind(eventList);
  const orderedKinds = Object.entries(kindCounts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([kind, count]) => ({ kind, count, label: humanizeKind(kind) }));

  const projectionSummary = projection?.operator_handoff?.operator_summary
    || projection?.operator_summary
    || projection?.status_headline
    || 'Live execution telemetry loaded.';

  const primaryAnswer = projection?.operator_handoff?.next_action
    || projection?.next_action
    || projection?.summary?.next_action
    || projectionSummary;

  const telemetryStatus = cleanText(telemetry?.status || session?.session_status || projection?.summary?.session_status || projection?.workflow_run_status || 'unknown');
  const recentProcessCount = numberOrZero(telemetry?.recent_process_count ?? telemetry?.active_process_count ?? countEventsByKind(eventList, ['recent_activity', 'workflow_turn']));
  const frictionCount = numberOrZero(telemetry?.failed_process_count ?? countEventsByKind(eventList, ['failed_process', 'retry', 'error', 'blocked']));
  const openGapCount = numberOrZero(projection?.execution_context_posture?.open_gap_count ?? projection?.summary?.open_gap_count ?? 0);
  const schemaCount = numberOrZero(
    projection?.execution_context_posture?.schema_drift_count
    ?? projection?.summary?.schema_drift_count
    ?? countEventsByKind(eventList, ['schema_drift', 'contract_mismatch', 'schema_check'])
  );
  const promotionCount = Array.isArray(candidates) ? candidates.length : 0;
  const workflowCount = numberOrZero(
    (Array.isArray(substrate?.recent_activity) ? substrate.recent_activity.length : 0)
    || countEventsByKind(eventList, ['workflow_turn', 'recent_activity', 'session_update'])
  );
  const latestObservedAt = deriveLatestObservedAt({
    events: eventList,
    telemetry,
    session,
    projection,
  });
  const ageMs = latestObservedAt ? Date.now() - latestObservedAt : null;
  const connectionState = determineConnectionState(ageMs, projectionError || telemetryError || substrateError || candidatesError);
  const posture = derivePosture({ telemetryStatus, ageMs, telemetry, session, selectedEvent });
  const selectedEventFallback = selectedEvent || buildFallbackEvent({ projection, session, telemetry });

  return {
    projection,
    session,
    telemetry,
    substrate,
    candidates,
    events: eventList,
    filteredEvents,
    selectedEvent: selectedEventFallback,
    selectedObservedAt: selectedEventFallback?.timestampMs || latestObservedAt || 0,
    projectionError,
    telemetryError,
    substrateError,
    candidatesError,
    kindCounts,
    orderedKinds,
    connectionState,
    ageMs,
    telemetryStatus,
    projectionSummary,
    primaryAnswer,
    recentProcessCount,
    frictionCount,
    openGapCount,
    schemaCount,
    promotionCount,
    workflowCount,
    posture,
    latestObservedAt,
    sessionId: cleanText(session?.agent_session_id || projection?.summary?.agent_session_id || ''),
    sessionKey: cleanText(session?.session_key || projection?.summary?.session_key || ''),
    workflowRunId: cleanText(session?.workflow_run_id || projection?.workflow_run_id || projection?.summary?.workflow_run_id || ''),
    projectionSource: buildProjectionSourceText(projection, latestObservedAt),
    sessionSubtitle: buildSessionSubtitle(session, projection, telemetryStatus),
    currentRunHeadline: selectedEventFallback?.title || projectionSummary,
    currentRunStatus: buildCurrentRunStatus(connectionState, telemetryStatus, ageMs),
    summaryText: buildCopySummaryText({
      ...state,
      projection,
      session,
      telemetry,
      substrate,
      candidates,
      events: eventList,
      selectedEvent: selectedEventFallback,
      connectionState,
      ageMs,
      telemetryStatus,
      projectionSummary,
      primaryAnswer,
      recentProcessCount,
      frictionCount,
      openGapCount,
      schemaCount,
      promotionCount,
      workflowCount,
      posture,
      latestObservedAt,
      kindCounts,
      orderedKinds,
    }),
    evidencePacket: buildEvidencePacket({
      projection,
      session,
      telemetry,
      substrate,
      candidates,
      events: eventList,
      selectedEvent: selectedEventFallback,
      telemetryStatus,
      projectionSummary,
      connectionState,
    }),
    markdownExcerpt: buildMarkdownExcerpt({
      projection,
      session,
      telemetry,
      selectedEvent: selectedEventFallback,
      filteredEvents,
      telemetryStatus,
      projectionSummary,
      primaryAnswer,
    }),
  };
}

function renderTimeZone() {
  if (!elements.timezoneLabel) return;
  elements.timezoneLabel.textContent = getNewYorkTimeZoneLabel();
}

function renderConnection(modelOrState, labelOverride = '') {
  const isModel = typeof modelOrState === 'object' && modelOrState !== null;
  const stateName = isModel ? modelOrState.connectionState : modelOrState;
  const label = labelOverride || (isModel ? buildConnectionLabel(modelOrState) : String(labelOverride || ''));
  if (!elements.connectionState) return;
  elements.connectionState.textContent = label;
  elements.connectionState.dataset.state = stateName;
}

function renderRail(model) {
  setText(elements.eventCount, String(model.events.length));
  setText(elements.workflowCount, String(model.workflowCount));
  setText(elements.promotionCount, String(model.promotionCount));
  setText(elements.schemaCount, String(model.schemaCount));
  setText(elements.currentRunHeadline, model.currentRunHeadline || 'Waiting for telemetry data...');
  setText(elements.currentRunStatus, model.currentRunStatus || 'connecting - n/a');
  setText(elements.sessionLabel, model.sessionKey || model.sessionId || 'Execution telemetry session');
  setText(elements.sessionSubtitle, model.sessionSubtitle || 'live watch');
  setText(elements.projectionSource, model.projectionSource || 'sql - generated now');
}

function renderFocus(model) {
  setText(elements.primaryAnswer, model.primaryAnswer || 'Execution is live. The cockpit will update as telemetry arrives.');
}

function renderMetrics(model) {
  setDot(elements.postureDot, model.posture.dot);
  setText(elements.postureValue, model.posture.value);
  setText(elements.postureSubtitle, model.posture.subtitle);
  setText(elements.recentProcesses, String(model.recentProcessCount));
  setDot(elements.frictionDot, model.frictionCount > 0 ? 'warn' : 'good');
  setText(elements.frictionCount, String(model.frictionCount));
  setText(elements.frictionSubtitle, model.frictionCount > 0 ? 'failed or retried events' : 'no failed events detected');
  setDot(elements.gapDot, model.openGapCount > 0 ? 'warn' : 'good');
  setText(elements.gapCount, String(model.openGapCount));
  setText(elements.gapSubtitle, model.openGapCount > 0 ? 'open substrate gaps' : 'no substrate bypasses');
}

function renderFilters(model) {
  if (!elements.filterChips) return;
  const chips = [
    { kind: '', label: 'All', count: model.events.length, active: !state.activeFilterKind },
    ...model.orderedKinds.slice(0, 5).map((entry) => ({
      kind: entry.kind,
      label: entry.label,
      count: entry.count,
      active: state.activeFilterKind === entry.kind,
    })),
  ];

  elements.filterChips.innerHTML = chips.map((chip) => `
    <button type="button" class="chip${chip.active ? ' active' : ''}" data-filter-kind="${escapeAttr(chip.kind)}">
      ${escapeHtml(chip.label)} <span class="nav-count">${escapeHtml(String(chip.count))}</span>
    </button>
  `).join('');

  if (elements.filterSummary) {
    const typeCount = model.orderedKinds.length;
    const filterLabel = state.activeFilterKind ? `filtered by ${humanizeKind(state.activeFilterKind)}` : 'all event types';
    const searchLabel = state.searchQuery ? `search "${state.searchQuery}"` : 'no search';
    elements.filterSummary.textContent = `${model.filteredEvents.length} of ${model.events.length} events across ${typeCount} types - ${filterLabel}, ${searchLabel}`;
  }
}

function renderSuggestions(model) {
  if (!elements.typeSuggestions) return;
  const suggestions = model.orderedKinds.slice(0, 3);
  if (!suggestions.length) {
    elements.typeSuggestions.hidden = true;
    elements.typeSuggestions.innerHTML = '';
    return;
  }

  elements.typeSuggestions.hidden = false;
  elements.typeSuggestions.innerHTML = suggestions.map((entry) => `
    <button type="button" class="type-suggestion${state.activeFilterKind === entry.kind ? ' selected' : ''}" data-suggestion-kind="${escapeAttr(entry.kind)}" role="option" aria-selected="${state.activeFilterKind === entry.kind ? 'true' : 'false'}">
      <span class="label">${escapeHtml(entry.label)}</span>
      <span class="count">${escapeHtml(String(entry.count))}</span>
      <span class="kind">${escapeHtml(entry.kind)}</span>
    </button>
  `).join('');
}

function renderBanners(model) {
  renderErrorBanner(model);
  renderStaleBanner(model);
}

function renderErrorBanner(model) {
  if (!elements.errorBanner) return;
  const messages = [
    model.projectionError ? `projection: ${errorMessage(model.projectionError)}` : '',
    model.telemetryError ? `telemetry: ${errorMessage(model.telemetryError)}` : '',
    model.substrateError ? `substrate: ${errorMessage(model.substrateError)}` : '',
    model.candidatesError ? `promotion candidates: ${errorMessage(model.candidatesError)}` : '',
  ].filter(Boolean);

  if (!messages.length) {
    elements.errorBanner.hidden = true;
    elements.errorBanner.textContent = '';
    return;
  }

  elements.errorBanner.hidden = false;
  elements.errorBanner.textContent = `Partial load - ${messages.join(' - ')}`;
}

function renderStaleBanner(model) {
  if (!elements.staleBanner) return;
  const isStale = model.ageMs != null && Number.isFinite(model.ageMs) && model.ageMs > STALE_AFTER_MS;
  if (!isStale) {
    elements.staleBanner.hidden = true;
    elements.staleBanner.textContent = '';
    return;
  }

  elements.staleBanner.hidden = false;
  elements.staleBanner.textContent = `No new observed activity for ${formatAge(model.ageMs)}. The newest event is older than the live threshold.`;
}

function renderStream(model) {
  if (!elements.stream) return;
  if (!model.filteredEvents.length) {
    elements.stream.innerHTML = '<div class="focus-empty-state">No telemetry events matched the current filter.</div>';
    return;
  }

  elements.stream.innerHTML = model.filteredEvents.map((event) => `
    <article
      class="event${event.id === model.selectedEvent?.id ? ' selected' : ''}"
      data-event-id="${escapeAttr(event.id)}"
      tabindex="0"
      role="button"
      aria-pressed="${event.id === model.selectedEvent?.id ? 'true' : 'false'}"
    >
      <div class="event-time">${escapeHtml(event.timeLabel)}</div>
      <div class="event-main">
        <h3 class="event-title"><span class="dot ${escapeAttr(event.dot)}"></span><span>${escapeHtml(event.title)}</span></h3>
        <p class="event-summary">${escapeHtml(event.summary)}</p>
        <div class="event-meta">
          ${event.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      </div>
      <div class="duration">${escapeHtml(event.durationLabel)}</div>
    </article>
  `).join('');
}

function renderDetail(model) {
  if (!elements.detailBody) return;
  const event = model.selectedEvent;
  if (!event) {
    elements.detailBody.innerHTML = `
      <div class="pill"><span class="dot info"></span>idle</div>
      <h2 class="detail-title">No event selected</h2>
      <p class="detail-summary">Once telemetry arrives, the newest event will be selected automatically for drill-down.</p>
    `;
    return;
  }

  elements.detailBody.innerHTML = `
    <div class="pill"><span class="dot ${escapeAttr(event.dot)}"></span>${escapeHtml(event.statusLabel)}</div>
    <h2 class="detail-title">${escapeHtml(event.title)}</h2>
    <p class="detail-summary">${escapeHtml(event.summary)}</p>

    <dl class="kv">
      <dt>When</dt><dd>${escapeHtml(event.whenLabel || event.timeLabel)}</dd>
      <dt>Kind</dt><dd>${escapeHtml(event.kind)}</dd>
      <dt>Stage</dt><dd>${escapeHtml(event.stage || 'n/a')}</dd>
      <dt>Actor</dt><dd>${escapeHtml(event.actor || 'n/a')}</dd>
      <dt>Duration</dt><dd>${escapeHtml(event.durationLabel)}</dd>
    </dl>

    <details open>
      <summary>Operator summary</summary>
      <pre>${escapeHtml(model.projectionSummary || event.summary || 'No summary available.')}</pre>
      <div class="copy-row">
        <span>copy-friendly text block</span>
        <button class="btn" type="button" data-copy-summary>Copy</button>
      </div>
    </details>

    <details>
      <summary>Evidence payload</summary>
      <pre>${escapeHtml(JSON.stringify(event.payload, null, 2))}</pre>
    </details>

    <details>
      <summary>Identifiers</summary>
      <pre>${escapeHtml(JSON.stringify({
        workflow_run_id: model.workflowRunId || 'hidden-until-needed',
        agent_session_id: model.sessionId || 'hidden-until-needed',
        agent_turn_id: event.id || 'hidden-until-needed',
        correlation_id: event.correlationId || 'hidden-until-needed',
      }, null, 2))}</pre>
    </details>

    <details>
      <summary>Markdown projection excerpt</summary>
      <pre>${escapeHtml(model.markdownExcerpt)}</pre>
    </details>
  `;

  elements.detailBody.querySelector('[data-copy-summary]')?.addEventListener('click', async () => {
    await copyToClipboard(buildCopySummaryText(model));
  });
}

function buildEvents({ projection, session, telemetry, substrate, candidates }) {
  const events = [];

  if (projection) {
    events.push(createEvent({
      id: cleanText(projection.projected_at || projection.summary?.updated_at || projection.summary?.session_key || 'projection-snapshot'),
      timestamp: projection.projected_at || projection.summary?.updated_at || projection.latest_turn_completed_at,
      kind: 'projection_snapshot',
      title: cleanText(projection.operator_handoff?.operator_summary || projection.operator_summary || projection.status_headline || 'Projection refreshed'),
      summary: cleanText(projection.operator_handoff?.next_action || projection.next_action || projection.summary?.next_action || 'Projection snapshot is available.'),
      statusLabel: 'generated',
      statusClass: 'status-pill-info',
      dot: 'info',
      actor: cleanText(projection.operator_handoff?.operator_role || projection.summary?.operator_role || 'projection-generator'),
      stage: cleanText(projection.workflow_stage || projection.summary?.workflow_stage || 'projection'),
      durationLabel: cleanText(projection.generation_duration_ms ? `${projection.generation_duration_ms}ms` : 'snapshot'),
      detailLine: cleanText(projection.current_objective || projection.summary?.current_objective || 'Live projection snapshot'),
      payload: projection,
      source: 'projection',
    }));
  }

  if (telemetry) {
    events.push(createEvent({
      id: cleanText(telemetry.last_observed_at || 'telemetry-current'),
      timestamp: telemetry.last_observed_at || telemetry.last_observed_at_utc,
      kind: 'execution_telemetry_current',
      title: cleanText(telemetry.status || 'Telemetry current'),
      summary: `active=${telemetry.active_process_count ?? 'n/a'} failed=${telemetry.failed_process_count ?? 'n/a'} recent=${telemetry.recent_process_count ?? 'n/a'}`,
      statusLabel: cleanText(telemetry.status || 'current'),
      statusClass: 'status-pill-info',
      dot: statusToDot(telemetry.status),
      actor: 'telemetry-runtime',
      stage: 'live_watch',
      durationLabel: 'current',
      detailLine: `Observed at ${formatTimestampEt(telemetry.last_observed_at) || 'unknown'}`,
      payload: telemetry,
      source: 'telemetry',
    }));
  }

  const fragments = Array.isArray(substrate?.context_fragments) ? substrate.context_fragments : [];
  fragments.forEach((fragment) => {
    events.push(createEvent({
      id: cleanText(fragment.context_fragment_id || fragment.metadata?.agent_turn_id || fragment.source_ref || ''),
      timestamp: fragment.created_at,
      kind: cleanText(fragment.fragment_type || 'context_fragment'),
      title: cleanText(fragment.fragment_role || fragment.source_ref || 'Context fragment'),
      summary: cleanText(fragment.content_text || fragment.metadata?.status_headline || 'Context fragment available.'),
      statusLabel: cleanText(fragment.fragment_role || 'fragment'),
      statusClass: 'status-pill-info',
      dot: statusToDot(fragment.fragment_role || fragment.fragment_type),
      actor: cleanText(fragment.metadata?.actor || fragment.source_ref || 'substrate'),
      stage: cleanText(fragment.metadata?.stage || fragment.fragment_type || 'context'),
      durationLabel: cleanText(fragment.metadata?.duration_ms ? `${fragment.metadata.duration_ms}ms` : 'fragment'),
      detailLine: cleanText(fragment.metadata?.source || fragment.source_ref || ''),
      payload: fragment,
      source: 'substrate',
    }));
  });

  const activity = Array.isArray(substrate?.recent_activity) ? substrate.recent_activity : [];
  activity.forEach((entry) => {
    events.push(createEvent({
      id: cleanText(entry.agent_turn_id || entry.workflow_artifact_id || entry.created_at || ''),
      timestamp: entry.created_at,
      kind: cleanText(entry.tool_name || entry.workflow_stage || 'recent_activity'),
      title: cleanText(entry.summary_text || entry.workflow_stage || 'Recent activity'),
      summary: cleanText(entry.summary_text || 'Activity entry recorded.'),
      statusLabel: cleanText(entry.tool_name || entry.model_name || 'activity'),
      statusClass: 'status-pill-info',
      dot: statusToDot(entry.tool_name || entry.workflow_stage),
      actor: cleanText(entry.model_name || entry.tool_name || 'runtime'),
      stage: cleanText(entry.workflow_stage || entry.tool_name || 'activity'),
      durationLabel: cleanText(entry.duration_ms ? `${entry.duration_ms}ms` : 'activity'),
      detailLine: cleanText(entry.source_ref || entry.artifact_type || ''),
      payload: entry,
      source: 'activity',
    }));
  });

  const items = Array.isArray(candidates) ? candidates : [];
  items.forEach((candidate, index) => {
    events.push(createEvent({
      id: cleanText(candidate.candidate_id || candidate.workflow_candidate_id || candidate.id || `promotion-${index}`),
      timestamp: candidate.created_at || candidate.updated_at || projection?.projected_at,
      kind: cleanText(candidate.kind || candidate.candidate_type || 'promotion_candidate'),
      title: cleanText(candidate.title || candidate.summary || candidate.reason || 'Promotion candidate'),
      summary: cleanText(candidate.summary || candidate.reason || 'Promotion candidate available.'),
      statusLabel: cleanText(candidate.status || 'candidate'),
      statusClass: candidate.status && String(candidate.status).toLowerCase().includes('reject') ? 'status-pill-danger' : 'status-pill-success',
      dot: candidate.status && String(candidate.status).toLowerCase().includes('reject') ? 'bad' : 'good',
      actor: cleanText(candidate.actor || candidate.owner || 'promotion-lane'),
      stage: cleanText(candidate.stage || candidate.workflow_stage || 'promotion'),
      durationLabel: cleanText(candidate.score != null ? `score ${candidate.score}` : 'candidate'),
      detailLine: cleanText(candidate.evidence || candidate.match_reason || ''),
      payload: candidate,
      source: 'candidates',
    }));
  });

  return events
    .filter((event) => event.timestampMs > 0 || event.id || event.title)
    .sort((left, right) => right.timestampMs - left.timestampMs || left.title.localeCompare(right.title));
}

function createEvent({
  id,
  timestamp,
  kind,
  title,
  summary,
  statusLabel,
  statusClass,
  dot,
  actor,
  stage,
  durationLabel,
  detailLine,
  payload,
  source,
}) {
  const timestampMs = timestampValue(timestamp);
  const normalizedKind = cleanText(kind || 'unknown');
  const normalizedTitle = cleanText(title || normalizedKind);
  const normalizedSummary = cleanText(summary || normalizedTitle);
  const normalizedStatus = cleanText(statusLabel || normalizedKind);
  const normalizedDetail = cleanText(detailLine || normalizedSummary);
  const searchText = [
    normalizedTitle,
    normalizedSummary,
    normalizedKind,
    actor,
    stage,
    source,
    JSON.stringify(payload || {}),
  ].join(' ').toLowerCase();

  return {
    id: cleanText(id || `${normalizedKind}-${timestampMs || Date.now()}`),
    timestampMs,
    kind: normalizedKind,
    kindLabel: humanizeKind(normalizedKind),
    title: normalizedTitle,
    summary: normalizedSummary,
    statusLabel: normalizedStatus,
    statusClass: statusClass || 'status-pill-info',
    dot: dot || 'info',
    actor: cleanText(actor || ''),
    stage: cleanText(stage || ''),
    durationLabel: cleanText(durationLabel || 'n/a'),
    detailLine: normalizedDetail,
    payload: payload || {},
    source: cleanText(source || ''),
    timeLabel: formatRowTimestampEt(timestamp) || 'unknown',
    whenLabel: formatTimestampEt(timestamp) || 'unknown',
    tags: buildEventTags({ kind: normalizedKind, actor, stage }),
    correlationId: cleanText(payload?.correlation_id || payload?.metadata?.correlation_id || ''),
    searchText,
  };
}

function buildEventTags({ kind, actor, stage }) {
  const meta = [kind];
  if (actor) meta.push(`actor: ${actor}`);
  if (stage) meta.push(`stage: ${stage}`);
  return meta;
}

function buildFallbackEvent({ projection, session, telemetry }) {
  const title = projection?.operator_handoff?.operator_summary
    || projection?.operator_summary
    || telemetry?.status
    || 'No event selected';
  return createEvent({
    id: 'fallback-event',
    timestamp: projection?.projected_at || telemetry?.last_observed_at || Date.now(),
    kind: 'projection_snapshot',
    title,
    summary: projection?.summary?.next_action || projection?.next_action || 'Live telemetry is loading.',
    statusLabel: telemetry?.status || session?.session_status || 'idle',
    statusClass: 'status-pill-info',
    dot: 'info',
    actor: 'operator-console',
    stage: 'summary',
    durationLabel: 'n/a',
    detailLine: 'Fallback event generated from the current snapshot.',
    payload: projection || telemetry || session || {},
    source: 'fallback',
  });
}

function deriveObservedTimestamp({ events, telemetry, session, projection }) {
  return deriveLatestObservedAt({
    events,
    telemetry,
    session,
    projection,
  });
}

function deriveLatestObservedAt({ events, telemetry, session, projection }) {
  const candidates = [
    telemetry?.last_observed_at,
    session?.session_updated_at,
    projection?.latest_turn_completed_at,
    projection?.projected_at,
    projection?.summary?.updated_at,
    projection?.summary?.latest_turn_completed_at,
    ...(Array.isArray(events) ? events.map((event) => event.timestampMs).filter((value) => Number.isFinite(value)) : []),
  ]
    .map((value) => timestampValue(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  return candidates.length ? Math.max(...candidates) : Date.now();
}

function buildProjectionSourceText(projection, observedAtMs) {
  const sourceTruth = cleanText(projection?.source_truth || 'sql');
  const when = observedAtMs ? formatTimestampEt(new Date(observedAtMs).toISOString()) : 'now';
  return `${sourceTruth} - generated ${when || 'now'}`;
}

function buildSessionSubtitle(session, projection, telemetryStatus) {
  const workflowRunId = cleanText(session?.workflow_run_id || projection?.workflow_run_id || projection?.summary?.workflow_run_id || '');
  const sessionStatus = cleanText(session?.session_status || telemetryStatus || 'unknown');
  if (!workflowRunId) {
    return `${sessionStatus} - live watch`;
  }
  return `${sessionStatus} - workflow run ${workflowRunId}`;
}

function buildCurrentRunStatus(connectionState, telemetryStatus, ageMs) {
  const status = cleanText(telemetryStatus || connectionState || 'unknown');
  const agePart = ageMs != null && Number.isFinite(ageMs) ? ` - ${formatAge(ageMs)}` : '';
  return `${status} - ${capitalize(connectionState)}${agePart}`;
}

function buildConnectionLabel(model) {
  const agePart = model.ageMs != null && Number.isFinite(model.ageMs) ? ` - ${formatAge(model.ageMs)}` : '';
  if (model.connectionState === 'failed') return `Failed${agePart}`;
  if (model.connectionState === 'polling') return 'Polling';
  if (model.connectionState === 'stale') return `Stale${agePart}`;
  return `Connected${agePart}`;
}

function buildConnectionStatusLabel(connectionState, message) {
  if (connectionState === 'failed') return `Failed - ${message}`;
  if (connectionState === 'polling') return message;
  if (connectionState === 'stale') return message;
  return message;
}

function renderConnectionStatus(connectionState, message) {
  if (!elements.connectionState) return;
  elements.connectionState.textContent = buildConnectionStatusLabel(connectionState, message);
  elements.connectionState.dataset.state = connectionState;
}

function determineConnectionState(ageMs, error) {
  if (error) return 'failed';
  if (state.refreshing) return 'polling';
  if (ageMs != null && Number.isFinite(ageMs) && ageMs > STALE_AFTER_MS) return 'stale';
  return 'connected';
}

function derivePosture({ telemetryStatus, ageMs, telemetry, session, selectedEvent }) {
  const statusText = cleanText(telemetryStatus || session?.session_status || '');
  const candidate = `${statusText} ${selectedEvent?.kind || ''} ${selectedEvent?.summary || ''}`.toLowerCase();
  if (ageMs != null && Number.isFinite(ageMs) && ageMs > STALE_AFTER_MS) {
    return {
      dot: 'warn',
      value: 'Stale',
      subtitle: `last observed ${formatAge(ageMs)}`,
    };
  }
  if (/failed|error|blocked|abort/.test(candidate)) {
    return {
      dot: 'bad',
      value: capitalize(statusText || 'Blocked'),
      subtitle: 'attention required',
    };
  }
  if (/warn|retry|gap|attention/.test(candidate)) {
    return {
      dot: 'warn',
      value: capitalize(statusText || 'Attention'),
      subtitle: 'watching for recovery',
    };
  }
  return {
    dot: 'good',
    value: capitalize(statusText || 'Running'),
    subtitle: telemetry?.last_observed_at ? `session - ${formatTimestampEt(telemetry.last_observed_at)}` : 'session - live watch',
  };
}

function statusToDot(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return 'info';
  if (/failed|error|blocked|abort|reject/.test(text)) return 'bad';
  if (/warn|retry|gap|stale|attention|pending/.test(text)) return 'warn';
  if (/projection|current|info|loaded|generated|complete|completed|success|healthy|running|active/.test(text)) return 'good';
  return 'info';
}

function buildCopySummaryText(model) {
  const selectedEvent = model?.selectedEvent;
  const lines = [
    '# Execution Telemetry',
    '',
    `Primary question: What should I care about right now?`,
    `Answer: ${model?.primaryAnswer || 'No answer available.'}`,
    `Session: ${model?.sessionId || 'n/a'}`,
    `Workflow run: ${model?.workflowRunId || 'n/a'}`,
    `Status: ${model?.telemetryStatus || 'unknown'}`,
    `Connection: ${model?.connectionState || 'unknown'}`,
    `Observed: ${model?.latestObservedAt ? formatTimestampEt(new Date(model.latestObservedAt).toISOString()) : 'n/a'}`,
    '',
    `Selected event: ${selectedEvent?.title || 'none'}`,
    `Selected kind: ${selectedEvent?.kind || 'n/a'}`,
    `Selected summary: ${selectedEvent?.summary || 'n/a'}`,
    '',
    'Recent events:',
    ...(model?.filteredEvents || []).slice(0, 5).map((event) => `- ${event.timeLabel} - ${event.title}`),
  ];
  return lines.join('\n');
}

function buildEvidencePacket(model) {
  const selectedEvent = model?.selectedEvent || null;
  return {
    projection_type: 'operator.execution_substrate_cockpit',
    contract_key: 'et-001.execution-substrate-cockpit.preview',
    session_id: model?.sessionId || '',
    workflow_run_id: model?.workflowRunId || '',
    telemetry_status: model?.telemetryStatus || '',
    connection_state: model?.connectionState || '',
    observed_at: model?.latestObservedAt ? new Date(model.latestObservedAt).toISOString() : '',
    summary: model?.projectionSummary || '',
    primary_answer: model?.primaryAnswer || '',
    selected_event: selectedEvent ? {
      id: selectedEvent.id,
      kind: selectedEvent.kind,
      title: selectedEvent.title,
      summary: selectedEvent.summary,
      when: selectedEvent.timeLabel,
      actor: selectedEvent.actor,
      stage: selectedEvent.stage,
      payload: selectedEvent.payload,
    } : null,
    counts: {
      events: model?.events?.length || 0,
      workflow: model?.workflowCount || 0,
      promotion: model?.promotionCount || 0,
      schema: model?.schemaCount || 0,
      friction: model?.frictionCount || 0,
      open_gaps: model?.openGapCount || 0,
    },
  };
}

function buildMarkdownExcerpt({ projection, session, telemetry, selectedEvent, filteredEvents, telemetryStatus, projectionSummary, primaryAnswer }) {
  const recentLines = (filteredEvents || []).slice(0, 3).map((event) => `- ${event.timeLabel} - ${event.title}`);
  const answer = cleanText(primaryAnswer || projection?.next_action || projectionSummary || 'No answer available.');
  const status = cleanText(telemetryStatus || session?.session_status || 'unknown');
  return [
    '# Execution Telemetry',
    '',
    '::focus',
    'question: "What should I care about right now?"',
    `answer: ${JSON.stringify(answer)}`,
    `status: ${JSON.stringify(status)}`,
    '::',
    '',
    '## Selected Event',
    selectedEvent ? `- ${selectedEvent.timeLabel} - ${selectedEvent.title}` : '- none selected',
    '',
    '## Recent Events',
    ...(recentLines.length ? recentLines : ['- no recent events']),
  ].join('\n');
}

function openEvidencePacket(payload) {
  const json = JSON.stringify(payload, null, 2);
  const popup = window.open('', '_blank');
  if (popup) {
    popup.document.open();
    popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Execution telemetry evidence packet</title>
</head>
<body style="margin:0;background:#0f1115;color:#e7eaf0;">
  <pre style="white-space:pre-wrap;word-break:break-word;font:12px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;padding:16px;margin:0;">${escapeHtml(json)}</pre>
</body>
</html>`);
    popup.document.close();
    return;
  }
  void copyToClipboard(json);
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // fall through to the textarea fallback
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'readonly');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function countByKind(events) {
  const counts = Object.create(null);
  for (const event of events) {
    counts[event.kind] = (counts[event.kind] || 0) + 1;
  }
  return counts;
}

function countEventsByKind(events, kinds) {
  const matchers = (Array.isArray(kinds) ? kinds : []).map((kind) => String(kind).toLowerCase());
  return events.filter((event) => matchers.some((kind) => event.kind.toLowerCase().includes(kind))).length;
}

function normalizeCandidates(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.workflow_candidates)) return value.workflow_candidates;
  if (Array.isArray(value?.promotion_candidates)) return value.promotion_candidates;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function pickSession(result, preferredSessionId) {
  const sessions = Array.isArray(result?.sessions) ? result.sessions : [];
  if (!sessions.length) return null;
  const normalized = cleanText(preferredSessionId);
  return sessions.find((session) =>
    cleanText(session.agent_session_id) === normalized
    || cleanText(session.session_key) === normalized
    || cleanText(session.workflow_run_id) === normalized
  ) || sessions[0];
}

function extractWorkflowRunId(sessionKey) {
  const match = String(sessionKey || '').match(/^workflow-run:([^:]+):/);
  return match ? match[1] : '';
}

function timestampValue(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTimestampEt(value) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: NEW_YORK_TIME_ZONE,
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(parsed);
  } catch {
    return String(value || '');
  }
}

function formatRowTimestampEt(value) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: NEW_YORK_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(parsed);
  } catch {
    return String(value || '');
  }
}

function getNewYorkTimeZoneLabel() {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: NEW_YORK_TIME_ZONE,
      timeZoneName: 'short',
    }).formatToParts(new Date()).find((part) => part.type === 'timeZoneName')?.value || 'ET';
  } catch {
    return 'ET';
  }
}

function formatAge(ageMs) {
  if (!Number.isFinite(ageMs)) return 'now';
  if (ageMs < 1000) return `${Math.max(0, Math.round(ageMs))}ms ago`;
  const seconds = Math.round(ageMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function humanizeKind(value) {
  return cleanText(value)
    .replace(/[_./-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function capitalize(value) {
  const text = String(value || '');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function numberOrZero(value) {
  const parsed = Number(value);
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

function errorMessage(error) {
  const raw = error?.message || String(error || 'Unknown error');
  return stripHtml(raw).replace(/\s+/g, ' ').trim();
}

function summarizePromotionsError(error) {
  const text = errorMessage(error);
  if (!text) return 'Promotion candidates are unavailable.';
  if (/internal server error/i.test(text)) {
    return 'Promotion candidates are unavailable due to a server error.';
  }
  return text;
}

function stripHtml(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ');
}

function setText(element, value) {
  if (!element) return;
  element.textContent = value;
}

function setDot(element, kind) {
  if (!element) return;
  element.className = `dot ${kind || 'info'}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
