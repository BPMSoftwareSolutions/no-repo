import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';

async function run() {
  const client = AIEngineClient.fromEnv();
  console.log('--- FETCHING AVAILABLE IDS ---');
  let projectId, roadmapItemKey, workflowRunId, evidencePacketKey;

  try {
    const projects = await client.listProjects();
    projectId = projects.projects[0]?.project_id;
    console.log(`Found Project ID: ${projectId}`);
  } catch (e) { console.error('Failed to list projects', e.message); }

  if (projectId) {
    try {
      const summary = await client.getExternalProjectRoadmapSummary(projectId);
      roadmapItemKey = summary.items?.[0]?.item_key;
      console.log(`Found Roadmap Item Key: ${roadmapItemKey}`);
    } catch (e) { console.error('Failed to get roadmap', e.message); }
  }

  try {
    const workflows = await client.listWorkflows();
    const wfId = workflows.workflows[0]?.workflow_id;
    if (wfId) {
      const runs = await client._request(`/api/v1/workflows/${wfId}/runs`).catch(()=>null);
      workflowRunId = runs?.runs?.[0]?.run_id;
      console.log(`Found Workflow Run ID: ${workflowRunId}`);
    }
  } catch (e) { console.error('Failed to get workflows', e.message); }

  console.log('\n--- A. OPERATOR HOME PROJECTION ---');
  try {
    const res = await client.getLogaOperatorHomeProjection();
    console.log(res.text.substring(0, 1000));
  } catch (e) { console.error('Error:', e.message); }

  console.log('\n--- B. PROJECT CATALOG PROJECTION ---');
  try {
    const res = await client.getLogaProjectCatalogProjection();
    console.log(res.text.substring(0, 1000));
  } catch (e) { console.error('Error:', e.message); }

  if (projectId) {
    console.log('\n--- C.1 PROJECT ROADMAP PROJECTION ---');
    try {
      const res = await client.getLogaProjectRoadmapProjection(projectId);
      console.log(res.text.substring(0, 1000));
    } catch (e) { console.error('Error:', e.message); }
  }

  if (roadmapItemKey) {
    console.log('\n--- C.2 ROADMAP ITEM PROJECTION ---');
    try {
      const res = await client.getLogaRoadmapItemProjection(roadmapItemKey);
      console.log(res.text.substring(0, 1000));
    } catch (e) { console.error('Error:', e.message); }
  }

  if (workflowRunId) {
    console.log('\n--- D. WORKFLOW RUN PROJECTION ---');
    try {
      const res = await client.getLogaWorkflowRunProjection(workflowRunId);
      console.log(res.text.substring(0, 1000));
    } catch (e) { console.error('Error:', e.message); }
  }
}

run().catch(console.error);
