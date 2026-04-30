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
  title: "Current Work"
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
    const hasYamlZones = /::toolbar[^\n]*\n[\s\S]*?\nzones:\s*\n/.test(markdown);
    const hasToolbarZones = markdown.includes('::toolbar_zone');
    const hasActions = parsed.blocks.includes('next_actions') || markdown.includes('::action_group') || markdown.includes('::actions');
    const isPartialToolbarContract = hasToolbar;
    const checks = [
      ['contract', Boolean(parsed.frontmatter.loga_contract) || isPartialToolbarContract, isPartialToolbarContract ? 'partial toolbar contract' : 'Missing loga_contract'],
      ['ux contract', Boolean(parsed.frontmatter.ux_contract) || isPartialToolbarContract, isPartialToolbarContract ? 'partial toolbar contract' : 'Missing ux_contract'],
      ['source truth', parsed.frontmatter.source_truth === 'sql' || isPartialToolbarContract, isPartialToolbarContract ? 'source truth omitted for toolbar-only preview' : 'source_truth is not sql'],
      ['toolbar', hasToolbar, 'Missing ::toolbar'],
      ['zones', hasToolbarZones || hasYamlZones, 'Missing toolbar zones'],
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
    if (block === 'search') return `<div class="loga-control loga-control--search"><label>Search</label><input type="search" value="" placeholder="${escapeHtml(value('placeholder') || 'Search...')}"></div>`;
    if (block === 'select') {
      const selected = value('value');
      return `<div class="loga-control"><label>${escapeHtml(value('label') || 'Select')}</label><select>${parseOptions(lines).map((option) => `<option${option === selected ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></div>`;
    }
    if (block === 'filter_group' || block === 'filters') return `<div class="loga-chip-group">${records.map((record) => `<span class="loga-chip">${escapeHtml(record.label || 'Filter')}</span>`).join('')}</div>`;
    if (block === 'action_group' || block === 'actions') return `<div class="loga-action-group">${records.map((record) => `<button type="button">${escapeHtml(record.label || 'Action')}</button>`).join('')}</div>`;
    if (block === 'nav') return `<nav class="loga-nav">${records.map((record) => `<a href="#">${escapeHtml(record.label || 'Open')}</a>`).join('')}</nav>`;
    if (['roadmap', 'task_list', 'run_list', 'promotion_list', 'cicd_list', 'turn_list', 'memory', 'checklist'].includes(block)) {
      return `<section class="loga-list ${escapeHtml(block)}">${records.map((record) => {
        const title = record.title || record.label || record.text || record.reminder || record.key || (record.turn ? `Turn ${record.turn}` : 'Untitled');
        const status = [record.status, record.priority, record.progress, record.stage, record.tier].filter(Boolean).join(' | ');
        return `<a class="loga-list-item" href="#"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(status)}</span></a>`;
      }).join('')}</section>`;
    }
    if (block === 'next_actions') return `<section class="loga-actions">${lines.map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => `<button type="button">${escapeHtml(line.slice(2))}</button>`).join('')}</section>`;
    if (block === 'focus') return `<section class="loga-focus"><p class="eyebrow">${escapeHtml(value('status') || 'focus')}</p><p class="question">${inline(value('question') || 'What matters?')}</p><p class="answer">${inline(value('answer'))}</p></section>`;
    if (block === 'panel') return `<section class="loga-panel">${value('title') ? `<h3>${inline(value('title'))}</h3>` : ''}${value('summary') ? `<p>${inline(value('summary'))}</p>` : ''}</section>`;
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
    const context = values.eyebrow || values.title || values.status ? renderToolbarContext(values) : '';
    return context + collectChildBlocks(zone.lines).map((child) => renderBlock(child.name, child.lines, child.attrs)).join('');
  }

  function renderToolbarZoneShell(zone, html) {
    const align = zone.attrs.align || 'left';
    const name = zone.attrs.name || align;
    return `<div class="loga-toolbar__zone loga-toolbar__zone--${escapeHtml(align)}" data-zone-name="${escapeHtml(name)}" data-align="${escapeHtml(align)}">${html}</div>`;
  }

  function renderToolbarContext(values) {
    if (!values.eyebrow && !values.title && !values.status) return '';
    return `<div class="loga-toolbar__context">${values.eyebrow ? `<span class="eyebrow">${escapeHtml(values.eyebrow)}</span>` : ''}${values.title ? `<strong>${escapeHtml(values.title)}</strong>` : ''}${values.status ? `<span class="loga-toolbar__status">${escapeHtml(values.status)}</span>` : ''}</div>`;
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
