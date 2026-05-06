import { collectBlock, collectChildBlocks, parseAttrs, parseOptions, parseKeyValues, parseRecords } from './parser.js';
import { escapeHtml, inline, renderDl, renderWarning } from './html.js';
import { ELEMENT_REGISTRY } from './element-registry.js';
import { renderRegisteredElement } from './registry-renderer.js';

export function renderPrimitiveBlock({ block, name, lines, attrs, renderBlock, dataContext = {} }) {
  const records = parseRecords(lines);
  const keyValues = parseKeyValues(lines);
  const value = (key) => keyValues[key] || attrs[key] || '';

  if (block === 'each') {
    const source = attrs.source;
    const targetBlock = attrs.block || 'list';
    const items = dataContext[source];
    if (!items || !items.length) {
      return `<p style="color:var(--muted);font:12px/1.4 var(--mono);margin:12px 0">No ${escapeHtml(source || 'data')} available.</p>`;
    }
    const expandedLines = items.flatMap(item =>
      lines.map(line => line.replace(/\{\{([^}]+)\}\}/g, (_, k) => {
        const val = item[k.trim()];
        return val != null ? String(val) : '';
      }))
    );
    return renderBlock(targetBlock, expandedLines, {});
  }

  if (block === 'toolbar_zone') {
    const children = collectChildBlocks(lines);
    return children.map((child) => renderBlock(child.name, child.lines, child.attrs)).join('');
  }

  if (block === 'grid') {
    const columns = Number.parseInt(attrs.columns || value('columns') || '2', 10);
    const safeColumns = Number.isFinite(columns) ? Math.min(Math.max(columns, 1), 6) : 2;
    const children = collectChildBlocks(lines);
    const gap = normalizeGap(attrs.gap || value('gap'));
    return `<section class="loga-grid" style="--loga-grid-columns: ${safeColumns}; --loga-grid-gap: ${gap}">${children.map((child) => renderBlock(child.name, child.lines, child.attrs)).join('')}</section>`;
  }

  if (block === 'split') {
    const [left = '2', right = '1'] = String(attrs.ratio || value('ratio') || '2:1').split(':');
    const panes = splitIntoPanes(lines);
    return `<section class="loga-split" style="--loga-split-left: ${escapeHtml(left)}fr; --loga-split-right: ${escapeHtml(right)}fr">${panes.slice(0, 2).map((pane) => `<div class="loga-split__pane">${renderFlowLines(pane, renderBlock)}</div>`).join('')}</section>`;
  }

  if (block === 'stack') {
    const gap = normalizeGap(attrs.gap || value('gap'));
    const children = collectChildBlocks(lines);
    return `<section class="loga-stack" style="--loga-stack-gap: ${gap}">${children.map((child) => renderBlock(child.name, child.lines, child.attrs)).join('')}</section>`;
  }

  if (block === 'rail') {
    const side = attrs.side || value('side') || 'right';
    const children = collectChildBlocks(lines);
    return `<aside class="loga-rail loga-rail--${escapeHtml(side)}" data-side="${escapeHtml(side)}">${children.map((child) => renderBlock(child.name, child.lines, child.attrs)).join('')}</aside>`;
  }

  if (ELEMENT_REGISTRY[block]) {
    return renderRegisteredElement(
      ELEMENT_REGISTRY[block],
      createRegistryModel({ block, lines, attrs, records, keyValues, value, renderBlock }),
    );
  }

  if (block === 'decision_panel') {
    const options = parseOptions(lines);
    return `
      <section class="loga-decision-panel">
        <p class="eyebrow">Decision Required</p>
        <h3>${inline(value('question') || 'What should happen next?')}</h3>
        <div class="loga-action-group">${options.map((option) => `<button class="loga-action" type="button">${escapeHtml(option)}</button>`).join('')}</div>
        ${value('confidence') ? `<p class="loga-confidence">Confidence: <strong>${escapeHtml(value('confidence'))}</strong></p>` : ''}
      </section>
    `;
  }

  if (block === 'tree') {
    return `<nav class="loga-tree" aria-label="Workspace tree">${renderTree(lines)}</nav>`;
  }

  if (block === 'search') {
    return `<div class="loga-control loga-control--search"><label>Search</label><input type="search" value="" placeholder="${escapeHtml(value('placeholder') || 'Search...')}"></div>`;
  }

  if (block === 'select') {
    const options = parseOptions(lines);
    const selected = value('value');
    return `
      <div class="loga-control">
        <label>${escapeHtml(value('label') || 'Select')}</label>
        <select>${options.map((option) => `<option${option === selected ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select>
      </div>
    `;
  }

  if (block === 'filter_group' || block === 'filters') {
    return `<div class="loga-chip-group">${records.map((record) => `<span class="loga-chip">${escapeHtml(record.label || 'Filter')}</span>`).join('')}</div>`;
  }

  if (block === 'action_group' || block === 'actions') {
    return `<div class="loga-action-group">${records.map((record) => `<button class="loga-action" type="button">${escapeHtml(record.label || 'Action')}</button>`).join('')}</div>`;
  }

  if (block === 'action') {
    const label = value('label') || attrs.label || lines.join(' ').trim() || 'Action';
    const endpoint = value('endpoint') || attrs.endpoint || '';
    const method = value('method') || attrs.method || 'GET';
    return `<div class="loga-action-group"><button class="loga-action" type="button" data-endpoint="${escapeHtml(endpoint)}" data-method="${escapeHtml(method)}">${escapeHtml(label)}</button></div>`;
  }

  if (block === 'status') {
    return `<span class="loga-toolbar__status">${escapeHtml(value('label') || value('status') || lines.join(' ').trim())}</span>`;
  }

  if (block === 'breadcrumb') {
    return `<nav class="loga-breadcrumb" aria-label="Projection path">${records.map((record) => `<a href="${escapeHtml(record.target || record.projection_type || '#')}">${escapeHtml(record.label || record.projection_type || 'Open')}</a>`).join('')}</nav>`;
  }

  if (block === 'surface') {
    const type = value('type') || 'surface';
    const priority = value('priority');
    const summary = value('summary');
    return `<section class="loga-surface"><p class="eyebrow">${escapeHtml([type.replaceAll('_', ' '), priority].filter(Boolean).join(' / '))}</p>${summary ? `<p class="answer">${inline(summary)}</p>` : ''}</section>`;
  }

  if (block === 'empty_state') {
    const message = value('message') || lines.map((line) => line.trim()).filter(Boolean).join(' ') || 'No data available.';
    return `<section class="empty-state"><p>${inline(message)}</p></section>`;
  }

  if (block === 'related_documents') {
    if (!records.length) return '';
    return `<section class="loga-list related-documents">${records.map((record) => {
      const title = record.label || record.title || record.projection_type || record.target || 'Related document';
      const relation = record.relation || '';
      const projectionType = record.projection_type || '';
      const key = record.projection_id || record.key || '';
      const href = record.target || record.projection_type || '#';
      return `<a class="loga-list-item related-documents__item" href="${escapeHtml(href)}" data-block="related_documents" data-key="${escapeHtml(key)}"${relation ? ` data-relation="${escapeHtml(relation)}"` : ''}><span class="related-documents__icon" aria-hidden="true">↗</span><span class="related-documents__body"><strong>${escapeHtml(title)}</strong>${projectionType ? `<span class="related-documents__type">${escapeHtml(projectionType)}</span>` : ''}</span>${relation ? `<span class="related-documents__meta">${escapeHtml(relation)}</span>` : ''}</a>`;
    }).join('')}</section>`;
  }

  if (block === 'focus') {
    return `<section class="loga-focus"><p class="eyebrow">${escapeHtml(value('status') || 'focus')}</p><p class="question">${inline(value('question') || 'What matters?')}</p><p class="answer">${inline(value('answer'))}</p></section>`;
  }

  if (block === 'task_list') {
    return `<section class="loga-list task-list">${records.map((record) => {
      const title = record.title || record.label || record.text || record.key || 'Untitled task';
      const owner = record.owner || '';
      const status = record.status || '';
      const priority = record.priority || '';
      const progress = record.progress || '';
      const href = record.target || record.projection_type || record.key || '#';
      const key = record.key || '';
      const typeLine = owner ? `<span class="task-list__type">owner: ${escapeHtml(owner)}</span>` : '';
      const badges = [status, priority, progress].filter(Boolean).map((entry) => `<span class="task-list__meta">${escapeHtml(entry)}</span>`).join('');
      return `<a class="loga-list-item task-list__item" href="${escapeHtml(href)}" data-block="task_list" data-key="${escapeHtml(key)}"><span class="task-list__icon" aria-hidden="true">●</span><span class="task-list__body"><strong>${escapeHtml(title)}</strong>${typeLine}</span>${badges || '<span class="task-list__meta">open</span>'}</a>`;
    }).join('')}</section>`;
  }

  if (block === 'run_list') {
    return `<section class="loga-list run-list">${records.map((record) => {
      const title = record.title || record.label || record.key || 'Untitled run';
      const stage = record.stage || '';
      const status = record.status || '';
      const href = record.target || record.projection_type || record.key || '#';
      const key = record.key || '';
      const stageLine = stage ? `<span class="run-list__type">${escapeHtml(stage)}</span>` : '';
      const statusBadge = status ? `<span class="run-list__meta">${escapeHtml(status)}</span>` : '<span class="run-list__meta">open</span>';
      return `<a class="loga-list-item run-list__item" href="${escapeHtml(href)}" data-block="run_list" data-key="${escapeHtml(key)}"><span class="run-list__icon" aria-hidden="true">▶</span><span class="run-list__body"><strong>${escapeHtml(title)}</strong>${stageLine}</span>${statusBadge}</a>`;
    }).join('')}</section>`;
  }

  if (block === 'promotion_list') {
    return `<section class="loga-list promotion-list">${records.map((record) => {
      const title = record.title || record.label || record.key || 'Untitled promotion';
      const impact = record.impact || '';
      const status = record.status || '';
      const href = record.target || record.projection_type || record.key || '#';
      const key = record.key || '';
      const impactLine = impact ? `<span class="promotion-list__type">${escapeHtml(impact)}</span>` : '';
      const statusBadge = status ? `<span class="promotion-list__meta">${escapeHtml(status)}</span>` : '<span class="promotion-list__meta">open</span>';
      return `<a class="loga-list-item promotion-list__item" href="${escapeHtml(href)}" data-block="promotion_list" data-key="${escapeHtml(key)}"><span class="promotion-list__icon" aria-hidden="true">◆</span><span class="promotion-list__body"><strong>${escapeHtml(title)}</strong>${impactLine}</span>${statusBadge}</a>`;
    }).join('')}</section>`;
  }

  if (block === 'cicd_list') {
    return `<section class="loga-list cicd-list">${records.map((record) => {
      const title = record.name || record.title || record.label || record.key || 'Untitled workflow';
      const result = record.last_result || '';
      const status = record.status || '';
      const href = record.target || record.projection_type || record.key || '#';
      const key = record.key || '';
      const resultLine = result ? `<span class="cicd-list__type">${escapeHtml(result)}</span>` : '';
      const statusBadge = status ? `<span class="cicd-list__meta">${escapeHtml(status)}</span>` : '<span class="cicd-list__meta">open</span>';
      return `<a class="loga-list-item cicd-list__item" href="${escapeHtml(href)}" data-block="cicd_list" data-key="${escapeHtml(key)}"><span class="cicd-list__icon" aria-hidden="true">▣</span><span class="cicd-list__body"><strong>${escapeHtml(title)}</strong>${resultLine}</span>${statusBadge}</a>`;
    }).join('')}</section>`;
  }

  if (block === 'turn_list') {
    return `<section class="loga-list turn-list">${records.map((record) => {
      const title = record.action || record.title || record.label || (record.turn ? `Turn ${record.turn}` : 'Turn');
      const evidence = record.evidence || '';
      const status = record.status || '';
      const href = record.target || record.projection_type || (record.turn ? String(record.turn) : '') || '#';
      const key = record.key || record.turn || '';
      const evidenceLine = evidence ? `<span class="turn-list__type">${escapeHtml(evidence)}</span>` : '';
      const statusBadge = status ? `<span class="turn-list__meta">${escapeHtml(status)}</span>` : '<span class="turn-list__meta">open</span>';
      return `<a class="loga-list-item turn-list__item" href="${escapeHtml(href)}" data-block="turn_list" data-key="${escapeHtml(key)}"><span class="turn-list__icon" aria-hidden="true">↺</span><span class="turn-list__body"><strong>${escapeHtml(title)}</strong>${evidenceLine}</span>${statusBadge}</a>`;
    }).join('')}</section>`;
  }

  if (block === 'memory') {
    return `<section class="loga-list memory-list">${records.map((record) => {
      const title = record.reminder || record.text || record.title || record.label || 'Memory reminder';
      const tier = record.tier || '';
      const href = record.target || record.projection_type || record.key || '#';
      const key = record.key || '';
      const tierBadge = tier ? `<span class="memory-list__meta">${escapeHtml(tier)}</span>` : '<span class="memory-list__meta">note</span>';
      return `<a class="loga-list-item memory-list__item" href="${escapeHtml(href)}" data-block="memory" data-key="${escapeHtml(key)}"><span class="memory-list__icon" aria-hidden="true">◌</span><span class="memory-list__body"><strong>${escapeHtml(title)}</strong></span>${tierBadge}</a>`;
    }).join('')}</section>`;
  }

  if (block === 'checklist') {
    return `<section class="loga-list checklist-list">${records.map((record) => {
      const title = record.text || record.title || record.label || record.reminder || 'Checklist item';
      const status = record.status || '';
      const href = record.target || record.projection_type || record.key || '#';
      const key = record.key || '';
      const statusBadge = status ? `<span class="checklist-list__meta">${escapeHtml(status)}</span>` : '<span class="checklist-list__meta">open</span>';
      return `<a class="loga-list-item checklist-list__item" href="${escapeHtml(href)}" data-block="checklist" data-key="${escapeHtml(key)}"><span class="checklist-list__icon" aria-hidden="true">✓</span><span class="checklist-list__body"><strong>${escapeHtml(title)}</strong></span>${statusBadge}</a>`;
    }).join('')}</section>`;
  }

  if (block === 'portfolio_grid') {
    if (!records.length) return '<section class="portfolio-grid"><p class="empty-state">No projects found.</p></section>';
    return `<section class="portfolio-grid">${records.map((record) => {
      const name = record.name || record.label || record.title || 'Untitled project';
      const status = record.status || 'unknown';
      const pct = parseFloat(record.completion_pct ?? record.completion ?? 0);
      const safePct = Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 0));
      const doneItems = record.done_items != null ? record.done_items : '';
      const totalItems = record.total_items != null ? record.total_items : '';
      const countLabel = doneItems !== '' && totalItems !== '' ? `${doneItems} of ${totalItems} tasks` : '';
      const pctLabel = `${safePct.toFixed(0)}%`;
      const tier = safePct >= 80 ? 'high' : safePct >= 30 ? 'mid' : 'low';
      const activeItem = record.active_item && record.active_item !== 'None' ? record.active_item : '';
      const blockers = record.blockers != null ? Number(record.blockers) : 0;
      const lastRun = record.last_run ? formatRelativeTime(record.last_run) : '';
      const projectId = record.project_id || record.id || '';
      const href = record.target
        || (projectId
          ? `projection-detail.html?type=operator.project_detail&projectId=${encodeURIComponent(projectId)}`
          : '#');
      return `<a class="portfolio-project-card" href="${escapeHtml(href)}" data-status="${escapeHtml(status)}" data-tier="${escapeHtml(tier)}">
  <div class="portfolio-project-card__header">
    <strong class="portfolio-project-card__name">${escapeHtml(name)}</strong>
    <span class="portfolio-project-card__status" data-status="${escapeHtml(status)}">${escapeHtml(status)}</span>
  </div>
  <div class="portfolio-progress" data-tier="${escapeHtml(tier)}" aria-label="${escapeHtml(pctLabel)} complete">
    <div class="portfolio-progress__bar" style="width:${safePct.toFixed(2)}%"></div>
  </div>
  <div class="portfolio-project-card__meta">
    <span class="portfolio-project-card__pct">${escapeHtml(pctLabel)}${countLabel ? ` &middot; ${escapeHtml(countLabel)}` : ''}</span>
    ${blockers > 0 ? `<span class="portfolio-project-card__blockers">${blockers} blocked</span>` : ''}
  </div>
  ${activeItem ? `<div class="portfolio-project-card__active"><span class="portfolio-project-card__active-label">Active:</span> ${escapeHtml(activeItem)}</div>` : ''}
  ${lastRun ? `<div class="portfolio-project-card__last-run">Last run ${escapeHtml(lastRun)}</div>` : ''}
</a>`;
    }).join('')}</section>`;
  }

  if (['roadmap'].includes(block)) {
    return `<section class="loga-list ${escapeHtml(block)}">${records.map((record) => {
      const title = record.title || record.label || record.text || record.reminder || record.key || (record.turn ? `Turn ${record.turn}` : 'Untitled');
      const status = [record.status, record.priority, record.progress, record.stage, record.tier].filter(Boolean).join(' | ');
      const href = record.target || record.projection_type || record.key || (record.turn ? String(record.turn) : '') || '#';
      return `<a class="loga-list-item" href="${escapeHtml(href)}" data-block="${escapeHtml(block)}" data-key="${escapeHtml(record.key || record.turn || '')}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(status)}</span></a>`;
    }).join('')}</section>`;
  }

  if (block === 'nav') {
    return `<nav class="loga-nav">${records.map((record) => `<a class="loga-pill" href="${escapeHtml(record.target || record.projection_type || '#')}">${escapeHtml(record.label || 'Open')}</a>`).join('')}</nav>`;
  }

  if (block === 'next_actions') {
    return `<section class="loga-actions">${lines.map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => `<button type="button">${escapeHtml(line.slice(2))}</button>`).join('')}</section>`;
  }

  if (block === 'portfolio_gauge') {
    const pct = parseFloat(value('completion_pct') || 0);
    const safePct = Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 0));
    const completed = value('completed_items') || '';
    const total = value('total_items') || '';
    const inProgress = value('in_progress') || '';
    const blocked = value('blocked') || '';
    const awaiting = value('awaiting_review') || '';
    const tier = safePct >= 80 ? 'high' : safePct >= 30 ? 'mid' : 'low';
    const tierColor = { high: '#22c55e', mid: '#f59e0b', low: '#ef4444' }[tier];
    const R = 75; const gx = 100; const gy = 110;
    const toRad = (d) => (d * Math.PI) / 180;
    const pt = (deg) => [gx + R * Math.cos(toRad(deg)), gy + R * Math.sin(toRad(deg))];
    const [sx, sy] = pt(135);
    const [ex, ey] = pt(45);
    const bgPath = `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${R} ${R} 0 1 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
    const fillDeg = 270 * safePct / 100;
    let fillPath = '';
    if (fillDeg > 0.5) {
      const [fx, fy] = pt(135 + Math.min(fillDeg, 269.99));
      const la = fillDeg > 180 ? 1 : 0;
      fillPath = `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${R} ${R} 0 ${la} 1 ${fx.toFixed(2)} ${fy.toFixed(2)}`;
    }
    const stats = [
      completed ? { label: 'done', val: completed, mod: '' } : null,
      total ? { label: 'total items', val: total, mod: '' } : null,
      inProgress && inProgress !== '0' ? { label: 'in progress', val: inProgress, mod: 'progress' } : null,
      blocked && blocked !== '0' ? { label: 'blocked', val: blocked, mod: 'blocked' } : null,
      awaiting && awaiting !== '0' ? { label: 'review', val: awaiting, mod: 'review' } : null,
    ].filter(Boolean);
    return `<div class="portfolio-gauge" data-tier="${escapeHtml(tier)}"><svg class="portfolio-gauge__svg" viewBox="0 0 200 200" aria-label="${escapeHtml(pct.toFixed(1))} percent complete"><path class="portfolio-gauge__track" d="${bgPath}" fill="none" stroke-width="14" stroke-linecap="round"/>${fillPath ? `<path class="portfolio-gauge__fill" d="${fillPath}" fill="none" stroke="${escapeHtml(tierColor)}" stroke-width="14" stroke-linecap="round"/>` : ''}<text class="portfolio-gauge__pct-text" x="${gx}" y="102" text-anchor="middle">${escapeHtml(pct.toFixed(1))}%</text><text class="portfolio-gauge__sub-text" x="${gx}" y="122" text-anchor="middle">complete</text></svg><div class="portfolio-gauge__stats">${stats.map((s) => `<span class="portfolio-gauge__stat${s.mod ? ` portfolio-gauge__stat--${s.mod}` : ''}"><strong>${escapeHtml(String(s.val))}</strong><em>${escapeHtml(s.label)}</em></span>`).join('')}</div></div>`;
  }

  if (block === 'bucket_chart') {
    const pairs = lines.map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = l.match(/^(.+?):\s*(\d+)/);
      return m ? { label: m[1].trim(), value: parseInt(m[2], 10) } : null;
    }).filter(Boolean);
    if (!pairs.length) return '';
    const total = pairs.reduce((sum, p) => sum + p.value, 0) || 1;
    const palette = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#64748b', '#0ea5e9'];
    const bar = pairs.filter((p) => p.value > 0).map((p, i) => {
      const segPct = (p.value / total * 100).toFixed(3);
      const color = palette[i % palette.length];
      return `<span class="bucket-chart__segment" style="width:${segPct}%;background:${color}" title="${escapeHtml(p.label)}: ${p.value}" aria-hidden="true"></span>`;
    }).join('');
    const legend = pairs.map((p, i) => {
      const color = palette[i % palette.length];
      const segPct = (p.value / total * 100).toFixed(1);
      return `<div class="bucket-chart__item"><span class="bucket-chart__swatch" style="background:${color}" aria-hidden="true"></span><span class="bucket-chart__item-label">${escapeHtml(p.label)}</span><strong class="bucket-chart__item-count">${p.value}</strong><span class="bucket-chart__item-pct">${segPct}%</span></div>`;
    }).join('');
    return `<div class="bucket-chart"><div class="bucket-chart__bar" role="img" aria-label="Project distribution">${bar}</div><div class="bucket-chart__legend">${legend}</div></div>`;
  }

  if (block === 'evidence_drawer') {
    return `<details class="loga-evidence-drawer"><summary>${escapeHtml(value('title') || 'Evidence')}</summary><pre><code>${escapeHtml(lines.join('\n'))}</code></pre></details>`;
  }

  if (block === 'kv') {
    const pairs = lines.map((l) => l.trim()).filter(Boolean).map((l) => { const m = l.match(/^(.+?):\s*(.*)$/); return m ? { label: m[1].trim(), value: m[2].trim() } : null; }).filter(Boolean);
    return `<dl class="loga-kv">${pairs.map((p) => `<dt>${escapeHtml(p.label)}</dt><dd>${escapeHtml(p.value)}</dd>`).join('')}</dl>`;
  }

  if (block === 'table') {
    const parseRow = (l) => l.trim().slice(1, -1).split('|').map((c) => c.trim());
    const allRows = lines.filter((l) => l.trim().startsWith('|'));
    const dataRows = allRows.filter((l) => !/^\|[-:\s|]+\|?$/.test(l.trim()));
    if (!dataRows.length) return '';
    const [headerRow, ...bodyRows] = dataRows;
    const headers = parseRow(headerRow).filter(Boolean);
    const thead = `<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${bodyRows.map((row) => `<tr>${parseRow(row).filter(Boolean).map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`;
    return `<table class="loga-table">${thead}${tbody}</table>`;
  }

  if (['toolbar', 'search', 'select', 'filter_group', 'action_group'].includes(block)) {
    return '';
  }

  return renderWarning({
    title: 'Unsupported block',
    detail: `No renderer contract exists for directive "${name}".`,
    code: [`::${name}`, ...lines, '::'].join('\n'),
  });
}

function normalizeGap(gap) {
  const gaps = { sm: '8px', md: '16px', lg: '24px' };
  if (!gap) return gaps.md;
  return gaps[gap] || gap;
}

function createRegistryModel({ block, lines, attrs, records, keyValues, value, renderBlock }) {
  if (block === 'action_rail') {
    return {
      items: lines.map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => ({ label: line.slice(2) })),
    };
  }

  if (block === 'status_badge') {
    return {
      fields: {
        label: value('label') || value('status') || lines.join(' ').trim(),
      },
    };
  }

  if (block === 'focus_strip') {
    return parseFocusStrip(lines);
  }

  if (block === 'panel') {
    const variant = attrs.variant || value('variant') || 'default';
    const childBlocks = collectChildBlocks(lines);
    const detailEntries = Object.entries(keyValues).filter(([key]) => !['title', 'summary', 'status', 'content', 'variant'].includes(key));
    const childHtml = variant === 'comparison'
      ? renderComparisonContent(lines)
      : [
        detailEntries.length ? renderDl(Object.fromEntries(detailEntries)) : '',
        childBlocks.map((child) => renderBlock(child.name, child.lines, child.attrs)).join(''),
      ].join('');

    return {
      variant,
      fields: {
        title: value('title'),
        status: value('status'),
        summary: value('summary'),
      },
      listItems: variant === 'comparison'
        ? []
        : lines.map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => line.slice(2)),
      childrenHtml: childHtml,
    };
  }

  if (block === 'metric_row') {
    if (!lines.some((l) => l.trim().startsWith('- '))) {
      const items = lines.map((l) => l.trim()).filter(Boolean).map((l) => { const m = l.match(/^(.+?):\s*(.+)$/); return m ? { label: m[1].trim(), value: m[2].trim() } : null; }).filter(Boolean);
      return { items };
    }
    return { items: records, fields: keyValues };
  }
  return { items: records, fields: keyValues };
}

function renderFlowLines(lines, renderBlock) {
  const html = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const directive = line.trim().match(/^:{2,3}([a-zA-Z0-9_]+)(?:\s+(.*))?$/);
    if (directive) {
      const collected = collectBlock(lines, index);
      html.push(renderBlock(directive[1], collected.lines, parseAttrs(directive[2])));
      index = collected.endIndex;
      continue;
    }
    if (/^\s*##\s+/.test(line)) html.push(`<h2>${inline(line.replace(/^\s*##\s+/, ''))}</h2>`);
    else if (/^\s*#\s+/.test(line)) html.push(`<h1>${inline(line.replace(/^\s*#\s+/, ''))}</h1>`);
    else if (line.trim()) html.push(`<p>${inline(line.trim())}</p>`);
  }
  return html.join('');
}

function splitIntoPanes(lines) {
  const headingIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^\s*##\s+/.test(line));
  if (headingIndexes.length >= 2) {
    return [
      lines.slice(headingIndexes[0].index, headingIndexes[1].index),
      lines.slice(headingIndexes[1].index),
    ];
  }
  const children = collectChildBlocks(lines);
  if (children.length >= 2) return children.slice(0, 2).map((child) => [`::${child.name}`, ...child.lines, '::']);
  return [lines];
}

function parseFocusStrip(lines) {
  const model = { fields: { primary: {} }, secondary: [] };
  let section = '';
  lines.forEach((raw) => {
    const line = raw.trim();
    if (/^(primary|secondary):$/.test(line)) {
      section = line.replace(':', '');
      return;
    }
    const pair = line.match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?$/);
    if (pair && section === 'primary') model.fields.primary[pair[1]] = pair[2];
    else if (pair && pair[1] === 'status') model.fields.status = pair[2];
    else if (section === 'secondary' && line.startsWith('- ')) model.secondary.push({ label: line.slice(2).replace(/^"|"$/g, '') });
  });
  return model;
}

function renderComparisonContent(lines) {
  const sides = { left: { title: 'Left', items: [] }, right: { title: 'Right', items: [] } };
  let side = '';
  lines.forEach((raw) => {
    const line = raw.trim();
    if (/^(left|right):$/.test(line)) {
      side = line.replace(':', '');
      return;
    }
    if (!side) return;
    const title = line.match(/^title:\s*"?([^"]*)"?$/);
    if (title) sides[side].title = title[1];
    if (line.startsWith('- ')) sides[side].items.push(line.slice(2));
  });
  return `<div class="loga-comparison">${['left', 'right'].map((key) => `<article><h4>${inline(sides[key].title)}</h4><ul>${sides[key].items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul></article>`).join('')}</div>`;
}

function renderTree(lines) {
  const html = [];
  let openChildList = false;
  lines.forEach((raw) => {
    const indent = raw.match(/^\s*/)?.[0].length || 0;
    const label = raw.trim().replace(/^- /, '');
    if (!label) return;
    if (indent === 0) {
      if (openChildList) {
        html.push('</ul></li>');
        openChildList = false;
      }
      html.push(`<li><span>${escapeHtml(label)}</span>`);
    } else {
      if (!openChildList) {
        html.push('<ul>');
        openChildList = true;
      }
      html.push(`<li><span>${escapeHtml(label)}</span></li>`);
    }
  });
  if (openChildList) html.push('</ul></li>');
  return `<ul>${html.join('')}</ul>`;
}

function formatRelativeTime(iso) {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 0) return 'just now';
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}
