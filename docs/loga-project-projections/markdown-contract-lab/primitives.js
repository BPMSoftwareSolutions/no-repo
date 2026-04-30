import { collectChildBlocks, parseOptions, parseKeyValues, parseRecords } from './parser.js';
import { escapeHtml, inline, renderDl } from './html.js';

export function renderPrimitiveBlock({ block, name, lines, attrs, renderBlock }) {
  const records = parseRecords(lines);
  const keyValues = parseKeyValues(lines);
  const value = (key) => keyValues[key] || attrs[key] || '';

  if (block === 'toolbar_zone') {
    const children = collectChildBlocks(lines);
    return children.map((child) => renderBlock(child.name, child.lines, child.attrs)).join('');
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

  if (block === 'status') {
    return `<span class="loga-toolbar__status">${escapeHtml(value('label') || value('status') || lines.join(' ').trim())}</span>`;
  }

  if (block === 'breadcrumb') {
    return `<nav class="loga-breadcrumb" aria-label="Projection path">${records.map((record) => `<a href="#">${escapeHtml(record.label || record.projection_type || 'Open')}</a>`).join('')}</nav>`;
  }

  if (block === 'surface') {
    const type = value('type') || 'surface';
    const priority = value('priority');
    const summary = value('summary');
    return `<section class="loga-surface"><p class="eyebrow">${escapeHtml([type.replaceAll('_', ' '), priority].filter(Boolean).join(' / '))}</p>${summary ? `<p class="answer">${inline(summary)}</p>` : ''}</section>`;
  }

  if (block === 'focus') {
    return `<section class="loga-focus"><p class="eyebrow">${escapeHtml(value('status') || 'focus')}</p><p class="question">${inline(value('question') || 'What matters?')}</p><p class="answer">${inline(value('answer'))}</p></section>`;
  }

  if (block === 'panel') {
    const title = value('title');
    const summary = value('summary');
    const detailEntries = Object.entries(keyValues).filter(([key]) => !['title', 'summary'].includes(key));
    return `<section class="loga-panel">${title ? `<h3>${inline(title)}</h3>` : ''}${summary ? `<p>${inline(summary)}</p>` : ''}${detailEntries.length ? renderDl(Object.fromEntries(detailEntries)) : ''}</section>`;
  }

  if (['roadmap', 'task_list', 'run_list', 'promotion_list', 'cicd_list', 'turn_list', 'memory', 'checklist'].includes(block)) {
    return `<section class="loga-list ${escapeHtml(block)}">${records.map((record) => {
      const title = record.title || record.label || record.text || record.reminder || record.key || (record.turn ? `Turn ${record.turn}` : 'Untitled');
      const status = [record.status, record.priority, record.progress, record.stage, record.tier].filter(Boolean).join(' | ');
      return `<a class="loga-list-item" href="#"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(status)}</span></a>`;
    }).join('')}</section>`;
  }

  if (block === 'nav') {
    return `<nav class="loga-nav">${records.map((record) => `<a class="loga-pill" href="#">${escapeHtml(record.label || 'Open')}</a>`).join('')}</nav>`;
  }

  if (block === 'next_actions') {
    return `<section class="loga-actions">${lines.map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => `<button type="button">${escapeHtml(line.slice(2))}</button>`).join('')}</section>`;
  }

  if (block === 'evidence_drawer') {
    return `<details><summary>Evidence Drawer</summary><pre><code>${escapeHtml(lines.join('\n'))}</code></pre></details>`;
  }

  if (['toolbar', 'search', 'select', 'filter_group', 'action_group'].includes(block)) {
    return '';
  }

  return `<section class="loga-panel primitive"><h3>${escapeHtml(name.replaceAll('_', ' '))}</h3>${renderDl(attrs)}${lines.some((line) => line.trim()) ? `<p>${inline(lines.join(' '))}</p>` : ''}</section>`;
}
