import { collectBlock, collectChildBlocks, parseAttrs, parseOptions, parseKeyValues, parseRecords } from './parser.js';
import { escapeHtml, inline, renderDl, renderWarning } from './html.js';
import { ELEMENT_REGISTRY } from './element-registry.js';
import { renderRegisteredElement } from './registry-renderer.js';

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

  if (block === 'focus') {
    return `<section class="loga-focus"><p class="eyebrow">${escapeHtml(value('status') || 'focus')}</p><p class="question">${inline(value('question') || 'What matters?')}</p><p class="answer">${inline(value('answer'))}</p></section>`;
  }

  if (['roadmap', 'task_list', 'run_list', 'promotion_list', 'cicd_list', 'turn_list', 'memory', 'checklist'].includes(block)) {
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
