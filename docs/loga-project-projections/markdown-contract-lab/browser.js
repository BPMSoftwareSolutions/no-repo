(() => {
  const SAMPLE = `---
loga_contract: "ai-engine-ui/v1"
ux_contract: "loga-ux/v1"
surface_type: "operator.projection_graph"
projection_type: "operator.project_roadmap"
source_truth: "sql"
primary_question: "What should I care about right now?"
---

::toolbar id="projection-toolbar" variant="linear"

  ::toolbar_zone name="context" align="left"
  eyebrow: "Inspection Workspace"
  status: "Agent active - Turn 3"
  ::

  ::toolbar_zone name="navigation" align="left"
  ::nav variant="pills"
  - Roadmap
  - Promotions
  - Workflows
  - CI/CD
  - Memory
  - Evidence
  ::
  ::

  ::toolbar_zone name="search" align="center"
  ::search
  placeholder: "Search projects, tasks, evidence..."
  ::
  ::

  ::toolbar_zone name="filters" align="right"
  ::filter_group variant="chips"
  - Needs Attention
  - Blocked Only
  - High Priority
  ::
  ::

  ::toolbar_zone name="actions" align="right"
  ::action_group
  - Expand Focus
  - Collapse All
  - Refresh
  ::
  ::

::

# Projection Graph

::roadmap
- key: "generic-wrapper-runtime"
  title: "Establish Generic Wrapper Runtime"
  status: "in progress"
  priority: "high"
  progress: "2 / 4 tasks complete"
::`;

  function createMarkdownContractLab(documentRef = document) {
    const input = documentRef.getElementById('markdown-input');
    const output = documentRef.getElementById('rendered-output');
    const meta = documentRef.getElementById('projection-meta');
    const diagnostics = documentRef.getElementById('diagnostics');
    const inputCount = documentRef.getElementById('input-count');
    const blockCount = documentRef.getElementById('block-count');
    const autoRender = documentRef.getElementById('auto-render');

    documentRef.getElementById('load-sample').addEventListener('click', () => {
      input.value = SAMPLE;
      render();
    });

    documentRef.getElementById('clear-input').addEventListener('click', () => {
      input.value = '';
      render();
      input.focus();
    });

    documentRef.getElementById('render-now').addEventListener('click', render);
    input.addEventListener('input', () => {
      updateCounts();
      if (autoRender.checked) render();
    });

    function render() {
      try {
        const markdown = input.value;
        updateCounts();
        const parsed = parseMarkdown(markdown);
        const validation = validateContract(markdown, parsed);
        meta.innerHTML = renderMeta(parsed.frontmatter);
        diagnostics.innerHTML = renderDiagnostics(markdown, parsed, validation).join('');
        blockCount.textContent = `${parsed.blocks.length} block${parsed.blocks.length === 1 ? '' : 's'} - rendered ${new Date().toLocaleTimeString()}`;
        output.innerHTML = markdown.trim()
          ? renderQuestionFirst(parsed) + (validation.fatal.length ? renderContractErrors(validation.fatal) : renderMarkdown(parsed.body))
          : '<div class="empty-state"><div><strong>Paste markdown to begin.</strong><p>The renderer will convert LOGA primitives into UI blocks.</p></div></div>';
      } catch (error) {
        diagnostics.innerHTML = `<li class="fail">Render error: ${escapeHtml(error.message)}</li>`;
        output.innerHTML = `<div class="empty-state"><div><strong>Render failed.</strong><p>${escapeHtml(error.message)}</p></div></div>`;
      }
    }

    function updateCounts() {
      inputCount.textContent = `${input.value.length} chars`;
    }

    input.value = SAMPLE;
    render();

    return { render, elements: { input, output, diagnostics } };
  }

  function parseMarkdown(markdown) {
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
    const frontmatter = {};
    let body = markdown;
    if (frontmatterMatch) {
      body = markdown.slice(frontmatterMatch[0].length);
      frontmatterMatch[1].split(/\r?\n/).forEach((line) => {
        const match = line.match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?$/);
        if (match) frontmatter[match[1]] = match[2];
      });
    }
    const blocks = [...body.matchAll(/^:{2,3}([a-zA-Z0-9_]+)(?:\s+[^\n]*)?$/gm)].map((match) => match[1]);
    return { frontmatter, body, blocks };
  }

  function validateContract(markdown, parsed) {
    const fatal = [];
    if (!markdown.trim()) return { fatal };
    const hasToolbar = parsed.blocks.includes('toolbar');
    const hasToolbarZones = markdown.includes('::toolbar_zone');
    const hasYamlZones = /::toolbar[^\n]*\n[\s\S]*?\nzones:\s*\n/.test(markdown);
    if (hasToolbar && !hasToolbarZones && !hasYamlZones) {
      fatal.push({
        title: 'Toolbar has no renderable zones',
        detail: 'The toolbar block exists, but there are no zones for the interpreter to place in the experience.',
        repair: 'Add at least one ::toolbar_zone block or a zones.left|center|right block inside ::toolbar.',
      });
    }
    return { fatal };
  }

  function renderDiagnostics(markdown, parsed, validation = { fatal: [] }) {
    const hasToolbar = parsed.blocks.includes('toolbar');
    const hasGrid = parsed.blocks.includes('grid');
    const hasSplit = parsed.blocks.includes('split');
    const hasYamlZones = /::toolbar[^\n]*\n[\s\S]*?\nzones:\s*\n/.test(markdown);
    const hasToolbarZones = markdown.includes('::toolbar_zone');
    const hasActions = parsed.blocks.includes('next_actions') || markdown.includes('::action_group') || markdown.includes('::actions');
    const isExperimentalContract = hasToolbar || hasGrid || hasSplit;
    const checks = [
      ['contract', Boolean(parsed.frontmatter.loga_contract) || isExperimentalContract, isExperimentalContract ? 'experimental contract' : 'Missing loga_contract'],
      ['ux contract', Boolean(parsed.frontmatter.ux_contract) || isExperimentalContract, isExperimentalContract ? 'experimental contract' : 'Missing ux_contract'],
      ['source truth', parsed.frontmatter.source_truth === 'sql' || isExperimentalContract, isExperimentalContract ? 'source truth omitted for experiment' : 'source_truth is not sql'],
      ['toolbar', hasToolbar || hasGrid || hasSplit, hasGrid || hasSplit ? 'layout-only experiment' : 'Missing ::toolbar'],
      ['zones', hasToolbarZones || hasYamlZones || hasGrid || hasSplit, hasGrid || hasSplit ? 'layout block owns flow' : 'Missing toolbar zones'],
      ['zone grammar', true, hasYamlZones ? 'YAML zones normalized into toolbar zones' : 'toolbar zone grammar'],
      ['actions', hasActions, 'Missing actions block'],
    ];
    return [
      ...validation.fatal.map((error) => `<li class="fail">${escapeHtml(error.title)}</li>`),
      ...checks.map(([label, pass, fail]) => `<li class="${pass ? 'pass' : 'warn'}">${escapeHtml(pass ? label : fail)}</li>`),
    ];
  }

  function renderMeta(frontmatter) {
    return [
      ['contract', frontmatter.loga_contract],
      ['truth', frontmatter.source_truth],
    ].filter(([, value]) => value)
      .map(([key, value]) => `<span>${escapeHtml(key)}: ${escapeHtml(value)}</span>`)
      .join('');
  }

  function renderQuestionFirst(parsed) {
    const question = parsed.frontmatter.primary_question || 'What should I care about right now?';
    const answer = findContractAnswer(parsed.body) || findToolbarStatus(parsed.body) || '';
    return `<section class="question-first"><p class="label">Primary question</p><h2>${inline(question)}</h2>${answer ? `<p class="answer">${inline(answer)}</p>` : ''}</section>`;
  }

  function renderContractErrors(errors) {
    return `<section class="contract-errors" aria-label="Contract errors">${errors.map((error) => `<article class="contract-error"><h3>${escapeHtml(error.title)}</h3><p>${escapeHtml(error.detail)}</p>${error.repair ? `<p><strong>Repair:</strong> ${escapeHtml(error.repair)}</p>` : ''}</article>`).join('')}</section>`;
  }

  function renderMarkdown(markdown) {
    const lines = markdown.split(/\r?\n/);
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
      if (/^:{2,3}$/.test(line.trim())) continue;
      if (/^###\s+/.test(line)) html.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`);
      else if (/^##\s+/.test(line)) html.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`);
      else if (/^#\s+/.test(line)) html.push(`<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`);
      else if (!line.trim()) html.push('');
      else html.push(`<p>${inline(line)}</p>`);
    }
    return html.join('');
  }

  function renderBlock(name, lines, attrs) {
    const block = name.toLowerCase();
    if (block === 'toolbar') return renderToolbar(lines, attrs);
    return renderPrimitiveBlock(block, name, lines, attrs);
  }

  function renderToolbar(lines, attrs) {
    const zones = collectToolbarZones(lines);
    if (!zones.length) {
      return renderContractErrors([{ title: 'Toolbar has no renderable zones', detail: 'The toolbar rendered no experience because it had no toolbar zones.' }]);
    }
    const toolbarValues = parseDirectToolbarKeyValues(lines);
    const variant = (attrs.variant || toolbarValues.variant) === 'linear' ? 'linear' : 'stacked';
    const toolbarContext = renderToolbarContext(toolbarValues);
    const zoneHtml = zones.map((zone) => renderToolbarZone(zone));
    if (variant === 'linear') {
      return `<header class="loga-toolbar loga-toolbar--linear" data-toolbar-variant="linear">${toolbarContext ? `<div class="loga-toolbar__zone loga-toolbar__zone--context loga-toolbar__zone--left">${toolbarContext}</div>` : ''}${zones.map((zone, index) => renderToolbarZoneShell(zone, zoneHtml[index])).join('')}</header>`;
    }
    const zonePairs = zones.map((zone, index) => ({ zone, html: zoneHtml[index] }));
    const grouped = {
      left: zonePairs.filter(({ zone }) => (zone.attrs.align || 'left') === 'left'),
      center: zonePairs.filter(({ zone }) => zone.attrs.align === 'center'),
      right: zonePairs.filter(({ zone }) => zone.attrs.align === 'right'),
    };
    return `<header class="loga-toolbar loga-toolbar--stacked" data-toolbar-variant="stacked"><div class="loga-toolbar__group loga-toolbar__group--left">${toolbarContext}${grouped.left.map(({ zone, html }) => renderToolbarZoneShell(zone, html)).join('')}</div><div class="loga-toolbar__group loga-toolbar__group--center">${grouped.center.map(({ zone, html }) => renderToolbarZoneShell(zone, html)).join('')}</div><div class="loga-toolbar__group loga-toolbar__group--right">${grouped.right.map(({ zone, html }) => renderToolbarZoneShell(zone, html)).join('')}</div></header>`;
  }

  function renderPrimitiveBlock(block, name, lines, attrs) {
    const records = parseRecords(lines);
    const keyValues = parseKeyValues(lines);
    const value = (key) => keyValues[key] || attrs[key] || '';
    if (block === 'toolbar_zone') return collectChildBlocks(lines).map((child) => renderBlock(child.name, child.lines, child.attrs)).join('');
    if (block === 'grid') {
      const columns = Number.parseInt(attrs.columns || value('columns') || '2', 10);
      const safeColumns = Number.isFinite(columns) ? Math.min(Math.max(columns, 1), 6) : 2;
      return `<section class="loga-grid" style="--columns: ${safeColumns}">${collectChildBlocks(lines).map((child) => renderBlock(child.name, child.lines, child.attrs)).join('')}</section>`;
    }
    if (block === 'split') {
      const [left = '2', right = '1'] = String(attrs.ratio || value('ratio') || '2:1').split(':');
      return `<section class="loga-split" style="--left: ${escapeHtml(left)}fr; --right: ${escapeHtml(right)}fr">${splitIntoPanes(lines).slice(0, 2).map((pane) => `<div class="loga-split__pane">${renderFlowLines(pane)}</div>`).join('')}</section>`;
    }
    if (block === 'focus_strip') {
      const model = parseFocusStrip(lines);
      return `<section class="loga-focus-strip"><div><p class="eyebrow">Primary question</p><h2>${inline(model.question || 'What should I care about right now?')}</h2>${model.answer ? `<p>${inline(model.answer)}</p>` : ''}</div>${model.secondary.length ? `<ul>${model.secondary.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>` : ''}${model.status ? `<span class="loga-toolbar__status">${escapeHtml(model.status)}</span>` : ''}</section>`;
    }
    if (block === 'metric_row') return `<section class="loga-metric-row">${records.map((record) => `<article class="loga-metric"><span>${escapeHtml(record.label || 'Metric')}</span><strong>${escapeHtml(record.value || '-')}</strong></article>`).join('')}</section>`;
    if (block === 'timeline') return `<ol class="loga-timeline">${records.map((record) => `<li data-status="${escapeHtml(record.status || 'pending')}"><strong>${escapeHtml(record.step || record.label || 'Step')}</strong><span>${escapeHtml(record.status || 'pending')}</span></li>`).join('')}</ol>`;
    if (block === 'decision_panel') {
      return `<section class="loga-decision-panel"><p class="eyebrow">Decision Required</p><h3>${inline(value('question') || 'What should happen next?')}</h3><div class="loga-action-group">${parseOptions(lines).map((option) => `<button class="loga-action" type="button">${escapeHtml(option)}</button>`).join('')}</div>${value('confidence') ? `<p class="loga-confidence">Confidence: <strong>${escapeHtml(value('confidence'))}</strong></p>` : ''}</section>`;
    }
    if (block === 'tree') return `<nav class="loga-tree" aria-label="Workspace tree">${renderTree(lines)}</nav>`;
    if (block === 'action_rail') return `<aside class="loga-action-rail">${lines.map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => `<button class="loga-action" type="button">${escapeHtml(line.slice(2))}</button>`).join('')}</aside>`;
    if (block === 'search') return `<div class="loga-control loga-control--search"><label>Search</label><input type="search" value="" placeholder="${escapeHtml(value('placeholder') || 'Search...')}"></div>`;
    if (block === 'select') {
      const selected = value('value');
      return `<div class="loga-control"><label>${escapeHtml(value('label') || 'Select')}</label><select>${parseOptions(lines).map((option) => `<option${option === selected ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></div>`;
    }
    if (block === 'filter_group' || block === 'filters') return `<div class="loga-chip-group">${records.map((record) => `<span class="loga-chip">${escapeHtml(record.label || 'Filter')}</span>`).join('')}</div>`;
    if (block === 'action_group' || block === 'actions') return `<div class="loga-action-group">${records.map((record) => `<button class="loga-action" type="button">${escapeHtml(record.label || 'Action')}</button>`).join('')}</div>`;
    if (block === 'nav') return `<nav class="loga-nav">${records.map((record) => `<a class="loga-pill" href="#">${escapeHtml(record.label || 'Open')}</a>`).join('')}</nav>`;
    if (['roadmap', 'task_list', 'run_list', 'promotion_list', 'cicd_list', 'turn_list', 'memory', 'checklist'].includes(block)) {
      return `<section class="loga-list ${escapeHtml(block)}">${records.map((record) => {
        const title = record.title || record.label || record.text || record.reminder || record.key || (record.turn ? `Turn ${record.turn}` : 'Untitled');
        const status = [record.status, record.priority, record.progress, record.stage, record.tier].filter(Boolean).join(' | ');
        return `<a class="loga-list-item" href="#"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(status)}</span></a>`;
      }).join('')}</section>`;
    }
    if (block === 'next_actions') return `<section class="loga-actions">${lines.map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => `<button type="button">${escapeHtml(line.slice(2))}</button>`).join('')}</section>`;
    if (block === 'focus') return `<section class="loga-focus"><p class="eyebrow">${escapeHtml(value('status') || 'focus')}</p><p class="question">${inline(value('question') || 'What matters?')}</p><p class="answer">${inline(value('answer'))}</p></section>`;
    if (block === 'panel') {
      const listItems = lines.map((line) => line.trim()).filter((line) => line.startsWith('- '));
      const childBlocks = collectChildBlocks(lines);
      const variant = attrs.variant || value('variant') || 'default';
      if (variant === 'comparison') return renderComparisonPanel(lines, value('title'));
      return `<section class="loga-panel loga-panel--${escapeHtml(variant)}">${value('title') ? `<h3>${inline(value('title'))}</h3>` : ''}${value('summary') ? `<p>${inline(value('summary'))}</p>` : ''}${listItems.length ? `<ul>${listItems.map((line) => `<li>${inline(line.slice(2))}</li>`).join('')}</ul>` : ''}${childBlocks.map((child) => renderBlock(child.name, child.lines, child.attrs)).join('')}</section>`;
    }
    return `<section class="loga-panel primitive"><h3>${escapeHtml(name.replaceAll('_', ' '))}</h3>${lines.some((line) => line.trim()) ? `<p>${inline(lines.join(' '))}</p>` : ''}</section>`;
  }

  function collectBlock(lines, startIndex) {
    const blockLines = [];
    let depth = 1;
    let index = startIndex + 1;
    for (; index < lines.length; index++) {
      const current = lines[index] || '';
      const trimmed = current.trim();
      const isStart = /^:{2,3}[a-zA-Z0-9_]+(?:\s+.*)?$/.test(trimmed);
      const isEnd = /^:{2,3}$/.test(trimmed);
      if (isStart) {
        depth++;
        blockLines.push(current);
        continue;
      }
      if (isEnd) {
        depth--;
        if (depth === 0) break;
        blockLines.push(current);
        continue;
      }
      blockLines.push(current);
    }
    return { lines: blockLines, endIndex: index };
  }

  function collectChildBlocks(lines) {
    const blocks = [];
    for (let index = 0; index < lines.length; index++) {
      const directive = (lines[index] || '').trim().match(/^:{2,3}([a-zA-Z0-9_]+)(?:\s+(.*))?$/);
      if (!directive) continue;
      const collected = collectBlock(lines, index);
      blocks.push({ name: directive[1], attrs: parseAttrs(directive[2]), lines: collected.lines });
      index = collected.endIndex;
    }
    return blocks;
  }

  function renderFlowLines(lines) {
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
    const headingIndexes = lines.map((line, index) => ({ line, index })).filter(({ line }) => /^\s*##\s+/.test(line));
    if (headingIndexes.length >= 2) return [lines.slice(headingIndexes[0].index, headingIndexes[1].index), lines.slice(headingIndexes[1].index)];
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
    return `<section class="loga-panel loga-panel--comparison">${fallbackTitle ? `<h3>${inline(fallbackTitle)}</h3>` : ''}<div class="loga-comparison">${['left', 'right'].map((key) => `<article><h4>${inline(sides[key].title)}</h4><ul>${sides[key].items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul></article>`).join('')}</div></section>`;
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

  function collectToolbarZones(lines) {
    return [
      ...collectChildBlocks(lines).filter((child) => child.name.toLowerCase() === 'toolbar_zone'),
      ...collectYamlToolbarZones(lines),
    ];
  }

  function collectYamlToolbarZones(lines) {
    const zones = [];
    let inZones = false;
    let current = null;
    const finishCurrent = () => {
      if (current && current.lines.some((line) => line.trim())) zones.push(current);
      current = null;
    };
    lines.forEach((line) => {
      if (!inZones) {
        if (/^\s*zones:\s*$/.test(line)) inZones = true;
        return;
      }
      const zoneMatch = line.match(/^\s+(left|center|right):\s*$/);
      if (zoneMatch) {
        finishCurrent();
        current = { name: 'toolbar_zone', attrs: { name: zoneMatch[1], align: zoneMatch[1] }, lines: [] };
        return;
      }
      if (current) current.lines.push(line);
    });
    finishCurrent();
    return zones;
  }

  function renderToolbarZone(zone) {
    const values = parseKeyValues(zone.lines);
    const context = values.eyebrow || values.status ? renderToolbarContext(values) : '';
    return context + collectChildBlocks(zone.lines).map((child) => renderBlock(child.name, child.lines, child.attrs)).join('');
  }

  function renderToolbarZoneShell(zone, html) {
    const align = zone.attrs.align || 'left';
    const name = inferZoneName(zone, html);
    return `<div class="loga-toolbar__zone loga-toolbar__zone--${escapeHtml(align)}" data-zone-name="${escapeHtml(name)}" data-name="${escapeHtml(name)}" data-align="${escapeHtml(align)}">${html}</div>`;
  }

  function inferZoneName(zone, html) {
    if (zone.attrs.name && !['left', 'center', 'right'].includes(zone.attrs.name)) return zone.attrs.name;
    if (html.includes('loga-control--search')) return 'search';
    if (html.includes('loga-nav')) return 'navigation';
    if (html.includes('loga-chip-group')) return 'filters';
    if (html.includes('loga-action-group')) return 'actions';
    if (html.includes('loga-toolbar__context')) return 'context';
    return zone.attrs.name || zone.attrs.align || 'zone';
  }

  function renderToolbarContext(values) {
    if (!values.eyebrow && !values.status) return '';
    return `<div class="loga-toolbar__context">${values.eyebrow ? `<span class="eyebrow">${escapeHtml(values.eyebrow)}</span>` : ''}${values.status ? `<span class="loga-toolbar__status">${escapeHtml(values.status)}</span>` : ''}</div>`;
  }

  function parseAttrs(raw = '') {
    const attrs = {};
    const pattern = /([a-zA-Z0-9_-]+)=("([^"]*)"|'([^']*)'|([^\s]+))/g;
    let match;
    while ((match = pattern.exec(raw))) attrs[match[1]] = match[3] ?? match[4] ?? match[5] ?? '';
    return attrs;
  }

  function parseOptions(lines) {
    const options = [];
    let inOptions = false;
    lines.forEach((raw) => {
      const line = raw.trim();
      if (/^options:\s*$/.test(line)) {
        inOptions = true;
        return;
      }
      if (inOptions && line.startsWith('- ')) options.push(line.slice(2).replace(/^"|"$/g, ''));
      else if (inOptions && line && !line.startsWith('- ')) inOptions = false;
    });
    return options.length ? options : ['Option'];
  }

  function parseKeyValues(lines) {
    const values = {};
    lines.forEach((raw) => {
      const match = raw.trim().match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?$/);
      if (match) values[match[1]] = match[2];
    });
    return values;
  }

  function parseDirectToolbarKeyValues(lines) {
    const values = {};
    lines.forEach((raw) => {
      const match = raw.match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?$/);
      if (match && !['type', 'zones'].includes(match[1])) values[match[1]] = match[2];
    });
    return values;
  }

  function parseRecords(lines) {
    const records = [];
    let current = null;
    lines.forEach((raw) => {
      const line = raw.trim();
      if (line.startsWith('- ')) {
        if (current) records.push(current);
        current = {};
        const inlineValue = line.slice(2);
        const pair = inlineValue.match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?$/);
        if (pair) current[pair[1]] = pair[2];
        else current.label = inlineValue;
        return;
      }
      const pair = line.match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?$/);
      if (pair) {
        if (!current) current = {};
        current[pair[1]] = pair[2];
      }
    });
    if (current) records.push(current);
    return records;
  }

  function findContractAnswer(body) {
    const focusMatch = body.match(/::focus[\s\S]*?answer:\s*"([^"]+)"/);
    if (focusMatch) return focusMatch[1];
    const surfaceMatch = body.match(/::surface[^\n]*summary="([^"]+)"/);
    if (surfaceMatch) return surfaceMatch[1];
    return '';
  }

  function findToolbarStatus(body) {
    const statusMatch = body.match(/status:\s*"([^"]+)"/);
    return statusMatch?.[1] || '';
  }

  function inline(value) {
    return escapeHtml(value)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="#">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.MarkdownContractLab = { createMarkdownContractLab };
  createMarkdownContractLab(document);
})();
