import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { AIEngineClient } from './telemetry-client.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUTS_DIR = path.join(__dirname, '..', '.outputs');
const SPOIL_FILE = path.join(OUTPUTS_DIR, 'remote-telemetry-spool.json');

const argv = process.argv.slice(2);
const options = parseArgs(argv);
const command = options.command;
const repoPath = path.resolve(options.repoPath || process.cwd());
const repoPathHash = sha256(repoPath).slice(0, 16);
const hostId = options.hostId || os.hostname();
const machineId = options.machineId || hostId;
const monitorId = options.monitorId || `monitor:${hostId}:${process.pid}:${crypto.randomBytes(3).toString('hex')}`;
const heartbeatMs = Number(options.heartbeatMs || 5000);
const lingerMs = Number(options.lingerMs || 0);
const actorId = options.actorId || process.env.AI_ENGINE_ACTOR_ID || `monitor:${hostId}`;
const runtimeSessionId = options.runtimeSessionId || process.env.AI_ENGINE_TELEMETRY_RUNTIME_SESSION_ID || `runtime:${monitorId}`;
const explicitSessionId = cleanText(options.sessionId || process.env.AI_ENGINE_TELEMETRY_SESSION_ID);
const explicitProjectId = cleanText(options.projectId || process.env.AI_ENGINE_TELEMETRY_PROJECT_ID);
const explicitItemId = cleanText(options.itemId || process.env.AI_ENGINE_TELEMETRY_ITEM_ID);
const executionPurpose = options.executionPurpose || 'Publish remote execution telemetry heartbeats and semantic execution events from a repo-side monitor.';
const successCriteria = options.successCriteria || 'Remote watch surfaces expose heartbeat count, latest timestamp, and observed execution activity.';

const client = AIEngineClient.fromEnv();
const pendingFailures = await readSpool();

let active = null;
let implementationItemId = explicitItemId || null;
let workflowRunId = null;
let projectId = explicitProjectId || null;
let projectName = null;
let projectSlug = null;
let contextSessionId = explicitSessionId || null;
let heartbeatCount = 0;
let latestCommandSummary = command.length ? command.join(' ') : 'idle';
let child = null;
let stopping = false;
let heartbeatTimer = null;
let eventSequence = 0;

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

await bootstrap();
await emitEvent({
  event_type: 'monitor_heartbeat',
  status: 'running',
  remote_write_status: 'pending',
  heartbeat_count: heartbeatCount,
  command_summary: latestCommandSummary,
  detail: 'monitor-started',
});

if (command.length) {
  await emitEvent({
    event_type: 'shell_command_observed',
    command: command.join(' '),
    command_args: command.slice(1),
    process_summary: `spawn ${command.join(' ')}`,
    detail: 'command-observed',
  });
  await emitEvent({
    event_type: 'process_started',
    command: command.join(' '),
    process_summary: `pid=${process.pid} command=${command.join(' ')}`,
    detail: 'process-started',
  });

  child = spawn(command[0], command.slice(1), {
    cwd: repoPath,
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', async (code, signal) => {
    latestCommandSummary = `${command.join(' ')}${code === 0 ? ' (ok)' : ` (exit ${code ?? signal ?? 'unknown'})`}`;
    await emitEvent({
      event_type: code === 0 ? 'process_completed' : 'verification_retry_observed',
      command: command.join(' '),
      exit_code: code,
      signal,
      status: code === 0 ? 'completed' : 'retry',
      process_summary: `pid=${child.pid ?? 'unknown'} exit=${code ?? 'unknown'} signal=${signal ?? ''}`.trim(),
      detail: code === 0 ? 'process-completed' : 'process-retry-needed',
    });
    if (lingerMs > 0) {
      setTimeout(() => stop('linger elapsed'), lingerMs).unref?.();
    }
  });
}

heartbeatTimer = setInterval(() => {
  void emitEvent({
    event_type: 'monitor_heartbeat',
    status: child ? 'running' : 'idle',
    remote_write_status: 'pending',
    heartbeat_count: heartbeatCount,
    command_summary: latestCommandSummary,
    process_summary: child ? `child-pid=${child.pid ?? 'unknown'}` : 'idle',
    detail: 'heartbeat',
  });
}, heartbeatMs);

async function bootstrap() {
  if (!implementationItemId) {
    if (!explicitProjectId) {
      throw new Error('AI_ENGINE_TELEMETRY_PROJECT_ID or AI_ENGINE_TELEMETRY_ITEM_ID is required.');
    }
    active = await client.getProjectRoadmapActiveItem(explicitProjectId);
    implementationItemId = cleanText(active?.active_item?.implementation_item_id || active?.implementation_item_id);
    workflowRunId = cleanText(active?.active_item?.workflow_run_id || active?.workflow_run_id);
    projectId = cleanText(active?.active_item?.project_id || active?.project_id || explicitProjectId);
    projectName = cleanText(active?.active_item?.project_name || active?.project_name);
    projectSlug = cleanText(active?.active_item?.project_slug || active?.project_slug);
  } else if (!workflowRunId) {
    try {
      active = await client.getProjectRoadmapActiveItem(explicitProjectId || 'unknown');
      workflowRunId = cleanText(active?.active_item?.workflow_run_id || active?.workflow_run_id);
      projectId = cleanText(active?.active_item?.project_id || active?.project_id || explicitProjectId || null);
      projectName = cleanText(active?.active_item?.project_name || active?.project_name || '');
      projectSlug = cleanText(active?.active_item?.project_slug || active?.project_slug || '');
    } catch {
      workflowRunId = null;
    }
  }

  if (!implementationItemId) {
    throw new Error('Unable to resolve a telemetry sink implementation item.');
  }

  if (!contextSessionId) {
    const session = await client.openContextSession({
      agentId: actorId,
      runtimeSessionId,
      intentId: options.intentId || 'remote_execution_monitor',
      executionPurpose,
      notes: `repo monitor ${monitorId}`,
    });
    contextSessionId = cleanText(session?.context_session?.context_session_id);
    await client.completeOrientation(contextSessionId);
    await client.lockContextSessionClaim(contextSessionId);
  }

  console.log(JSON.stringify({
    monitor_id: monitorId,
    machine_id: machineId,
    process_id: process.pid,
    repo_path: repoPath,
    repo_path_hash: repoPathHash,
    project_id: projectId || null,
    project_name: projectName || null,
    project_slug: projectSlug || null,
    implementation_item_id: implementationItemId,
    workflow_run_id: workflowRunId || null,
    session_id: contextSessionId || explicitSessionId || null,
    runtime_session_id: runtimeSessionId,
  }, null, 2));
}

async function emitEvent(event) {
  const eventType = cleanText(event.event_type) || 'monitor_heartbeat';
  const timestamp = new Date().toISOString();

  const envelope = {
    event_type: eventType,
    kind: eventType,
    timestamp,
    monitor_id: monitorId,
    machine_id: machineId,
    host_id: hostId,
    process_id: process.pid,
    repo_path: repoPath,
    repo_path_hash: repoPathHash,
    session_id: contextSessionId || explicitSessionId || runtimeSessionId,
    workflow_run_id: workflowRunId || null,
    project_id: projectId || null,
    project_name: projectName || null,
    project_slug: projectSlug || null,
    implementation_item_id: implementationItemId,
    remote_write_status: 'attempting',
    heartbeat_count: eventType === 'monitor_heartbeat' ? heartbeatCount + 1 : heartbeatCount,
    command: event.command || command.join(' '),
    command_args: event.command_args || command.slice(1),
    command_summary: event.command_summary || latestCommandSummary,
    process_summary: event.process_summary || '',
    status: event.status || 'observed',
    detail: event.detail || '',
    exit_code: event.exit_code ?? null,
    signal: event.signal ?? null,
    error_message: event.error_message || '',
    payload: event,
    sequence: ++eventSequence,
  };

  if (eventType === 'monitor_heartbeat') {
    heartbeatCount += 1;
    envelope.heartbeat_count = heartbeatCount;
  } else {
    envelope.heartbeat_count = heartbeatCount;
  }

  latestCommandSummary = envelope.command_summary || latestCommandSummary;

  const assistantSummary = [
    `event_type=${envelope.event_type}`,
    `heartbeat_count=${envelope.heartbeat_count}`,
    `monitor_id=${envelope.monitor_id}`,
    `status=${envelope.status}`,
    `command=${JSON.stringify(envelope.command)}`,
    `process=${JSON.stringify(envelope.process_summary || '')}`,
    `remote_write_status=${envelope.remote_write_status}`,
    `timestamp=${envelope.timestamp}`,
    envelope.detail ? `detail=${JSON.stringify(envelope.detail)}` : null,
    envelope.error_message ? `error=${JSON.stringify(envelope.error_message)}` : null,
  ].filter(Boolean).join(' ');

  const requestBody = {
    project_id: projectId || undefined,
    workflow_run_id: workflowRunId || undefined,
    session_key: contextSessionId || runtimeSessionId,
    user_request: event.detail || eventType,
    assistant_summary: assistantSummary,
    current_objective: executionPurpose,
    changed_files: [],
    metadata: {
      monitor_id: envelope.monitor_id,
      machine_id: envelope.machine_id,
      process_id: envelope.process_id,
      repo_path: envelope.repo_path,
      repo_path_hash: envelope.repo_path_hash,
      project_id: envelope.project_id,
      project_name: envelope.project_name,
      project_slug: envelope.project_slug,
      implementation_item_id: envelope.implementation_item_id,
      workflow_run_id: envelope.workflow_run_id,
      context_session_id: contextSessionId || explicitSessionId || null,
      runtime_session_id: runtimeSessionId,
      event_type: envelope.event_type,
      heartbeat_count: envelope.heartbeat_count,
      command_summary: envelope.command_summary,
      process_summary: envelope.process_summary,
      remote_write_status: envelope.remote_write_status,
      detail: envelope.detail,
      execution_purpose: executionPurpose,
      success_criteria: successCriteria,
      event_sequence: envelope.sequence,
    },
  };

  try {
    await flushPending();
    const response = await client.persistAssistantTurn(requestBody);
    console.log(`[remote] ${envelope.event_type} heartbeat=${heartbeatCount} monitor=${monitorId}`);
    return response;
  } catch (error) {
    const failure = {
      ...envelope,
      event_type: 'remote_publish_failed',
      kind: 'remote_publish_failed',
      failed_event_type: envelope.event_type,
      error_message: error?.message || 'Unknown publish failure',
      remote_write_status: 'failed',
      recorded_at: new Date().toISOString(),
    };
    console.warn(`[remote publish failed] ${failure.failed_event_type}: ${failure.error_message}`);
    await enqueueFailure(failure);
    return null;
  }
}

async function flushPending() {
  if (!pendingFailures.length) return;
  while (pendingFailures.length) {
    const failure = pendingFailures[0];
    await client.persistAssistantTurn({
      project_id: projectId || undefined,
      workflow_run_id: workflowRunId || undefined,
      session_key: contextSessionId || runtimeSessionId,
      user_request: failure.detail || failure.failed_event_type || 'remote_publish_failed',
      assistant_summary: [
        `event_type=${failure.event_type}`,
        `heartbeat_count=${failure.heartbeat_count}`,
        `monitor_id=${failure.monitor_id}`,
        `status=${failure.status}`,
        `command=${JSON.stringify(failure.command)}`,
        `process=${JSON.stringify(failure.process_summary || '')}`,
        `remote_write_status=${failure.remote_write_status}`,
        `timestamp=${failure.recorded_at || failure.timestamp || new Date().toISOString()}`,
        `failed_event_type=${JSON.stringify(failure.failed_event_type)}`,
        `error=${JSON.stringify(failure.error_message)}`,
      ].join(' '),
      current_objective: executionPurpose,
      changed_files: [],
      metadata: {
        monitor_id: failure.monitor_id,
        machine_id: failure.machine_id,
        process_id: failure.process_id,
        repo_path: failure.repo_path,
        repo_path_hash: failure.repo_path_hash,
        project_id: failure.project_id,
        project_name: failure.project_name,
        project_slug: failure.project_slug,
        implementation_item_id: failure.implementation_item_id,
        workflow_run_id: failure.workflow_run_id,
        context_session_id: contextSessionId || explicitSessionId || null,
        runtime_session_id: runtimeSessionId,
        event_type: failure.event_type,
        heartbeat_count: failure.heartbeat_count,
        command_summary: failure.command_summary,
        process_summary: failure.process_summary,
        remote_write_status: failure.remote_write_status,
        detail: failure.detail,
        error_message: failure.error_message,
        execution_purpose: executionPurpose,
        success_criteria: successCriteria,
      },
    });
    pendingFailures.shift();
    await writeSpool(pendingFailures);
    console.log(`[remote] flushed pending failure event: ${failure.failed_event_type}`);
  }
}

async function enqueueFailure(failure) {
  pendingFailures.push(failure);
  await writeSpool(pendingFailures);
}

async function stop(reason) {
  if (stopping) return;
  stopping = true;
  clearInterval(heartbeatTimer);
  try {
    await emitEvent({
      event_type: 'process_completed',
      status: 'stopping',
      detail: reason,
      process_summary: `monitor-stopped:${reason}`,
      command: command.join(' '),
    });
  } catch (error) {
    console.warn(`Failed to emit shutdown event: ${error.message}`);
  }
  process.exit(0);
}

async function writeSpool(items) {
  await fs.mkdir(OUTPUTS_DIR, { recursive: true });
  await fs.writeFile(SPOIL_FILE, JSON.stringify(items, null, 2), 'utf8');
}

async function readSpool() {
  try {
    const raw = await fs.readFile(SPOIL_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseArgs(values) {
  const result = { command: [] };
  for (const value of values) {
    if (value.startsWith('--project-id=')) result.projectId = value.slice('--project-id='.length);
    else if (value.startsWith('--item-id=')) result.itemId = value.slice('--item-id='.length);
    else if (value.startsWith('--repo-path=')) result.repoPath = value.slice('--repo-path='.length);
    else if (value.startsWith('--heartbeat-ms=')) result.heartbeatMs = value.slice('--heartbeat-ms='.length);
    else if (value.startsWith('--linger-ms=')) result.lingerMs = value.slice('--linger-ms='.length);
    else if (value.startsWith('--session-id=')) result.sessionId = value.slice('--session-id='.length);
    else if (value.startsWith('--runtime-session-id=')) result.runtimeSessionId = value.slice('--runtime-session-id='.length);
    else if (value.startsWith('--monitor-id=')) result.monitorId = value.slice('--monitor-id='.length);
    else if (value.startsWith('--host-id=')) result.hostId = value.slice('--host-id='.length);
    else if (value.startsWith('--machine-id=')) result.machineId = value.slice('--machine-id='.length);
    else if (value.startsWith('--actor-id=')) result.actorId = value.slice('--actor-id='.length);
    else if (value.startsWith('--execution-purpose=')) result.executionPurpose = value.slice('--execution-purpose='.length);
    else if (value.startsWith('--success-criteria=')) result.successCriteria = value.slice('--success-criteria='.length);
    else if (value.startsWith('--')) continue;
    else result.command.push(value);
  }
  return result;
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
}
