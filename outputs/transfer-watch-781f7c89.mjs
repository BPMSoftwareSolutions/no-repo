import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';
const client = new AIEngineClient({ baseUrl: process.env.AI_ENGINE_BASE_URL, apiKey: process.env.AI_ENGINE_API_KEY });
const threadId = '651669c6-2919-4eef-a397-4f9a0145852b';
const packetId = '781f7c89-b7e7-497f-9cc0-539117c0a691';
const workflowRunId = '8ce21af6-d28f-4434-baa7-05a590483497';
const recipientRoleKey = 'ai-engine-agent';
const cycles = 20;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
for (let i = 1; i <= cycles; i++) {
  const ts = new Date().toISOString();
  try {
    const [thread, packet, home, inbox] = await Promise.all([
      client.getCommunicationThread(threadId),
      client.getLogaTransferPacketProjection(packetId),
      client.getLogaTransferHomeProjection(),
      client.listCommunicationInbox({ workflowRunId, recipientRoleKey }),
    ]);
    const latest = Array.isArray(thread.messages) && thread.messages.length ? thread.messages[thread.messages.length - 1] : null;
    console.log(JSON.stringify({
      cycle: i,
      timestamp: ts,
      thread: {
        status: thread.status,
        waiting_state: thread.waiting_state,
        message_count: thread.message_count,
        latest_message_kind: latest?.kind || latest?.message_kind || null,
        latest_message_status: latest?.status || latest?.message_status || null,
        latest_message_id: latest?.agent_message_id || latest?.id || null,
      },
      packet: {
        projectionType: packet.projectionType,
        preview: String(packet.text || '').slice(0, 180),
      },
      home: {
        projectionType: home.projectionType,
        preview: String(home.text || '').slice(0, 120),
      },
      inboxCount: Array.isArray(inbox?.items) ? inbox.items.length : (Array.isArray(inbox) ? inbox.length : null),
    }));
  } catch (error) {
    console.log(JSON.stringify({ cycle: i, timestamp: ts, error: error?.message || String(error) }));
  }
  if (i < cycles) await sleep(10000);
}