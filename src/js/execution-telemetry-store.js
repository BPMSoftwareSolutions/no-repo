const EXECUTION_TELEMETRY_STORAGE_KEY = 'ai-engine.execution-telemetry-events';
const MAX_TELEMETRY_EVENTS = 50;

export function recordExecutionTelemetryEvent(event = {}) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recordedAt: new Date().toISOString(),
    kind: event.kind || 'transport',
    label: event.label || event.method || 'unknown',
    status: event.status || 'unknown',
    statusCode: Number.isFinite(event.statusCode) ? Number(event.statusCode) : null,
    durationMs: Number.isFinite(event.durationMs) ? Math.round(Number(event.durationMs)) : null,
    attempts: Number.isFinite(event.attempts) ? Number(event.attempts) : 1,
    error: event.error ? String(event.error) : '',
    detail: event.detail ? String(event.detail) : '',
  };

  const events = [entry, ...readExecutionTelemetryEvents()].slice(0, MAX_TELEMETRY_EVENTS);
  try {
    globalThis.localStorage?.setItem(EXECUTION_TELEMETRY_STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Ignore localStorage failures and keep the in-memory record ephemeral.
  }
  return entry;
}

export function readExecutionTelemetryEvents(limit = 20) {
  const parsed = readStoredTelemetry();
  return parsed.slice(0, Math.max(0, limit));
}

export function summarizeExecutionTelemetry(events = readExecutionTelemetryEvents()) {
  const list = Array.isArray(events) ? events : [];
  const total = list.length;
  const successful = list.filter((event) => String(event.status || '').toLowerCase() === 'ok').length;
  const failed = list.filter((event) => String(event.status || '').toLowerCase() === 'error').length;
  const durations = list.map((event) => Number(event.durationMs)).filter((value) => Number.isFinite(value));
  const avgLatencyMs = durations.length
    ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    : null;
  const lastEvent = list[0] || null;

  return {
    total,
    successful,
    failed,
    avgLatencyMs,
    lastEvent,
  };
}

function readStoredTelemetry() {
  try {
    const raw = globalThis.localStorage?.getItem(EXECUTION_TELEMETRY_STORAGE_KEY) || '[]';
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
