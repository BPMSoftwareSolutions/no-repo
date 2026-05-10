import fs from 'node:fs/promises';
import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';

const baseUrl = process.env.AI_ENGINE_BASE_URL;
const apiKey = process.env.AI_ENGINE_API_KEY;
const channelId = '45ee885a-6e19-4fc5-8ecf-7e2a203e28b9';
const packetId = '781f7c89-b7e7-497f-9cc0-539117c0a691';
const workflowRunId = '8ce21af6-d28f-4434-baa7-05a590483497';
const senderAgentSessionId = 'ebe956c0-6285-463a-b81e-5292c779f194';
const pollMs = 10000;
const maxCycles = Number(process.env.PERSISTENT_COLLAB_MAX_CYCLES || 0);
const staleAfterSeconds = 60;
let lastSignature = '';
const client = AIEngineClient.fromEnv();
const headers = { 'X-API-Key': apiKey };
async function getJson(path) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 200)}`);
  return JSON.parse(text);
}
async function getText(path) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 200)}`);
  return text;
}
async function write(line) {
  await fs.appendFile('C:/source/repos/bpm/internal/no-repo/outputs/persistent-collab-watch.log', `${line}\n`);
}
async function writeCurrentSnapshot(snapshot) {
  const jsonPath = 'C:/source/repos/bpm/internal/no-repo/outputs/persistent-collab-current.json';
  const mdPath = 'C:/source/repos/bpm/internal/no-repo/outputs/persistent-collab-current.md';
  const md = `# Persistent Collaboration Current State\n\n` +
    `- checked_at: ${snapshot.checked_at}\n` +
    `- channel_status: ${snapshot.channel_status ?? 'unavailable'}\n` +
    `- waiting: ${snapshot.waiting ?? 'unavailable'}\n` +
    `- latest_message_kind: ${snapshot.latest_message_kind ?? 'unavailable'}\n` +
    `- latest_message_at: ${snapshot.latest_message_at ?? 'unavailable'}\n` +
    `- participant_state: ${snapshot.participant_state ?? 'unavailable'}\n` +
    `- proposal_state: ${snapshot.proposal_state ?? 'unavailable'}\n` +
    `- agreement_count: ${snapshot.agreement_count ?? 'unavailable'}\n` +
    `- packet_lifecycle: ${snapshot.packet_lifecycle ?? 'unavailable'}\n` +
    `- packet_waiting: ${snapshot.packet_waiting ?? 'unavailable'}\n` +
    `- primitive: ${snapshot.primitive ?? 'unavailable'}\n` +
    `- fallback_level: ${snapshot.fallback_level ?? 'unavailable'}\n` +
    `- next_action: ${snapshot.next_action ?? 'unavailable'}\n` +
    `- human_action_required: ${snapshot.human_action_required ?? 'unavailable'}\n` +
    (snapshot.error ? `- error: ${snapshot.error}\n` : '');
  await fs.writeFile(jsonPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  await fs.writeFile(mdPath, md);
}
async function writeMessageWatchSnapshot(snapshot) {
  const jsonPath = 'C:/source/repos/bpm/internal/no-repo/outputs/persistent-message-watch-current.json';
  const mdPath = 'C:/source/repos/bpm/internal/no-repo/outputs/persistent-message-watch-current.md';
  const connectedPeers = (snapshot.connected_peers || []).map((peer) => `- ${peer.participant_role}: ${peer.participant_state} (${peer.participant_label})`).join('\n');
  const md = `# Message Bus Watch\n\n` +
    `- checked_at: ${snapshot.last_checked_at}\n` +
    `- watch_type: ${snapshot.watch_type}\n` +
    `- channel_id: ${snapshot.channel_id}\n` +
    `- watching_agent_role: ${snapshot.watching_agent_role}\n` +
    `- waiting_for: ${snapshot.expected_from_role}\n` +
    `- expected_message_kind: ${snapshot.expected_message_kind}\n` +
    `- status: ${snapshot.current_status}\n` +
    `- last_seen_message_id: ${snapshot.last_seen_message_id ?? 'unavailable'}\n` +
    `- last_seen_message_kind: ${snapshot.last_seen_message_kind ?? 'unavailable'}\n` +
    `- last_seen_message_at: ${snapshot.last_seen_message_at ?? 'unavailable'}\n` +
    `- age_seconds: ${snapshot.age_seconds ?? 'unavailable'}\n` +
    `- stale_after_seconds: ${snapshot.stale_after_seconds}\n` +
    `- stale_in_seconds: ${snapshot.stale_in_seconds ?? 'unavailable'}\n` +
    `- operator_nudge: ${snapshot.operator_nudge}\n` +
    `- current_status: ${snapshot.current_status}\n` +
    `- workflow_primitive: ${snapshot.workflow_primitive ?? 'unavailable'}\n` +
    `- connection_status: ${snapshot.connection_status ?? 'unavailable'}\n` +
    `- message_watch_id: ${snapshot.message_watch_id ?? 'unavailable'}\n` +
    `- continuity_runner_id: ${snapshot.continuity_runner_id ?? 'unavailable'}\n` +
    `- runner_state: ${snapshot.runner_state ?? 'unavailable'}\n` +
    `- proposal_id: ${snapshot.expected_payload?.proposal_id ?? 'unavailable'}\n` +
    `- allowed_decisions: ${(snapshot.expected_payload?.allowed_decisions || []).join(', ') || 'unavailable'}\n` +
    `- required_evidence: ${(snapshot.expected_payload?.required_evidence || []).join(', ') || 'unavailable'}\n` +
    (connectedPeers ? `\n## Connected Peers\n${connectedPeers}\n` : '') +
    (snapshot.error ? `\n- error: ${snapshot.error}\n` : '');
  await fs.writeFile(jsonPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  await fs.writeFile(mdPath, md);
}
async function postChannelStatus(kind, bodyMarkdown, payload) {
  const res = await fetch(`${baseUrl}/api/agent-communications/transfer-channels/${channelId}/messages`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transfer_channel_id: channelId,
      work_transfer_packet_id: packetId,
      workflow_run_id: workflowRunId,
      sender_agent_session_id: senderAgentSessionId,
      message_kind: kind,
      body_markdown: bodyMarkdown,
      payload,
      metadata: {
        source: 'persistent_channel_participant',
        collaboration_context: 'execution_telemetry_modernization',
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 200)}`);
  return text;
}
async function connectWithSdk({ proposalId, expectedMessageKind, expectedPayload, operatorNudge, phase, currentTaskSummary, lastSeenMessageId, lastCheckedAt }) {
  return client.collaboration.connectToTransferChannel({
    transferChannelId: channelId,
    workTransferPacketId: packetId,
    workflowRunId,
    participantRole: 'downstream',
    expectedPeerRole: 'upstream',
    expectedMessageKind,
    proposalId,
    mode: 'communication_participant',
    participantLabel: 'downstream',
    agentSessionId: senderAgentSessionId,
    phase,
    currentTaskSummary,
    expectedPayload,
    lastSeenMessageId,
    lastCheckedAt,
    staleAfterSeconds,
    operatorNudge,
    observedAt: new Date().toISOString(),
    metadata: {
      source: 'persistent_channel_participant',
      collaboration_context: 'execution_telemetry_modernization',
      workflow_primitive: 'connectToTransferChannel',
    },
  });
}
for (let cycle = 1; maxCycles === 0 || cycle <= maxCycles; cycle++) {
  const stamp = new Date().toISOString();
  try {
    const channel = await getJson(`/api/agent-communications/transfer-channels/${channelId}`);
    const packetText = await getText(`/api/operator/projections/transfers/${packetId}`);
    const latestMessage = channel.messages?.[channel.messages.length - 1] || null;
    const signature = JSON.stringify({
      status: channel.channel_status,
      waiting: channel.current_waiting_side,
      latestId: latestMessage?.transfer_channel_message_id || latestMessage?.message_id || latestMessage?.id || null,
      latestKind: latestMessage?.message_kind || latestMessage?.kind || null,
      latestAt: channel.latest_message_at || null,
      proposalState: channel.collaboration_proposals?.[0]?.proposal_state || null,
      agreementCount: channel.collaboration_agreements?.length || 0,
      packetState: packetText.slice(0, 120),
    });
    const changed = signature !== lastSignature;
    lastSignature = signature;
    const waiting = channel.current_waiting_side || 'upstream';
    const phase = channel.channel_status === 'active_dialogue' ? (waiting === 'upstream' ? 'waiting' : 'working') : 'waiting';
    const currentPrimitive = 'connectToTransferChannel';
    const fallbackLevel = 1;
    const proposalId = channel.collaboration_proposals?.[0]?.collaboration_proposal_id || null;
    const connectedPeers = (channel.collaboration_participants || []).map((peer) => ({
      participant_role: peer.participant_role,
      participant_state: peer.participant_state,
      participant_label: peer.participant_label,
    }));
    const lastSeenMessageId = latestMessage?.transfer_channel_message_id || latestMessage?.message_id || latestMessage?.id || null;
    const lastSeenMessageKind = latestMessage?.message_kind || latestMessage?.kind || null;
    const lastSeenMessageAt = channel.latest_message_at || null;
    const lastSeenAgeSeconds = lastSeenMessageAt ? Math.max(0, Math.floor((Date.now() - Date.parse(lastSeenMessageAt)) / 1000)) : null;
    const staleInSeconds = lastSeenAgeSeconds === null ? null : Math.max(0, staleAfterSeconds - lastSeenAgeSeconds);
    const watchCurrentStatus = ['active_dialogue', 'waiting_on_upstream', 'waiting_on_downstream'].includes(channel.channel_status)
      ? (lastSeenAgeSeconds !== null && lastSeenAgeSeconds > staleAfterSeconds ? 'stale' : 'waiting')
      : (channel.channel_status === 'closed' ? 'expired' : 'blocked');
    const expectedFromRole = waiting;
    const expectedMessageKind = waiting === 'upstream' ? 'evidence_response' : 'review_proposal_response';
    const expectedPayload = waiting === 'upstream'
      ? {
          proposal_id: proposalId,
          required_evidence: ['patch_summary', 'validation_commands', 'package_version_target'],
        }
      : {
          proposal_id: proposalId,
          allowed_decisions: ['accept', 'revise', 'reject'],
        };
    const operatorNudge = waiting === 'upstream'
      ? `Upstream, please send evidence_response or blocker for proposal ${proposalId || 'unknown'}.`
      : `Downstream, please accept, revise, or reject proposal ${proposalId || 'unknown'}.`;
    const nextAction = waiting === 'upstream'
      ? `await ${expectedMessageKind} from upstream`
      : `await ${expectedMessageKind} from downstream`;
    const humanActionRequired = false;
    const packetLifecycle = /Lifecycle State:\s*(.+)$/m.exec(packetText)?.[1] || null;
    const packetWaiting = /Waiting on Evidence:\s*(.+)$/m.exec(packetText)?.[1] || null;
    const messageWatch = {
      watch_type: 'expected_peer_message',
      channel_id: channelId,
      watching_agent_role: 'downstream',
      expected_from_role: expectedFromRole,
      expected_message_kind: expectedMessageKind,
      expected_payload: expectedPayload,
      last_seen_message_id: lastSeenMessageId,
      last_seen_message_kind: lastSeenMessageKind,
      last_seen_message_at: lastSeenMessageAt,
      last_checked_at: stamp,
      stale_after_seconds: staleAfterSeconds,
      age_seconds: lastSeenAgeSeconds,
      stale_in_seconds: staleInSeconds,
      current_status: watchCurrentStatus,
      operator_nudge: operatorNudge,
      connected_peers: connectedPeers,
    };
    const sdkConnection = await connectWithSdk({
      proposalId,
      expectedMessageKind,
      expectedPayload,
      operatorNudge,
      phase: 'message_bus_watch',
      currentTaskSummary: `Connected and watching for ${expectedMessageKind} from ${expectedFromRole}.`,
      lastSeenMessageId,
      lastCheckedAt: stamp,
    });
    messageWatch.message_watch_id = sdkConnection?.message_watch_id || sdkConnection?.message_watch?.message_watch_id || null;
    messageWatch.workflow_primitive = sdkConnection?.workflow_primitive || 'connectToTransferChannel';
    messageWatch.connection_status = sdkConnection?.connection_status || null;
    messageWatch.continuity_runner_id = sdkConnection?.collaboration_continuity_runner?.continuity_runner_id || null;
    messageWatch.runner_state = sdkConnection?.collaboration_continuity_runner?.runner_state || null;
    messageWatch.next_retry_action = sdkConnection?.collaboration_continuity_runner?.next_retry_action || null;
    const statusPayload = {
      phase,
      heartbeat: true,
      connected: true,
      current_primitive: currentPrimitive,
      fallback_level: fallbackLevel,
      next_expected_action: nextAction,
      human_action_required: humanActionRequired,
      channel_status: channel.channel_status,
      current_waiting_side: waiting,
      latest_message_kind: latestMessage?.message_kind || latestMessage?.kind || null,
      proposal_state: channel.collaboration_proposals?.[0]?.proposal_state || null,
      agreement_state: channel.collaboration_agreements?.[0]?.agreement_state || null,
      message_watch: messageWatch,
    };
    await writeCurrentSnapshot({
      checked_at: stamp,
      channel_status: channel.channel_status,
      waiting,
      latest_message_kind: latestMessage?.message_kind || latestMessage?.kind || null,
      latest_message_at: channel.latest_message_at || null,
      participant_state: channel.collaboration_participants?.[0]?.participant_state || null,
      proposal_state: channel.collaboration_proposals?.[0]?.proposal_state || null,
      agreement_count: channel.collaboration_agreements?.length || 0,
      packet_lifecycle: packetLifecycle,
      packet_waiting: packetWaiting,
      primitive: currentPrimitive,
      fallback_level: fallbackLevel,
      next_action: nextAction,
      human_action_required: humanActionRequired,
      message_watch: messageWatch,
    });
    await writeMessageWatchSnapshot(messageWatch);
    await write(JSON.stringify({
      cycle,
      stamp,
      changed,
      channel_status: channel.channel_status,
      waiting,
      latest_message_kind: latestMessage?.message_kind || latestMessage?.kind || null,
      latest_message_at: channel.latest_message_at || null,
      proposal_state: channel.collaboration_proposals?.[0]?.proposal_state || null,
      primitive: currentPrimitive,
      fallback_level: fallbackLevel,
      next_action: nextAction,
      human_action_required: humanActionRequired,
      message_watch_id: messageWatch.message_watch_id,
      continuity_runner_id: messageWatch.continuity_runner_id,
      connection_status: messageWatch.connection_status,
    }));
  } catch (error) {
    const message = error?.message || String(error);
    await writeCurrentSnapshot({
      checked_at: stamp,
      channel_status: null,
      waiting: null,
      latest_message_kind: null,
      latest_message_at: null,
      participant_state: null,
      proposal_state: null,
      agreement_count: null,
      packet_lifecycle: null,
      packet_waiting: null,
      primitive: 'transfer-channel-message',
      fallback_level: 3,
      next_action: 'inspect and repair the watcher or substrate',
      human_action_required: false,
      error: message,
      message_watch: {
        watch_type: 'expected_peer_message',
        channel_id: channelId,
        watching_agent_role: 'downstream',
        expected_from_role: 'upstream',
        expected_message_kind: 'evidence_response',
        expected_payload: {},
        last_seen_message_id: null,
        last_seen_message_kind: null,
        last_seen_message_at: null,
        last_checked_at: stamp,
        stale_after_seconds: staleAfterSeconds,
        age_seconds: null,
        stale_in_seconds: null,
        current_status: 'blocked',
        operator_nudge: 'Watcher or substrate unavailable.',
        connected_peers: [],
      },
    });
    await write(JSON.stringify({ cycle, stamp, error: message, phase: 'blocker' }));
    try {
      await postChannelStatus(
        'blocker',
        `Blocker: persistent continuity loop encountered an error. Current primitive: transfer-channel-message. Fallback level: 3. Next expected action: inspect and repair the watcher. Human action required: no.`,
        {
          phase: 'blocker',
          heartbeat: true,
          connected: false,
          current_primitive: 'transfer-channel-message',
          fallback_level: 3,
          next_expected_action: 'inspect and repair the watcher',
          human_action_required: false,
          error: message,
        },
      );
    } catch (secondaryError) {
      await write(JSON.stringify({ cycle, stamp, blocker_post_error: secondaryError?.message || String(secondaryError) }));
    }
  }
  if (cycle < maxCycles) await new Promise((resolve) => setTimeout(resolve, pollMs));
}
