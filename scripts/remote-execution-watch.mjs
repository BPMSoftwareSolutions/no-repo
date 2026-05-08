import { AIEngineClient } from './telemetry-client.mjs';

const client = AIEngineClient.fromEnv();
const projectId = process.env.AI_ENGINE_TELEMETRY_PROJECT_ID;
const itemId = process.env.AI_ENGINE_TELEMETRY_ITEM_ID;
const refreshMs = Number(process.env.AI_ENGINE_TELEMETRY_REFRESH_MS || 3000);

if (!projectId && !itemId) {
  throw new Error('AI_ENGINE_TELEMETRY_PROJECT_ID or AI_ENGINE_TELEMETRY_ITEM_ID is required.');
}

console.log(JSON.stringify({
  watch_item_id: itemId || null,
  project_id: projectId || null,
}, null, 2));

const timer = setInterval(() => {
  void refresh();
}, refreshMs);
timer.unref?.();

await refresh();

async function refresh() {
  const projection = await client.getLatestMemoryProjection();
  const summary = projection?.summary || {};
  const parsed = parseTelemetrySummary(summary.latest_tool_summary || summary.latest_activity || '');

  console.log(JSON.stringify({
    summary: {
      heartbeat_count: parsed.heartbeatCount ?? summary.tool_event_count ?? 0,
      latest_heartbeat_timestamp: summary.latest_turn_completed_at || null,
      latest_monitor_id: parsed.monitorId || null,
      latest_monitor_status: parsed.remoteWriteStatus || summary.latest_tool_event_kind || null,
      latest_observed_event: parsed.raw || summary.latest_tool_summary || null,
      remote_publish_failure_count: parsed.eventType === 'remote_publish_failed' ? 1 : 0,
      total_events: summary.tool_event_count ?? 0,
      project_id: summary.project_id || null,
      workflow_run_id: summary.workflow_run_id || null,
    },
    latest_event: parsed.eventType ? {
      eventType: parsed.eventType,
      timestamp: summary.latest_turn_completed_at || null,
      monitorId: parsed.monitorId || null,
      status: parsed.status || null,
      remoteWriteStatus: parsed.remoteWriteStatus || null,
      command: parsed.command || '',
      processSummary: parsed.processSummary || '',
      heartbeatCount: parsed.heartbeatCount ?? null,
      errorMessage: parsed.errorMessage || '',
      detail: parsed.detail || '',
      raw: summary.latest_tool_summary || '',
    } : null,
    projection: {
      latest_tool_summary: summary.latest_tool_summary || null,
      latest_activity: summary.latest_activity || null,
      current_objective: summary.current_objective || null,
      latest_turn_completed_at: summary.latest_turn_completed_at || null,
      project_name: summary.project_name || null,
      project_slug: summary.project_slug || null,
    },
  }, null, 2));
}

function parseTelemetrySummary(text) {
  const raw = String(text || '').trim();
  if (!raw) {
    return {};
  }

  return {
    raw,
    eventType: matchValue(raw, /event_type=([^\s]+)/),
    heartbeatCount: numberOrNull(matchValue(raw, /heartbeat_count=(\d+)/)),
    monitorId: parseQuotedOrWord(matchValue(raw, /monitor_id=([^\s]+)/)),
    status: parseQuotedOrWord(matchValue(raw, /status=([^\s]+)/)),
    command: parseQuotedOrWord(matchValue(raw, /command=("[^"]*"|\S+)(?:\s|$)/)),
    processSummary: parseQuotedOrWord(matchValue(raw, /process=("[^"]*"|\S+)(?:\s|$)/)),
    remoteWriteStatus: parseQuotedOrWord(matchValue(raw, /remote_write_status=([^\s]+)/)),
    detail: parseQuotedOrWord(matchValue(raw, /detail=("[^"]*"|\S+)(?:\s|$)/)),
    errorMessage: parseQuotedOrWord(matchValue(raw, /error=("[^"]*"|\S+)(?:\s|$)/)),
  };
}

function matchValue(text, pattern) {
  const match = String(text || '').match(pattern);
  return match ? match[1] : '';
}

function parseQuotedOrWord(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      return JSON.parse(text);
    } catch {
      return text.slice(1, -1);
    }
  }
  return text;
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
