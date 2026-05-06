import { callAiEngine } from './api-client.js';
import { renderProjectionTree } from './projection-tree.js';
import { mountWorkspaceChrome } from './workspace-chrome.js';

const SURFACE_CONFIG = {
  'operator.project_detail': {
    title: 'Project Detail Projections',
    question: 'Which project do you want to inspect?',
    itemQuestion: 'What is happening in this project?',
    href: (projectId) => `projection-detail.html?type=operator.project_detail&projectId=${encodeURIComponent(projectId)}`,
  },
  'operator.project_roadmap': {
    title: 'Project Roadmap Projections',
    question: 'Which roadmap needs focus?',
    itemQuestion: 'What is the delivery state?',
    href: (projectId) => `projection-detail.html?type=operator.project_roadmap&projectId=${encodeURIComponent(projectId)}`,
  },
};

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const surface = params.get('surface') || 'operator.project_detail';
  const config = SURFACE_CONFIG[surface] || SURFACE_CONFIG['operator.project_detail'];
  const list = document.getElementById('group-list');
  const attention = document.getElementById('group-attention');
  const tree = document.getElementById('projection-tree');

  document.getElementById('group-title').textContent = config.title;
  document.getElementById('group-question').textContent = config.question;

  mountWorkspaceChrome({
    workspace_mode: surface === 'operator.project_roadmap' ? 'focus' : 'execution',
    active_surfaces: surface === 'operator.project_roadmap' ? 'roadmap,memory' : 'roadmap,workflows',
  });

  try {
    const data = await callAiEngine('listProjects', { limit: 50 }).catch(() => ({ projects: [] }));
    const projects = data.projects?.length ? data.projects : [fallbackProject()];

    renderProjectionTree(tree);

    list.innerHTML = '';
    projects.forEach((project, index) => {
      list.appendChild(renderProjectProjection(project, config, index + 1));
    });

    attention.innerHTML = '';
    [
      `${projects.length} ${surface === 'operator.project_roadmap' ? 'roadmap' : 'project detail'} projection${projects.length === 1 ? '' : 's'} available.`,
      surface === 'operator.project_roadmap'
        ? 'Roadmap projections are focus surfaces; open one to decide what matters now.'
        : 'Project detail projections are orientation surfaces; open one before drilling into lanes.',
      'No duplicate projection records are shown here; each row is a meaningful project choice.',
    ].forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      attention.appendChild(li);
    });
  } catch (error) {
    list.innerHTML = `<p class="loga-error">Error loading projection group: ${error.message}</p>`;
  }
});

function renderProjectProjection(project, config, index) {
  const projectId = project.project_id || project.id || 'ai-engine';
  const title = project.name || project.project_name || project.slug || projectId;
  const summary = project.objective || project.description || project.summary || config.itemQuestion;
  const status = project.status || project.process_status || project.charter_status || 'Active';

  const card = document.createElement('a');
  card.className = 'projection-card';
  card.href = config.href(projectId);
  card.innerHTML = `
    <span class="projection-card__number">${String(index).padStart(2, '0')}</span>
    <span class="projection-card__copy">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(summary)}</span>
      <em>${escapeHtml(status)} · Open</em>
    </span>
    <span class="projection-card__meaning">${escapeHtml(config.itemQuestion)}</span>
    <span class="projection-card__open">Open</span>
  `;
  return card;
}

function fallbackProject() {
  return {
    id: 'ai-engine',
    name: 'AI Engine',
    summary: 'Governed refactor execution and SDK promotion observability',
    status: 'Active',
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
