export function buildLogaTreeRoot() {
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

export async function buildLogaTreeChildren(nodeId, { client }) {
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
          id: 'project-portfolio',
          label: 'Project Portfolio',
          type: 'projection_surface',
          meta: 'portfolio overview',
          hasChildren: true,
          contentHref: 'projection-detail.html?type=operator.project_portfolio',
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

  if (nodeId === 'project-portfolio') {
    const projects = await loadProjects(client);
    const active = projects.filter((p) => {
      const status = getProjectStatus(p);
      return status === 'active' || status === 'in_progress' || status === 'in progress';
    });
    const listed = active.length ? active : projects.slice(0, 10);
    return {
      parent_id: nodeId,
      nodes: listed.map((project) => {
        const projectId = getProjectId(project);
        return treeNode({
          id: `project-${projectId}`,
          label: getProjectLabel(project),
          type: 'project',
          status: getProjectStatus(project),
          hasChildren: true,
        });
      }),
    };
  }

  if (nodeId === 'project-surfaces') {
    const projects = await loadProjects(client);
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

  if (nodeId.startsWith('project-') && nodeId.endsWith('-roadmap')) {
    const projectId = nodeId.slice('project-'.length, -'-roadmap'.length);
    return buildRoadmapChildren(nodeId, projectId);
  }

  if (nodeId.startsWith('project-') && nodeId.endsWith('-current-focus')) {
    const projectId = nodeId.slice('project-'.length, -'-current-focus'.length);
    return buildCurrentFocusChildren(nodeId, projectId, { client });
  }

  if (nodeId.startsWith('project-') && nodeId.endsWith('-roadmap-items')) {
    const projectId = nodeId.slice('project-'.length, -'-roadmap-items'.length);
    return buildRoadmapItemsChildren(nodeId, projectId, { client });
  }

  if (nodeId.startsWith('project-') && nodeId.endsWith('-promotions')) {
    const projectId = nodeId.slice('project-'.length, -'-promotions'.length);
    return buildPromotionsChildren(nodeId, projectId);
  }

  if (nodeId.startsWith('project-') && nodeId.endsWith('-workflow-runs')) {
    const scoped = parseRoadmapItemScopedNode(nodeId, 'workflow-runs');
    const projectId = scoped?.projectId || nodeId.slice('project-'.length, -'-workflow-runs'.length);
    return buildWorkflowRunsChildren(nodeId, projectId);
  }

  if (nodeId.startsWith('project-') && nodeId.endsWith('-agent-session')) {
    const projectId = nodeId.slice('project-'.length, -'-agent-session'.length);
    return buildAgentSessionChildren(nodeId, projectId);
  }

  if (nodeId.startsWith('project-') && nodeId.endsWith('-turns')) {
    const projectId = nodeId.slice('project-'.length, -'-turns'.length);
    return buildTurnsChildren(nodeId, projectId);
  }

  if (nodeId.startsWith('project-') && nodeId.endsWith('-memory')) {
    return buildMemoryChildren(nodeId);
  }

  if (nodeId.startsWith('project-') && nodeId.endsWith('-tasks')) {
    const scoped = parseRoadmapItemScopedNode(nodeId, 'tasks');
    return buildTasksChildren(nodeId, scoped?.projectId || 'ai-engine', { client });
  }

  // UUID-based individual task expansion — must come before the slug-based -tasks- check
  if (nodeId.includes('-tasks-task-')) {
    const match = nodeId.match(/-tasks-task-([0-9a-f-]{36})$/i);
    if (match) return buildSubtaskListChildren(nodeId, match[1], { client });
  }

  if (nodeId.includes('-tasks-')) {
    return buildSubtasksChildren(nodeId);
  }

  if (nodeId.includes('-roadmap-item-')) {
    return buildRoadmapItemChildren(nodeId);
  }

  if (nodeId.startsWith('project-')) {
    const projectId = nodeId.slice('project-'.length);
    return buildProjectChildren(nodeId, projectId);
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
        hasChildren: true,
        contentHref: `projection-detail.html?type=operator.promotions&projectId=${encodeURIComponent(projectId)}`,
      }),
      treeNode({
        id: `project-${projectId}-workflow-runs`,
        label: 'Workflow Runs',
        type: 'runtime_surface',
        hasChildren: true,
        contentHref: `projection-detail.html?type=operator.workflow_runs&projectId=${encodeURIComponent(projectId)}`,
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
        hasChildren: true,
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
        hasChildren: true,
        contentHref: `projection-detail.html?type=operator.roadmap_items&projectId=${encodeURIComponent(projectId)}`,
      }),
    ],
  };
}

async function buildCurrentFocusChildren(parentId, projectId, { client }) {
  try {
    const roadmap = await client.getProjectRoadmap(projectId);
    const items = roadmap.items || [];
    const focus = items.filter((i) => i.is_current_project_stage === true);
    const display = focus.length > 0 ? focus : items.filter((i) => i.item_status === 'in_progress').slice(0, 3);
    return {
      parent_id: parentId,
      nodes: display.map((item) => treeNode({
        id: `project-${projectId}-roadmap-item-${item.item_key}`,
        label: item.item_title,
        type: 'roadmap_item',
        meta: item.item_status,
        hasChildren: true,
        contentHref: `projection-detail.html?type=operator.roadmap_item&projectId=${encodeURIComponent(projectId)}&itemKey=${encodeURIComponent(item.item_key)}`,
      })),
    };
  } catch {
    return { parent_id: parentId, nodes: [] };
  }
}

async function buildRoadmapItemsChildren(parentId, projectId, { client }) {
  try {
    const roadmap = await client.getProjectRoadmap(projectId);
    const items = roadmap.items || [];
    const open = items.filter((i) => i.item_status !== 'done' && i.item_status !== 'completed');
    const display = open.length > 0 ? open : items;
    return {
      parent_id: parentId,
      nodes: display.map((item) => treeNode({
        id: `project-${projectId}-roadmap-item-${item.item_key}`,
        label: item.item_title,
        type: 'roadmap_item',
        status: item.item_status,
        meta: item.total_task_count > 0 ? `${item.open_task_count} / ${item.total_task_count} tasks` : undefined,
        hasChildren: true,
        contentHref: `projection-detail.html?type=operator.roadmap_item&projectId=${encodeURIComponent(projectId)}&itemKey=${encodeURIComponent(item.item_key)}`,
      })),
    };
  } catch {
    return { parent_id: parentId, nodes: [] };
  }
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
        hasChildren: true,
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
        hasChildren: true,
        contentHref: `projection-detail.html?type=operator.workflow_runs&projectId=${encodeURIComponent(projectId)}`,
      }),
    ],
  };
}

function buildPromotionsChildren(parentId, projectId) {
  return {
    parent_id: parentId,
    nodes: [
      promotionNode(parentId, projectId, 'startWork', 'startWork', 'promoted'),
      promotionNode(parentId, projectId, 'completeTurn', 'completeTurn', 'promoted'),
      promotionNode(parentId, projectId, 'runCharter', 'runCharter', 'promoted'),
      promotionNode(parentId, projectId, 'createRefactorImplementationPlan', 'createRefactorImplementationPlan', 'needed'),
      promotionNode(parentId, projectId, 'executeGovernedRefactorWrapper', 'executeGovernedRefactorWrapper', 'needed'),
      promotionNode(parentId, projectId, 'getRefactorWrapperEvidence', 'getRefactorWrapperEvidence', 'needed'),
    ],
  };
}

function buildWorkflowRunsChildren(parentId, projectId) {
  return {
    parent_id: parentId,
    nodes: [
      treeNode({
        id: `${parentId}-refactor-runtime`,
        label: 'Generic Wrapper Runtime Refactor',
        type: 'workflow_run',
        status: 'running',
        contentHref: 'projection-detail.html?type=operator.workflow_run&workflowRunId=refactor-runtime',
      }),
      treeNode({
        id: `${parentId}-architecture-review`,
        label: 'Architecture Integrity Review',
        type: 'workflow_run',
        status: 'waiting',
        contentHref: 'projection-detail.html?type=operator.workflow_run&workflowRunId=architecture-review',
      }),
      treeNode({
        id: `${parentId}-postgres-authority-transition`,
        label: 'PostgreSQL Authority Transition',
        type: 'workflow_run',
        status: 'completed',
        contentHref: `projection-detail.html?type=operator.workflow_runs&projectId=${encodeURIComponent(projectId)}`,
      }),
    ],
  };
}

function buildAgentSessionChildren(parentId, projectId) {
  return {
    parent_id: parentId,
    nodes: [
      treeNode({
        id: `project-${projectId}-memory`,
        label: 'Memory',
        type: 'memory_group',
        hasChildren: true,
        contentHref: `projection-detail.html?type=operator.agent_session&projectId=${encodeURIComponent(projectId)}`,
      }),
      treeNode({
        id: `project-${projectId}-turns`,
        label: 'DB Turns',
        type: 'turn_group',
        hasChildren: true,
        contentHref: `projection-detail.html?type=operator.agent_session&projectId=${encodeURIComponent(projectId)}`,
      }),
    ],
  };
}

function buildTurnsChildren(parentId, projectId) {
  return {
    parent_id: parentId,
    nodes: [
      turnNode(parentId, projectId, 1, 'startWork', 'persisted'),
      turnNode(parentId, projectId, 2, 'analyze candidate', 'persisted'),
      turnNode(parentId, projectId, 3, 'propose contract', 'pending'),
    ],
  };
}

function buildMemoryChildren(parentId) {
  const projectId = parentId.replace(/^project-/, '').replace(/-memory$/, '');
  const sessionHref = `projection-detail.html?type=operator.agent_session&projectId=${encodeURIComponent(projectId)}`;
  return {
    parent_id: parentId,
    nodes: [
      treeNode({ id: `${parentId}-wrapper-authority`, label: 'Wrapper is the only mutation authority', type: 'memory', status: 'required', contentHref: sessionHref }),
      treeNode({ id: `${parentId}-no-local-scripts`, label: 'No local scripts as authority', type: 'memory', status: 'required', contentHref: sessionHref }),
      treeNode({ id: `${parentId}-sql-truth`, label: 'SQL is durable truth; markdown is projection', type: 'memory', status: 'required', contentHref: sessionHref }),
    ],
  };
}

async function buildTasksChildren(parentId, projectId, { client }) {
  const scoped = parseRoadmapItemScopedNode(parentId, 'tasks');
  const itemKey = scoped?.itemKey;
  if (!itemKey || !projectId) return { parent_id: parentId, nodes: [] };
  try {
    const roadmap = await client.getProjectRoadmap(projectId);
    const item = (roadmap.items || []).find((i) => i.item_key === itemKey);
    if (!item?.implementation_item_id) return { parent_id: parentId, nodes: [] };
    const result = await client.listImplementationTasks(item.implementation_item_id);
    const allTasks = Array.isArray(result) ? result : (result.tasks || []);
    const topLevel = allTasks.filter((t) => !t.parent_task_id);
    return {
      parent_id: parentId,
      nodes: topLevel.map((task) => {
        const hasSubtasks = allTasks.some((t) => t.parent_task_id === task.implementation_item_task_id);
        return treeNode({
          id: `${parentId}-task-${task.implementation_item_task_id}`,
          label: task.title,
          type: 'task',
          status: task.status,
          hasChildren: hasSubtasks,
          contentHref: `projection-detail.html?type=operator.task_detail&projectId=${encodeURIComponent(projectId)}&itemKey=${encodeURIComponent(itemKey)}&taskKey=${encodeURIComponent(task.implementation_item_task_id)}`,
        });
      }),
    };
  } catch {
    return { parent_id: parentId, nodes: [] };
  }
}

async function buildSubtaskListChildren(parentId, taskId, { client }) {
  try {
    const result = await client.listImplementationSubtasks(taskId);
    const subtasks = Array.isArray(result) ? result : (result.subtasks || result.tasks || []);
    return {
      parent_id: parentId,
      nodes: subtasks.map((subtask) => treeNode({
        id: `${parentId}-subtask-${subtask.implementation_item_task_id || subtask.id}`,
        label: subtask.title,
        type: 'subtask',
        status: subtask.status,
        contentHref: `projection-detail.html?type=operator.subtask_detail&taskId=${encodeURIComponent(taskId)}&subtaskId=${encodeURIComponent(subtask.implementation_item_task_id || subtask.id)}`,
      })),
    };
  } catch {
    return { parent_id: parentId, nodes: [] };
  }
}

function buildSubtasksChildren(parentId) {
  const scoped = parseRoadmapItemScopedNode(parentId, 'tasks-replace-hard-coded-scripts');
  const projectId = scoped?.projectId || 'ai-engine';
  const itemKey = scoped?.itemKey || 'generic-wrapper-runtime';
  const taskKey = 'replace-hard-coded-scripts';
  return {
    parent_id: parentId,
    nodes: [
      subtaskNode(parentId, projectId, itemKey, taskKey, 'identify-hard-coded-paths', 'Identify hard-coded source and destination paths', 'done'),
      subtaskNode(parentId, projectId, itemKey, taskKey, 'extract-operation-model', 'Extract reusable wrapper operation model', 'in progress'),
      subtaskNode(parentId, projectId, itemKey, taskKey, 'bind-sql-evidence', 'Bind operation records to SQL-backed wrapper evidence', 'blocked'),
      subtaskNode(parentId, projectId, itemKey, taskKey, 'replace-script-path', 'Replace script path with SDK-visible governed execution', 'not started'),
    ],
  };
}

function promotionNode(parentId, projectId, key, label, status) {
  return treeNode({
    id: `${parentId}-${key}`,
    label,
    type: 'promotion',
    status,
    contentHref: `projection-detail.html?type=operator.promotions&projectId=${encodeURIComponent(projectId)}&promotionKey=${encodeURIComponent(key)}`,
  });
}

function turnNode(parentId, projectId, turn, action, status) {
  return treeNode({
    id: `${parentId}-${turn}`,
    label: `Turn ${turn}: ${action}`,
    type: 'turn',
    status,
    contentHref: `projection-detail.html?type=operator.agent_session&projectId=${encodeURIComponent(projectId)}&turn=${encodeURIComponent(turn)}`,
  });
}

function taskNode(parentId, projectId, key, label, status, hasSubtasks = false) {
  return treeNode({
    id: `${parentId}-${key}`,
    label,
    type: 'task',
    status,
    hasChildren: hasSubtasks,
    contentHref: `projection-detail.html?type=operator.task_detail&projectId=${encodeURIComponent(projectId)}&taskKey=${encodeURIComponent(key)}`,
  });
}

function subtaskNode(parentId, projectId, itemKey, taskKey, subtaskKey, label, status) {
  return treeNode({
    id: `${parentId}-${subtaskKey}`,
    label,
    type: 'subtask',
    status,
    contentHref: `projection-detail.html?type=operator.subtask_detail&projectId=${encodeURIComponent(projectId)}&itemKey=${encodeURIComponent(itemKey)}&taskKey=${encodeURIComponent(taskKey)}&subtaskKey=${encodeURIComponent(subtaskKey)}`,
  });
}

function parseRoadmapItemScopedNode(nodeId, suffix) {
  const scoped = nodeId
    .replace(/^project-/, '')
    .replace(new RegExp(`-${suffix}$`), '');
  const marker = '-roadmap-item-';
  const markerIndex = scoped.indexOf(marker);
  if (markerIndex < 0) return null;
  return {
    projectId: scoped.slice(0, markerIndex),
    itemKey: scoped.slice(markerIndex + marker.length),
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

async function loadProjects(client) {
  try {
    const data = await client.listProjects({ limit: 50 });
    return data.projects?.length ? data.projects : [fallbackProject()];
  } catch {
    return [fallbackProject()];
  }
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
  return { id: 'ai-engine', name: 'AI Engine', status: 'active' };
}
