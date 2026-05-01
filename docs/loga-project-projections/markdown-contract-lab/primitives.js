import { collectBlock, collectChildBlocks, parseAttrs, parseOptions, parseKeyValues, parseRecords } from './parser.js';
import { escapeHtml, inline, renderDl } from './html.js';

export function renderPrimitiveBlock({ block, name, lines, attrs, renderBlock }) {
  const records = parseRecords(lines);
  const keyValues = parseKeyValues(lines);
  const value = (key) => keyValues[key] || attrs[key] || '';

  if (block === 'toolbar_zone') {
    const children = collectChildBlocks(lines);
    return children.map((child) => renderBlock(child.name, child.lines, child.attrs)).join('');
  }

  if (block === 'grid') {
    const columns = Number.parseInt(attrs.columns || value('columns') || '2', 10);
    const safeColumns = Number.isFinite(columns) ? Math.min(Math.max(columns, 1), 6) : 2;
    const children = collectChildBlocks(lines);
    return `<section class="loga-grid" style="--columns: ${safeColumns}">${children.map((child) => renderBlock(child.name, child.lines, child.attrs)).join('')}</section>`;
  }

  if (block === 'split') {
    const [left = '2', right = '1'] = String(attrs.ratio || value('ratio') || '2:1').split(':');
    const panes = splitIntoPanes(lines);
    return `<section class="loga-split" style="--left: ${escapeHtml(left)}fr; --right: ${escapeHtml(right)}fr">${panes.slice(0, 2).map((pane) => `<div class="loga-split__pane">${renderFlowLines(pane, renderBlock)}</div>`).join('')}</section>`;
  }

  if (block === 'focus_strip') {
    const model = parseFocusStrip(lines);
    return `
      <section class="loga-focus-strip">
        <div>
          <p class="eyebrow">Primary question</p>
          <h2>${inline(model.question || 'What should I care about right now?')}</h2>
          ${model.answer ? `<p>${inline(model.answer)}</p>` : ''}
        </div>
        ${model.secondary.length ? `<ul>${model.secondary.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>` : ''}
        ${model.status ? `<span class="loga-toolbar__status">${escapeHtml(model.status)}</span>` : ''}
      </section>
    `;
  }

  if (block === 'metric_row') {
    return `<section class="loga-metric-row">${records.map((record) => `<article class="loga-metric"><span>${escapeHtml(record.label || 'Metric')}</span><strong>${escapeHtml(record.value || '-')}</strong></article>`).join('')}</section>`;
  }

  if (block === 'timeline') {
    return `<ol class="loga-timeline">${records.map((record) => `<li data-status="${escapeHtml(record.status || 'pending')}"><strong>${escapeHtml(record.step || record.label || 'Step')}</strong><span>${escapeHtml(record.status || 'pending')}</span></li>`).join('')}</ol>`;
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

  if (block === 'action_rail') {
    const actions = lines.map((line) => line.trim()).filter((line) => line.startsWith('- '));
    return `<aside class="loga-action-rail">${actions.map((line) => `<button class="loga-action" type="button">${escapeHtml(line.slice(2))}</button>`).join('')}</aside>`;
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
    const variant = attrs.variant || value('variant') || 'default';
    if (variant === 'comparison') return renderComparisonPanel(lines, title);
    const detailEntries = Object.entries(keyValues).filter(([key]) => !['title', 'summary'].includes(key));
    const listItems = lines.map((line) => line.trim()).filter((line) => line.startsWith('- '));
    const childBlocks = collectChildBlocks(lines);
    return `
      <section class="loga-panel loga-panel--${escapeHtml(variant)}">
        ${title ? `<h3>${inline(title)}</h3>` : ''}
        ${summary ? `<p>${inline(summary)}</p>` : ''}
        ${listItems.length ? `<ul>${listItems.map((line) => `<li>${inline(line.slice(2))}</li>`).join('')}</ul>` : ''}
        ${detailEntries.length ? renderDl(Object.fromEntries(detailEntries)) : ''}
        ${childBlocks.map((child) => renderBlock(child.name, child.lines, child.attrs)).join('')}
      </section>
    `;
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
  const model = { question: '', answer: '', secondary: [], status: '' };
  let section = '';
  lines.forEach((raw) => {
    const line = raw.trim();
    if (/^(primary|secondary):$/.test(line)) {
      section = line.replace(':', '');
      return;
    }
    const pair = line.match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?$/);
    if (pair && section === 'primary') model[pair[1]] = pair[2];
    else if (pair && pair[1] === 'status') model.status = pair[2];
    else if (section === 'secondary' && line.startsWith('- ')) model.secondary.push(line.slice(2).replace(/^"|"$/g, ''));
  });
  return model;
}

function renderComparisonPanel(lines, fallbackTitle) {
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
  return `
    <section class="loga-panel loga-panel--comparison">
      ${fallbackTitle ? `<h3>${inline(fallbackTitle)}</h3>` : ''}
      <div class="loga-comparison">
        ${['left', 'right'].map((key) => `<article><h4>${inline(sides[key].title)}</h4><ul>${sides[key].items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul></article>`).join('')}
      </div>
    </section>
  `;
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
