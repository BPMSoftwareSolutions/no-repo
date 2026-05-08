export function normalizeTelemetryActivities(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.activities)) return payload.activities;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.activity)) return payload.activity;
  return [];
}

export function summarizeTelemetryActivities(activities = []) {
  const items = normalizeTelemetryActivities(activities)
    .map(normalizeTelemetryActivity)
    .filter(Boolean);

  const heartbeatEvents = items.filter((item) => item.eventType === 'monitor_heartbeat');
  const publishFailures = items.filter((item) => item.eventType === 'remote_publish_failed');
  const observedEvents = items.filter((item) => [
    'shell_command_observed',
    'git_operation_observed',
    'test_run_observed',
    'projection_generation_observed',
    'process_started',
    'process_completed',
    'verification_retry_observed',
  ].includes(item.eventType));

  const latest = items[0] || null;
  const latestHeartbeat = heartbeatEvents[0] || null;
  const latestObserved = observedEvents[0] || null;

  return {
    total: items.length,
    heartbeatCount: heartbeatEvents.length,
    latestHeartbeatAt: latestHeartbeat?.timestamp || null,
    latestMonitorId: latestHeartbeat?.monitorId || latest?.monitorId || null,
    latestMonitorStatus: latestHeartbeat?.remoteWriteStatus || latest?.remoteWriteStatus || latest?.status || null,
    latestObservedEvent: latestObserved,
    publishFailureCount: publishFailures.length,
    publishFailures,
    latestEvent: latest,
    events: items,
  };
}

export function normalizeTelemetryActivity(activity) {
  if (!activity || typeof activity !== 'object') return null;
  const event = activity.event || activity.activity || activity.body || activity.payload || activity;
  const eventType = cleanText(
    event.event_type ||
    event.eventType ||
    event.kind ||
    activity.event_type ||
    activity.eventType ||
    activity.kind ||
    activity.activity_type ||
    activity.activityType
  ) || 'unknown';
  const timestamp = cleanText(
    event.timestamp ||
    event.observed_at ||
    event.observedAt ||
    activity.created_at ||
    activity.createdAt ||
    activity.updated_at ||
    activity.updatedAt ||
    activity.recorded_at ||
    activity.recordedAt
  );

  return {
    eventType,
    timestamp,
    monitorId: cleanText(event.monitor_id || event.monitorId || activity.monitor_id || activity.monitorId || ''),
    machineId: cleanText(event.machine_id || event.machineId || activity.machine_id || activity.machineId || ''),
    processId: cleanText(event.process_id || event.processId || activity.process_id || activity.processId || ''),
    repoPath: cleanText(event.repo_path || event.repoPath || activity.repo_path || activity.repoPath || ''),
    repoPathHash: cleanText(event.repo_path_hash || event.repoPathHash || activity.repo_path_hash || activity.repoPathHash || ''),
    sessionId: cleanText(event.session_id || event.sessionId || activity.session_id || activity.sessionId || ''),
    status: cleanText(event.status || activity.status || ''),
    remoteWriteStatus: cleanText(event.remote_write_status || event.remoteWriteStatus || activity.remote_write_status || activity.remoteWriteStatus || ''),
    command: cleanText(
      event.command ||
      event.latest_command ||
      event.latestCommand ||
      event.command_summary ||
      event.commandSummary ||
      event.shell_command ||
      event.shellCommand ||
      event.observed_command ||
      event.observedCommand ||
      activity.command ||
      activity.latest_command ||
      activity.shell_command ||
      activity.observed_command ||
      ''
    ),
    processSummary: cleanText(
      event.process_summary ||
      event.processSummary ||
      event.latest_process_summary ||
      event.latestProcessSummary ||
      event.command_summary ||
      event.commandSummary ||
      activity.process_summary ||
      ''
    ),
    heartbeatCount: numberOrNull(event.heartbeat_count ?? event.heartbeatCount ?? activity.heartbeat_count ?? activity.heartbeatCount),
    errorMessage: cleanText(event.error_message || event.errorMessage || activity.error_message || activity.errorMessage || ''),
    detail: cleanText(event.detail || event.message || activity.detail || activity.message || ''),
    raw: activity,
  };
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
