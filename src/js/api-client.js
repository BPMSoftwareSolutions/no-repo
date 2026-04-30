// Shared AIEngine API wrapper
export async function callAiEngine(method, ...args) {
  try {
    const res = await fetch('/api/ai-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, args })
    });
    const data = await res.json();
    
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Unknown error');
    }
    
    return data.result;
  } catch (err) {
    console.error(`Error calling ${method}:`, err);
    throw err;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveProjectionHref(rawHref) {
  const href = String(rawHref || '').trim();
  if (!href) return '#';
  if (href.startsWith('#')) return href;

  const viewerProject = href.match(/\/viewer\/ai-engine\/projects\/([^/\s]+)$/i);
  if (viewerProject) {
    return `projection-detail.html?type=operator.project_detail&projectId=${encodeURIComponent(viewerProject[1])}`;
  }

  const viewerRoadmapItem = href.match(/\/viewer\/ai-engine\/projects\/([^/\s]+)\/roadmap\/([^/\s]+)/i);
  if (viewerRoadmapItem) {
    return `projection-detail.html?type=operator.roadmap_item&projectId=${encodeURIComponent(viewerRoadmapItem[1])}&itemKey=${encodeURIComponent(viewerRoadmapItem[2])}`;
  }

  const viewerRoadmap = href.match(/\/viewer\/ai-engine\/projects\/([^/\s]+)\/roadmap$/i);
  if (viewerRoadmap) {
    return `projection-detail.html?type=operator.project_roadmap&projectId=${encodeURIComponent(viewerRoadmap[1])}`;
  }

  const viewerEvidence = href.match(/\/viewer\/ai-engine\/projects\/([^/\s]+)\/evidence\/([^/\s]+)/i);
  if (viewerEvidence) {
    return `projection-detail.html?type=operator.evidence_packet&projectId=${encodeURIComponent(viewerEvidence[1])}&evidencePacketKey=${encodeURIComponent(viewerEvidence[2])}`;
  }

  const viewerLane = href.match(/\/viewer\/ai-engine\/projects\/([^/\s]+)\/(promotions|workflow-runs|agent-session|cicd-status)$/i);
  if (viewerLane) {
    const typeByLane = {
      'promotions': 'operator.promotions',
      'workflow-runs': 'operator.workflow_runs',
      'agent-session': 'operator.agent_session',
      'cicd-status': 'operator.cicd_status',
    };
    return `projection-detail.html?type=${encodeURIComponent(typeByLane[viewerLane[2]])}&projectId=${encodeURIComponent(viewerLane[1])}`;
  }

  const roadmapItem = href.match(/projects\/([^/\s]+)\/roadmap\/items\/([^/\s]+)/i);
  if (roadmapItem) {
    return `projection-detail.html?type=operator.roadmap_item&projectId=${encodeURIComponent(roadmapItem[1])}&itemKey=${encodeURIComponent(roadmapItem[2])}`;
  }

  const knownType = href.match(/^(operator\.[a-z0-9_./-]+)(?:[?#].*)?$/i);
  if (knownType) {
    return `projection-detail.html?type=${encodeURIComponent(knownType[1])}`;
  }

  const projectRoadmap = href.match(/projects\/([^/\s]+)\/roadmap(?:\.md)?/i);
  if (projectRoadmap) {
    return `projection-detail.html?type=operator.project_roadmap&projectId=${encodeURIComponent(projectRoadmap[1])}`;
  }

  const workflowRun = href.match(/workflow-runs\/([^/\s]+)/i);
  if (workflowRun) {
    return `projection-detail.html?type=operator.workflow_run&workflowRunId=${encodeURIComponent(workflowRun[1])}`;
  }

  const evidencePacket = href.match(/evidence-packets\/([^/\s]+)/i);
  if (evidencePacket) {
    return `projection-detail.html?type=operator.evidence_packet&evidencePacketKey=${encodeURIComponent(evidencePacket[1])}`;
  }

  if (/^https?:\/\//i.test(href)) return href;
  return `projection-detail.html?target=${encodeURIComponent(href)}`;
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
      return `<a href="${escapeHtml(resolveProjectionHref(href))}">${escapeHtml(label)}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function stripFrontmatter(text) {
  return String(text || '').replace(/^---[\s\S]*?---\s*/, '');
}

function parseLogaRecords(lines) {
  const records = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('- ')) {
      if (current) records.push(current);
      current = {};
      const inline = line.slice(2);
      const inlineMatch = inline.match(/^([a-zA-Z0-9_]+):\s*"?([^"]+)"?$/);
      if (inlineMatch) current[inlineMatch[1]] = inlineMatch[2];
      else current.label = inline;
      continue;
    }

    const pair = line.match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?$/);
    if (pair) {
      if (!current) current = {};
      current[pair[1]] = pair[2];
    }
  }

  if (current) records.push(current);
  return records;
}

function parseKeyValues(lines) {
  const entries = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const pair = line.match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?$/);
    if (pair) entries.push([pair[1], pair[2]]);
    else if (line.startsWith('- ')) entries.push([null, line.slice(2)]);
  }
  return entries;
}

function parseDirectiveAttributes(value = '') {
  const attrs = {};
  const pattern = /([a-zA-Z0-9_-]+)=("([^"]*)"|'([^']*)'|([^\s]+))/g;
  let match;
  while ((match = pattern.exec(value))) {
    attrs[match[1]] = match[3] ?? match[4] ?? match[5] ?? '';
  }
  return attrs;
}

function renderAttributeDetails(attrs) {
  const entries = Object.entries(attrs).filter(([, value]) => value);
  if (!entries.length) return '';
  return `<dl>${entries.map(([key, value]) => `<dt>${escapeHtml(key.replaceAll('_', ' '))}</dt><dd>${renderInlineMarkdown(value)}</dd>`).join('')}</dl>`;
}

function renderLogaBlock(blockName, lines, attrs = {}) {
  const name = blockName.toLowerCase();
  const entries = parseKeyValues(lines);
  const value = (key) => entries.find(([entryKey]) => entryKey === key)?.[1] || attrs[key] || '';

  if (name === 'surface') {
    const type = value('type') || 'surface';
    const priority = value('priority');
    const summary = value('summary');
    return `
      <section class="loga-surface">
        <p class="eyebrow">${escapeHtml([type.replaceAll('_', ' '), priority].filter(Boolean).join(' / '))}</p>
        ${summary ? `<p class="lead">${renderInlineMarkdown(summary)}</p>` : ''}
        ${renderAttributeDetails(Object.fromEntries(Object.entries(attrs).filter(([key]) => !['type', 'priority', 'summary'].includes(key))))}
        ${entries.filter(([key]) => !key).map(([, entryValue]) => `<p>${renderInlineMarkdown(entryValue)}</p>`).join('')}
      </section>
    `;
  }

  if (name === 'focus') {
    return `
      <section class="loga-focus">
        <p class="eyebrow">${escapeHtml(value('status') || 'focus')}</p>
        <h2>${renderInlineMarkdown(value('question') || 'What should I care about right now?')}</h2>
        <p class="lead">${renderInlineMarkdown(value('answer'))}</p>
      </section>
    `;
  }

  if (name === 'panel') {
    const title = value('title');
    const summary = value('summary');
    const details = entries.filter(([key]) => key && !['title', 'summary'].includes(key));
    return `
      <section class="loga-panel">
        ${title ? `<h3>${renderInlineMarkdown(title)}</h3>` : ''}
        ${summary ? `<p>${renderInlineMarkdown(summary)}</p>` : ''}
        ${details.length ? `<dl>${details.map(([key, entryValue]) => `<dt>${escapeHtml(key.replaceAll('_', ' '))}</dt><dd>${renderInlineMarkdown(entryValue)}</dd>`).join('')}</dl>` : ''}
        ${entries.filter(([key]) => !key).map(([, entryValue]) => `<p>${renderInlineMarkdown(entryValue)}</p>`).join('')}
      </section>
    `;
  }

  if (name === 'breadcrumb') {
    const records = parseLogaRecords(lines);
    return `<nav class="loga-breadcrumb" aria-label="Projection path">${records.map((record) => `<a href="${escapeHtml(resolveProjectionHref(record.target || record.projection_type))}">${escapeHtml(record.label || record.projection_type || 'Open')}</a>`).join(' / ')}</nav>`;
  }

  if (name === 'nav') {
    const records = parseLogaRecords(lines);
    return `<nav class="loga-nav" aria-label="Projection drilldowns">${records.map((record) => `<a href="${escapeHtml(resolveProjectionHref(record.target || record.projection_type))}">${escapeHtml(record.label || record.projection_type || 'Open')}</a>`).join('')}</nav>`;
  }

  if (name === 'next_actions') {
    const actions = lines.map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => line.slice(2));
    return `<section class="loga-actions" aria-label="Next actions">${actions.map((action) => `<button type="button">${escapeHtml(action)}</button>`).join('')}</section>`;
  }

  if (name === 'roadmap' || name === 'task_list' || name === 'run_list' || name === 'promotion_list' || name === 'cicd_list' || name === 'turn_list') {
    const records = parseLogaRecords(lines);
    return `<section class="loga-list loga-${escapeHtml(name)}">${records.map((record) => {
      const href = resolveProjectionHref(record.target || record.projection_type || '#');
      return `
        <a class="loga-list-item" href="${escapeHtml(href)}">
          <strong>${escapeHtml(record.title || record.label || record.key || 'Untitled')}</strong>
          <span>${escapeHtml([record.status, record.priority, record.progress].filter(Boolean).join(' | '))}</span>
        </a>
      `;
    }).join('')}</section>`;
  }

  if (name === 'evidence_drawer') {
    return `<details><summary>Evidence Drawer</summary><pre><code>${escapeHtml(lines.join('\n'))}</code></pre></details>`;
  }

  return `
    <section class="loga-panel loga-primitive">
      <h3>${escapeHtml(blockName.replaceAll('_', ' '))}</h3>
      ${renderAttributeDetails(attrs)}
      ${entries.filter(([key]) => key).length ? `<dl>${entries.filter(([key]) => key).map(([key, entryValue]) => `<dt>${escapeHtml(key.replaceAll('_', ' '))}</dt><dd>${renderInlineMarkdown(entryValue)}</dd>`).join('')}</dl>` : ''}
      ${entries.filter(([key]) => !key).map(([, entryValue]) => `<p>${renderInlineMarkdown(entryValue)}</p>`).join('')}
      ${!Object.keys(attrs).length && !entries.length && lines.some((line) => line.trim()) ? `<p>${renderInlineMarkdown(lines.join(' '))}</p>` : ''}
    </section>
  `;
}

export function renderMarkdownProjection(text) {
  if (!text) return '';
  const lines = stripFrontmatter(text).split(/\r?\n/);
  const html = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const blockStart = line.trim().match(/^:{2,3}([a-zA-Z0-9_]+)(?:\s+(.*))?$/);
    if (blockStart) {
      const blockLines = [];
      index++;
      while (index < lines.length && !/^:{2,3}$/.test(lines[index].trim())) {
        blockLines.push(lines[index]);
        index++;
      }
      html.push(renderLogaBlock(blockStart[1], blockLines, parseDirectiveAttributes(blockStart[2])));
      continue;
    }

    if (line.trim() === '---') {
      html.push('<hr>');
      continue;
    }

    if (/^###\s+/.test(line)) html.push(`<h3>${renderInlineMarkdown(line.replace(/^###\s+/, ''))}</h3>`);
    else if (/^##\s+/.test(line)) html.push(`<h2>${renderInlineMarkdown(line.replace(/^##\s+/, ''))}</h2>`);
    else if (/^#\s+/.test(line)) html.push(`<h1>${renderInlineMarkdown(line.replace(/^#\s+/, ''))}</h1>`);
    else if (/^>\s+/.test(line)) html.push(`<blockquote>${renderInlineMarkdown(line.replace(/^>\s+/, ''))}</blockquote>`);
    else if (!line.trim()) html.push('');
    else html.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  return html.join('');
}
