import { callAiEngine } from './api-client.js';
import { renderProjectionTree } from './projection-tree.js';

document.addEventListener('DOMContentLoaded', async () => {
  const surfaceList = document.getElementById('surface-list');
  const attentionList = document.getElementById('recent-attention');
  const tree = document.getElementById('projection-tree');

  try {
    const [homeResult, catalogResult, projectsResult] = await Promise.allSettled([
      callAiEngine('getLogaOperatorHomeProjection'),
      callAiEngine('getLogaProjectCatalogProjection'),
      callAiEngine('listProjects', { limit: 50 }),
    ]);

    const projects = projectsResult.status === 'fulfilled' ? projectsResult.value.projects || [] : [];
    const surfaceGroups = buildSurfaceGroups({
      hasHome: homeResult.status === 'fulfilled',
      hasCatalog: catalogResult.status === 'fulfilled',
      projects,
    });

    surfaceList.innerHTML = '';
    surfaceGroups.forEach((surface, index) => {
      surfaceList.appendChild(renderSurface(surface, index + 1));
    });

    renderProjectionTree(tree);

    attentionList.innerHTML = '';
    buildAttention({ projects, surfaceGroups }).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      attentionList.appendChild(li);
    });
  } catch (error) {
    surfaceList.innerHTML = `<p style="color: var(--red)">Error loading operator surfaces: ${error.message}</p>`;
    tree.innerHTML = `<p style="color: var(--red)">Error loading projection tree: ${error.message}</p>`;
  }
});

function buildSurfaceGroups({ hasHome, hasCatalog, projects }) {
  const projectCount = projects.length;

  return [
    {
      label: 'Operator Home',
      question: 'What needs attention now?',
      count: hasHome ? '1 projection' : 'Unavailable',
      meaning: 'Current operator orientation surface',
      status: hasHome ? 'Valid' : 'Unavailable',
      href: 'projection-detail.html?type=operator.home',
    },
    {
      label: 'Project Catalog',
      question: 'What projects exist?',
      count: hasCatalog ? '1 projection' : 'Unavailable',
      meaning: 'Entry point for project-level inspection',
      status: hasCatalog ? 'Valid' : 'Unavailable',
      href: 'projection-detail.html?type=operator.project_catalog',
    },
    {
      label: 'Project Detail',
      question: 'What is happening in this project?',
      count: `${projectCount || 1} project projection${projectCount === 1 ? '' : 's'}`,
      meaning: `${projectCount || 1} project${projectCount === 1 ? ' has' : 's have'} orientation pages`,
      status: projectCount > 0 ? 'Valid' : 'Fixture available',
      href: 'projection-group.html?surface=operator.project_detail',
    },
    {
      label: 'Project Roadmap',
      question: 'What is the delivery state?',
      count: `${projectCount || 1} roadmap projection${projectCount === 1 ? '' : 's'}`,
      meaning: `${projectCount || 1} project roadmap${projectCount === 1 ? '' : 's'} available for focus inspection`,
      status: projectCount > 0 ? 'Valid' : 'Fixture available',
      href: 'projection-group.html?surface=operator.project_roadmap',
    },
    {
      label: 'Workflow Runs',
      question: 'What is currently running?',
      count: 'Runtime surface',
      meaning: 'Execution monitoring for active and recent runs',
      status: 'Fixture available',
      href: 'projection-detail.html?type=operator.workflow_runs&projectId=ai-engine',
    },
    {
      label: 'Promotions',
      question: 'What capabilities were promoted?',
      count: 'Platform surface',
      meaning: 'SDK and platform capability evolution',
      status: 'Fixture available',
      href: 'projection-detail.html?type=operator.promotions&projectId=ai-engine',
    },
    {
      label: 'Agent Session',
      question: 'What is the agent doing?',
      count: 'Observability surface',
      meaning: 'Memory, claim scope, and DB turn posture',
      status: 'Fixture available',
      href: 'projection-detail.html?type=operator.agent_session&projectId=ai-engine',
    },
  ];
}

function renderSurface(surface, index) {
  const card = document.createElement('a');
  card.className = 'surface-card';
  card.href = surface.href;
  card.innerHTML = `
    <span class="surface-number">${String(index).padStart(2, '0')}</span>
    <span class="surface-copy">
      <strong>${escapeHtml(surface.label)}</strong>
      <span>${escapeHtml(surface.question)}</span>
      <em>${escapeHtml(surface.count)} &middot; ${escapeHtml(surface.status)}</em>
    </span>
    <span class="surface-meaning">${escapeHtml(surface.meaning)}</span>
    <span class="surface-open">Open</span>
  `;
  return card;
}

function buildAttention({ projects, surfaceGroups }) {
  const projectCount = projects.length || 1;
  const unavailable = surfaceGroups.filter((surface) => surface.status === 'Unavailable').length;

  return [
    `${projectCount} project detail projection${projectCount === 1 ? '' : 's'} exist because there ${projectCount === 1 ? 'is' : 'are'} ${projectCount} project${projectCount === 1 ? '' : 's'}.`,
    `${projectCount} roadmap projection${projectCount === 1 ? '' : 's'} exist because project roadmaps are inspected separately from project orientation.`,
    unavailable === 0 ? 'No invalid projection surfaces detected.' : `${unavailable} projection surface${unavailable === 1 ? '' : 's'} unavailable.`,
  ];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
