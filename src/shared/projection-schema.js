export const DEFAULT_PROJECT_ID = 'ai-engine';
export const DEFAULT_ITEM_KEY = 'generic-wrapper-runtime';
export const DEFAULT_TASK_KEY = 'replace-hard-coded-scripts';
export const DEFAULT_SUBTASK_KEY = 'identify-hard-coded-paths';

const STATUS_COMPLETION_PCT = {
  done: 100,
  completed: 100,
  awaiting_review: 90,
  in_progress: 50,
  blocked: 25,
};

export const WORKSPACE_SCHEMA = {
  nodeTypeLabels: {
    project: 'Project',
    roadmap_item: 'Roadmap Item',
    task_group: 'Tasks',
    item_group: 'Roadmap',
    focus: 'Current Focus',
    evidence_group: 'Evidence',
    runtime_surface: 'Workflow Runs',
    projection_surface: 'Surface',
  },
  surfaceByType: {
    roadmap_item: ['roadmap'],
    task: ['roadmap'],
    promotion: ['promotions'],
    runtime_surface: ['workflows'],
    workflow_run: ['workflows'],
    evidence_group: ['evidence'],
    memory_group: ['memory'],
    turn_group: ['memory'],
    project: ['roadmap', 'promotions', 'workflows', 'memory'],
  },
  modeHints: {
    focus: 'Current focus and active roadmap item',
    execution: 'Tasks, workflow runs, and active work',
    diagnostic: 'Blocked, failed, and waiting items',
    evidence: 'Evidence packets, gates, and trust material',
    evolution: 'Promotions, SDK changes, and release posture',
  },
  modePresets: {
    focus: ['roadmap', 'memory'],
    execution: ['roadmap', 'workflows'],
    diagnostic: ['roadmap', 'workflows', 'cicd', 'evidence'],
    evidence: ['evidence', 'memory', 'workflows'],
    evolution: ['promotions', 'cicd'],
  },
};

export function normalizeStatus(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function getStatusCompletionPct(status) {
  return STATUS_COMPLETION_PCT[normalizeStatus(status)] ?? 0;
}

export function getProjectId(value) {
  return String(value ?? '').trim() || DEFAULT_PROJECT_ID;
}

export function getItemKey(value) {
  return String(value ?? '').trim() || DEFAULT_ITEM_KEY;
}

export function getTaskKey(value) {
  return String(value ?? '').trim() || DEFAULT_TASK_KEY;
}

export function buildFocusNodeId(projectId = DEFAULT_PROJECT_ID, itemKey = DEFAULT_ITEM_KEY) {
  return `project-${getProjectId(projectId)}-roadmap-item-${getItemKey(itemKey)}`;
}

export function getItemStatus(item) {
  return normalizeStatus(item?.status || item?.item_status || item?.state || '');
}

export function getItemCompletionPct(item) {
  const explicitPct = Number(item?.completion_pct ?? item?.completion_percentage ?? item?.completionPercent);
  if (Number.isFinite(explicitPct)) return explicitPct;
  return getStatusCompletionPct(getItemStatus(item));
}

