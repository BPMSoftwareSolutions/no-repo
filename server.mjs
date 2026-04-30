import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, 'src');
const DOCS_DIR = path.join(__dirname, 'docs');

const client = AIEngineClient.fromEnv();

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.md': 'text/markdown'
};

const server = http.createServer(async (req, res) => {
  console.log(`[${req.method}] ${req.url}`);
  const requestUrl = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (req.method === 'GET' && pathname === '/api/loga/tree') {
    sendJson(res, buildLogaTreeRoot());
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/loga/tree/nodes/') && pathname.endsWith('/children')) {
    const nodeId = pathname.slice('/api/loga/tree/nodes/'.length, -'/children'.length);
    try {
      sendJson(res, await buildLogaTreeChildren(nodeId));
    } catch (error) {
      console.error(`Tree API Error:`, error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message, stack: error.stack }));
    }
    return;
  }

  if (pathname === '/api/ai-engine') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const { method, args } = payload;
          
          if (typeof client[method] !== 'function') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Method ${method} not found on client` }));
            return;
          }

          const result = await client[method](...(args || []));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result }));
        } catch (error) {
          console.error(`API Error:`, error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message, stack: error.stack }));
        }
      });
      return;
    }
  }

  let filePath = path.join(SRC_DIR, pathname === '/' ? 'html/playground.html' : pathname);

  if (pathname.startsWith('/docs/')) {
    filePath = path.join(DOCS_DIR, pathname.slice('/docs/'.length));
  }
  
  // Quick hack to map extensions to right directory structure if requested linearly
  if (!pathname.startsWith('/docs/') && pathname.endsWith('.html') && !pathname.startsWith('/html')) {
    filePath = path.join(SRC_DIR, 'html', pathname);
  } else if (!pathname.startsWith('/docs/') && pathname.endsWith('.css') && !pathname.startsWith('/css')) {
    filePath = path.join(SRC_DIR, 'css', pathname);
  } else if (!pathname.startsWith('/docs/') && pathname.endsWith('.js') && !pathname.startsWith('/js')) {
    filePath = path.join(SRC_DIR, 'js', pathname);
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';
    
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404);
      res.end('404 Not Found');
    } else {
      res.writeHead(500);
      res.end('500 Internal Server Error');
    }
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Open http://localhost:${PORT}/playground.html to see the UI`);
});

function sendJson(res, payload) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function buildLogaTreeRoot() {
  return {
    tree_id: 'ai-engine-inspection',
    nodes: [
      treeNode({
        id: 'projections',
        label: 'Projections',
        type: 'surface_group',
        status: 'valid',
        hasChildren: true,
      }),
      treeNode({
        id: 'repositories',
        label: 'Repositories',
        type: 'surface_group',
        hasChildren: true,
        contentHref: 'repositories.html',
      }),
      treeNode({
        id: 'patterns',
        label: 'Patterns / Anti-patterns',
        type: 'surface_group',
        hasChildren: true,
        contentHref: 'patterns.html',
      }),
    ],
  };
}

async function buildLogaTreeChildren(nodeId) {
  if (nodeId === 'projections') {
    return {
      parent_id: nodeId,
      nodes: [
        treeNode({
          id: 'operator-home',
          label: 'Operator Home',
          type: 'projection_surface',
          meta: '1 projection',
          projectionType: 'operator.home',
          contentHref: 'projection-detail.html?type=operator.home',
          contentUrl: '/api/loga/projections/operator-home',
        }),
        treeNode({
          id: 'project-catalog',
          label: 'Project Catalog',
          type: 'projection_surface',
          meta: '1 projection',
          projectionType: 'operator.project_catalog',
          contentHref: 'projection-detail.html?type=operator.project_catalog',
          contentUrl: '/api/loga/projections/project-catalog',
        }),
        treeNode({
          id: 'project-surfaces',
          label: 'Project Surfaces',
          type: 'projection_group',
          meta: 'projects',
          hasChildren: true,
        }),
        treeNode({
          id: 'workflow-surfaces',
          label: 'Workflow Surfaces',
          type: 'projection_group',
          hasChildren: true,
        }),
        treeNode({
          id: 'system-surfaces',
          label: 'System Surfaces',
          type: 'projection_group',
          hasChildren: true,
        }),
      ],
    };
  }

  if (nodeId === 'project-surfaces') {
    const projects = await loadProjects();
    return {
      parent_id: nodeId,
      nodes: [
        treeNode({
          id: 'project-detail-group',
          label: 'Project Detail',
          type: 'projection_group',
          meta: `${projects.length} projects`,
          contentHref: 'projection-group.html?surface=operator.project_detail',
        }),
        treeNode({
          id: 'project-roadmap-group',
          label: 'Project Roadmap',
          type: 'projection_group',
          meta: `${projects.length} roadmaps`,
          contentHref: 'projection-group.html?surface=operator.project_roadmap',
        }),
        ...projects.map((project) => {
          const projectId = getProjectId(project);
          return treeNode({
            id: `project-${projectId}`,
            label: getProjectLabel(project),
            type: 'project',
            status: getProjectStatus(project),
            hasChildren: true,
          });
        }),
      ],
    };
  }

  if (nodeId.startsWith('project-') && !nodeId.includes('-roadmap') && !nodeId.endsWith('-current-focus')) {
    const projectId = nodeId.slice('project-'.length);
    return buildProjectChildren(nodeId, projectId);
  }

  if (nodeId.startsWith('project-') && nodeId.endsWith('-roadmap')) {
    const projectId = nodeId.slice('project-'.length, -'-roadmap'.length);
    return buildRoadmapChildren(nodeId, projectId);
  }

  if (nodeId.startsWith('project-') && nodeId.endsWith('-current-focus')) {
    const projectId = nodeId.slice('project-'.length, -'-current-focus'.length);
    return buildCurrentFocusChildren(nodeId, projectId);
  }

  if (nodeId.startsWith('project-') && nodeId.endsWith('-roadmap-items')) {
    const projectId = nodeId.slice('project-'.length, -'-roadmap-items'.length);
    return buildRoadmapItemsChildren(nodeId, projectId);
  }

  if (nodeId.includes('-roadmap-item-')) {
    return buildRoadmapItemChildren(nodeId);
  }

  if (nodeId === 'workflow-surfaces') {
    return {
      parent_id: nodeId,
      nodes: [
        treeNode({
          id: 'project-ai-engine-workflow-runs',
          label: 'Active Runs',
          type: 'runtime_surface',
          contentHref: 'projection-detail.html?type=operator.workflow_runs&projectId=ai-engine',
        }),
        treeNode({
          id: 'project-ai-engine-completed-runs',
          label: 'Completed Runs',
          type: 'runtime_surface',
          contentHref: 'projection-detail.html?type=operator.workflow_runs&projectId=ai-engine',
        }),
      ],
    };
  }

  if (nodeId === 'system-surfaces') {
    return {
      parent_id: nodeId,
      nodes: [
        treeNode({
          id: 'project-ai-engine-promotions',
          label: 'Promotions',
          type: 'promotion_surface',
          contentHref: 'projection-detail.html?type=operator.promotions&projectId=ai-engine',
        }),
        treeNode({
          id: 'project-ai-engine-cicd',
          label: 'CI/CD',
          type: 'runtime_surface',
          contentHref: 'projection-detail.html?type=operator.cicd_status&projectId=ai-engine',
        }),
        treeNode({
          id: 'project-ai-engine-agent-session',
          label: 'Agent Sessions',
          type: 'runtime_surface',
          contentHref: 'projection-detail.html?type=operator.agent_session&projectId=ai-engine',
        }),
      ],
    };
  }

  if (nodeId === 'repositories') {
    return {
      parent_id: nodeId,
      nodes: [
        treeNode({
          id: 'repository-catalog',
          label: 'Repository Catalog',
          type: 'repository_surface',
          contentHref: 'repositories.html',
        }),
        treeNode({
          id: 'code-intelligence',
          label: 'Code Intelligence',
          type: 'repository_surface',
          contentHref: 'code-intelligence.html',
        }),
      ],
    };
  }

  if (nodeId === 'patterns') {
    return {
      parent_id: nodeId,
      nodes: [
        treeNode({
          id: 'patterns-catalog',
          label: 'Patterns',
          type: 'pattern_surface',
          contentHref: 'patterns.html',
        }),
        treeNode({
          id: 'anti-patterns',
          label: 'Anti-patterns',
          type: 'pattern_surface',
          contentHref: 'anti-pattern-detail.html',
        }),
      ],
    };
  }

  return { parent_id: nodeId, nodes: [] };
}

function buildProjectChildren(parentId, projectId) {
  return {
    parent_id: parentId,
    nodes: [
      treeNode({
        id: `project-${projectId}-detail`,
        label: 'Project Detail',
        type: 'projection_surface',
        contentHref: `projection-detail.html?type=operator.project_detail&projectId=${encodeURIComponent(projectId)}`,
        contentUrl: `/api/loga/projects/${encodeURIComponent(projectId)}/detail`,
      }),
      treeNode({
        id: `project-${projectId}-roadmap`,
        label: 'Roadmap',
        type: 'projection_surface',
        status: 'in progress',
        hasChildren: true,
        contentHref: `projection-detail.html?type=operator.project_roadmap&projectId=${encodeURIComponent(projectId)}`,
        contentUrl: `/api/loga/projects/${encodeURIComponent(projectId)}/roadmap`,
      }),
      treeNode({
        id: `project-${projectId}-promotions`,
        label: 'Promotions',
        type: 'promotion_surface',
        contentHref: `projection-detail.html?type=operator.promotions&projectId=${encodeURIComponent(projectId)}`,
      }),
      treeNode({
        id: `project-${projectId}-cicd`,
        label: 'CI/CD Status',
        type: 'runtime_surface',
        contentHref: `projection-detail.html?type=operator.cicd_status&projectId=${encodeURIComponent(projectId)}`,
      }),
      treeNode({
        id: `project-${projectId}-agent-session`,
        label: 'Agent Memory + DB Turns',
        type: 'runtime_surface',
        contentHref: `projection-detail.html?type=operator.agent_session&projectId=${encodeURIComponent(projectId)}`,
      }),
    ],
  };
}

function buildRoadmapChildren(parentId, projectId) {
  return {
    parent_id: parentId,
    nodes: [
      treeNode({
        id: `project-${projectId}-current-focus`,
        label: 'Current Focus',
        type: 'focus',
        hasChildren: true,
      }),
      treeNode({
        id: `project-${projectId}-roadmap-items`,
        label: 'All Roadmap Items',
        type: 'item_group',
        meta: 'fixture available',
        hasChildren: true,
      }),
    ],
  };
}

function buildCurrentFocusChildren(parentId, projectId) {
  return {
    parent_id: parentId,
    nodes: [
      treeNode({
        id: `project-${projectId}-roadmap-item-generic-wrapper-runtime`,
        label: 'Generic Wrapper Runtime',
        type: 'roadmap_item',
        meta: '2 / 4 tasks',
        hasChildren: true,
        contentHref: `projection-detail.html?type=operator.roadmap_item&projectId=${encodeURIComponent(projectId)}&itemKey=generic-wrapper-runtime`,
      }),
    ],
  };
}

function buildRoadmapItemsChildren(parentId, projectId) {
  return {
    parent_id: parentId,
    nodes: [
      treeNode({
        id: `project-${projectId}-roadmap-item-generic-wrapper-runtime`,
        label: 'Generic Wrapper Runtime',
        type: 'roadmap_item',
        meta: 'current focus',
        hasChildren: true,
        contentHref: `projection-detail.html?type=operator.roadmap_item&projectId=${encodeURIComponent(projectId)}&itemKey=generic-wrapper-runtime`,
      }),
    ],
  };
}

function buildRoadmapItemChildren(parentId) {
  const match = parentId.match(/^project-(.+)-roadmap-item-(.+)$/);
  const projectId = match?.[1] || 'ai-engine';
  const itemKey = match?.[2] || 'generic-wrapper-runtime';
  return {
    parent_id: parentId,
    nodes: [
      treeNode({
        id: `${parentId}-tasks`,
        label: 'Tasks',
        type: 'task_group',
        contentHref: `projection-detail.html?type=operator.task_detail&projectId=${encodeURIComponent(projectId)}&taskKey=replace-hard-coded-scripts`,
      }),
      treeNode({
        id: `${parentId}-evidence`,
        label: 'Evidence',
        type: 'evidence_group',
        contentHref: `projection-detail.html?type=operator.evidence_packet&projectId=${encodeURIComponent(projectId)}&evidencePacketKey=${encodeURIComponent(itemKey)}`,
      }),
      treeNode({
        id: `${parentId}-workflow-runs`,
        label: 'Workflow Runs',
        type: 'runtime_surface',
        contentHref: `projection-detail.html?type=operator.workflow_runs&projectId=${encodeURIComponent(projectId)}`,
      }),
    ],
  };
}

function treeNode(node) {
  const hasChildren = Boolean(node.hasChildren);
  return {
    ...node,
    hasChildren,
    lazyLoadUrl: hasChildren ? `/api/loga/tree/nodes/${encodeURIComponent(node.id)}/children` : undefined,
  };
}

async function loadProjects() {
  try {
    const data = await client.listProjects({ limit: 50 });
    return ensurePrimaryProject(data.projects?.length ? data.projects : [fallbackProject()]);
  } catch {
    return [fallbackProject()];
  }
}

function ensurePrimaryProject(projects) {
  const hasAiEngine = projects.some((project) => {
    const id = String(getProjectId(project)).toLowerCase();
    const label = String(getProjectLabel(project)).toLowerCase();
    return id === 'ai-engine' || label === 'ai engine';
  });
  return hasAiEngine ? projects : [fallbackProject(), ...projects];
}

function getProjectId(project) {
  return project.project_id || project.id || 'ai-engine';
}

function getProjectLabel(project) {
  return project.name || project.project_name || project.slug || getProjectId(project);
}

function getProjectStatus(project) {
  return project.status || project.process_status || project.charter_status || 'active';
}

function fallbackProject() {
  return {
    id: 'ai-engine',
    name: 'AI Engine',
    status: 'active',
  };
}
