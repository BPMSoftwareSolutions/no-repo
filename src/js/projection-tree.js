export function buildProjectionTree({ projects = [] } = {}) {
  const projectNodes = (projects.length ? projects : [fallbackProject()]).map((project, index) => {
    const projectId = project.project_id || project.id || 'ai-engine';
    const label = project.name || project.project_name || project.slug || projectId;
    const isPrimaryProject = index === 0 || projectId === 'ai-engine' || /ai engine/i.test(label);

    return {
      label,
      meta: 'project',
      href: `projection-detail.html?type=operator.project_detail&projectId=${encodeURIComponent(projectId)}`,
      open: isPrimaryProject,
      children: [
        {
          label: 'Project Detail',
          href: `projection-detail.html?type=operator.project_detail&projectId=${encodeURIComponent(projectId)}`,
        },
        {
          label: 'Roadmap',
          meta: isPrimaryProject ? 'in progress' : 'focus surface',
          href: `projection-detail.html?type=operator.project_roadmap&projectId=${encodeURIComponent(projectId)}`,
          open: isPrimaryProject,
          children: [
            {
              label: 'Current Focus',
              open: isPrimaryProject,
              children: [
                {
                  label: 'Generic Wrapper Runtime',
                  meta: '2 / 4 tasks',
                  href: `projection-detail.html?type=operator.roadmap_item&projectId=${encodeURIComponent(projectId)}&itemKey=generic-wrapper-runtime`,
                  open: isPrimaryProject,
                  children: [
                    {
                      label: 'Tasks',
                      href: `projection-detail.html?type=operator.task_detail&projectId=${encodeURIComponent(projectId)}&taskKey=replace-hard-coded-scripts`,
                    },
                    {
                      label: 'Evidence',
                      href: `projection-detail.html?type=operator.evidence_packet&projectId=${encodeURIComponent(projectId)}&evidencePacketKey=generic-wrapper-runtime`,
                    },
                    {
                      label: 'Workflow Runs',
                      href: `projection-detail.html?type=operator.workflow_runs&projectId=${encodeURIComponent(projectId)}`,
                    },
                  ],
                },
              ],
            },
            {
              label: 'Promotions',
              href: `projection-detail.html?type=operator.promotions&projectId=${encodeURIComponent(projectId)}`,
            },
            {
              label: 'CI/CD Status',
              href: `projection-detail.html?type=operator.cicd_status&projectId=${encodeURIComponent(projectId)}`,
            },
            {
              label: 'Agent Memory + DB Turns',
              href: `projection-detail.html?type=operator.agent_session&projectId=${encodeURIComponent(projectId)}`,
            },
          ],
        },
      ],
    };
  });

  return {
    label: 'AI Engine Inspection',
    open: true,
    children: [
      {
        label: 'Projections',
        open: true,
        children: [
          {
            label: 'Operator Home',
            meta: '1 projection',
            href: 'projection-detail.html?type=operator.home',
          },
          {
            label: 'Project Surfaces',
            open: true,
            children: [
              {
                label: 'Project Detail',
                meta: `${projectNodes.length} projects`,
                href: 'projection-group.html?surface=operator.project_detail',
              },
              {
                label: 'Project Roadmap',
                meta: `${projectNodes.length} roadmaps`,
                href: 'projection-group.html?surface=operator.project_roadmap',
              },
              ...projectNodes,
            ],
          },
          {
            label: 'Workflow Surfaces',
            children: [
              {
                label: 'Active Runs',
                href: 'projection-detail.html?type=operator.workflow_runs&projectId=ai-engine',
              },
              {
                label: 'Completed Runs',
                href: 'projection-detail.html?type=operator.workflow_runs&projectId=ai-engine',
              },
            ],
          },
          {
            label: 'System Surfaces',
            children: [
              {
                label: 'Promotions',
                href: 'projection-detail.html?type=operator.promotions&projectId=ai-engine',
              },
              {
                label: 'CI/CD',
                href: 'projection-detail.html?type=operator.cicd_status&projectId=ai-engine',
              },
              {
                label: 'Agent Sessions',
                href: 'projection-detail.html?type=operator.agent_session&projectId=ai-engine',
              },
            ],
          },
        ],
      },
    ],
  };
}

export function renderProjectionTree(container, { projects = [], currentUrl = window.location.href } = {}) {
  container.innerHTML = '';
  container.appendChild(renderTree(buildProjectionTree({ projects }), currentUrl));
}

function renderTree(node, currentUrl) {
  const hasChildren = node.children?.length > 0;
  const wrapper = document.createElement('div');
  wrapper.className = 'tree-node';

  if (hasChildren) {
    const details = document.createElement('details');
    if (node.open || containsCurrentHref(node, currentUrl)) details.open = true;

    const summary = document.createElement('summary');
    summary.className = 'tree-summary';
    summary.innerHTML = `
      <span class="tree-arrow">▶</span>
      ${renderTreeLabel(node)}
    `;
    details.appendChild(summary);

    const childContainer = document.createElement('div');
    childContainer.className = 'tree-children';
    node.children.forEach((child) => childContainer.appendChild(renderTree(child, currentUrl)));
    details.appendChild(childContainer);
    wrapper.appendChild(details);
    return wrapper;
  }

  const leaf = node.href ? document.createElement('a') : document.createElement('div');
  leaf.className = 'tree-summary tree-leaf';
  if (node.href) {
    leaf.href = node.href;
    if (hrefMatchesCurrent(node.href, currentUrl)) {
      leaf.classList.add('is-current');
      leaf.setAttribute('aria-current', 'page');
    }
  }
  leaf.innerHTML = renderTreeLabel(node);
  wrapper.appendChild(leaf);
  return wrapper;
}

function containsCurrentHref(node, currentUrl) {
  return Boolean(node.href && hrefMatchesCurrent(node.href, currentUrl))
    || node.children?.some((child) => containsCurrentHref(child, currentUrl));
}

function hrefMatchesCurrent(href, currentUrl) {
  const target = new URL(href, window.location.href);
  const current = new URL(currentUrl, window.location.href);
  target.hash = '';
  current.hash = '';
  return target.pathname === current.pathname && target.search === current.search;
}

function renderTreeLabel(node) {
  return `
    <span class="tree-label">${escapeHtml(node.label)}</span>
    ${node.meta ? `<span class="tree-meta">${escapeHtml(node.meta)}</span>` : ''}
  `;
}

function fallbackProject() {
  return {
    id: 'ai-engine',
    name: 'AI Engine',
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
