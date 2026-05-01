(() => {
  const SCRIPT_BASE_URL = document.currentScript?.src
    ? new URL('.', document.currentScript.src).href
    : './markdown-contract-lab/';

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

  let activeElementRegistry = null;

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

    loadExternalElementRegistry().then((registry) => {
      injectRegistryStyles(registry);
      activeElementRegistry = registry.elements;
      input.value = SAMPLE;
      render();
    }).catch((error) => {
      diagnostics.innerHTML = `<li class="fail">Renderer blocked: markdown-ui-elements.json could not be loaded.</li>`;
      output.innerHTML = `<div class="empty-state"><div><strong>Renderer blocked.</strong><p>${escapeHtml(error.message)}</p></div></div>`;
    });

    return { render, elements: { input, output, diagnostics } };
  }

  async function loadExternalElementRegistry() {
    const fetcher = window.fetch;
    if (typeof fetcher !== 'function') throw new Error('window.fetch is required to load markdown-ui-elements.json');
    const registryUrl = SCRIPT_BASE_URL.startsWith('http')
      ? new URL('markdown-ui-elements.json', SCRIPT_BASE_URL).href
      : `${SCRIPT_BASE_URL}markdown-ui-elements.json`;
    const response = await fetcher(registryUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Registry load failed: ${response.status} ${response.statusText || ''}`.trim());
    return response.json();
  }

  function injectRegistryStyles(registry) {
    if (!registry?.styles) throw new Error('Registry styles are required');
    if (!registry?.elements) throw new Error('Registry elements are required');
    const existing = document.getElementById('markdown-ui-registry-styles');
    if (existing && typeof existing.remove === 'function') existing.remove();
    const style = document.createElement('style');
    style.id = 'markdown-ui-registry-styles';
    style.textContent = buildCssFromRegistry(registry);
    document.head.appendChild(style);
  }

  function buildCssFromRegistry(registry) {
    return [
      stylesToCss(registry.styles),
      ...Object.entries(registry.media || {}).map(([query, styles]) => `${query}{${stylesToCss(styles)}}`),
    ].join('\n');
  }

  function stylesToCss(styles) {
    return Object.entries(styles || {})
      .map(([selector, declarations]) => `${selector}{${Object.entries(declarations).map(([property, value]) => `${toCssProperty(property)}:${value};`).join('')}}`)
      .join('\n');
  }

  function toCssProperty(property) {
    if (property.startsWith('--')) return property;
    return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
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
    const experimentBlocks = new Set(['action_rail', 'decision_panel', 'focus_strip', 'metric_row', 'panel', 'timeline', 'tree']);
    const hasLayoutBlock = hasToolbar || hasGrid || hasSplit;
    const hasComponentBlock = parsed.blocks.some((block) => experimentBlocks.has(block));
    const hasYamlZones = /::toolbar[^\n]*\n[\s\S]*?\nzones:\s*\n/.test(markdown);
    const hasToolbarZones = markdown.includes('::toolbar_zone');
    const hasActions = parsed.blocks.includes('next_actions') || markdown.includes('::action_group') || markdown.includes('::actions');
    const isExperimentalContract = hasLayoutBlock || hasComponentBlock;
    const checks = [
      ['contract', Boolean(parsed.frontmatter.loga_contract) || isExperimentalContract, isExperimentalContract ? 'experimental contract' : 'Missing loga_contract'],
      ['ux contract', Boolean(parsed.frontmatter.ux_contract) || isExperimentalContract, isExperimentalContract ? 'experimental contract' : 'Missing ux_contract'],
      ['source truth', parsed.frontmatter.source_truth === 'sql' || isExperimentalContract, isExperimentalContract ? 'source truth omitted for experiment' : 'source_truth is not sql'],
      ['toolbar', hasToolbar || hasGrid || hasSplit || hasComponentBlock, hasLayoutBlock || hasComponentBlock ? 'toolbar not required for experiment' : 'Missing ::toolbar'],
      ['zones', hasToolbarZones || hasYamlZones || hasGrid || hasSplit || hasComponentBlock, hasLayoutBlock ? 'layout block owns flow' : hasComponentBlock ? 'component owns flow' : 'Missing toolbar zones'],
      ['zone grammar', true, hasYamlZones ? 'YAML zones normalized into toolbar zones' : 'toolbar zone grammar'],
      ['actions', hasActions || hasComponentBlock, hasComponentBlock ? 'actions optional for component experiment' : 'Missing actions block'],
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
    const rawVariant = attrs.variant || toolbarValues.variant || 'stacked';
    const variant = rawVariant === 'linear' || rawVariant === 'stacked' ? rawVariant : '';
    const toolbarContext = renderToolbarContext(toolbarValues);
    const zoneHtml = zones.map((zone) => renderToolbarZone(zone));
    const variantWarning = variant
      ? ''
      : renderContractErrors([{ title: 'Invalid toolbar variant', detail: `Toolbar variant "${rawVariant}" is not supported. Use "linear" or "stacked".` }]);
    if (variant === 'linear') {
      return `${variantWarning}<header class="loga-toolbar loga-toolbar--linear" data-toolbar-variant="linear">${toolbarContext ? `<div class="loga-toolbar__zone loga-toolbar__zone--context loga-toolbar__zone--left">${toolbarContext}</div>` : ''}${zones.map((zone, index) => renderToolbarZoneShell(zone, zoneHtml[index])).join('')}</header>`;
    }
    const zonePairs = zones.map((zone, index) => ({ zone, html: zoneHtml[index] }));
    const grouped = {
      left: zonePairs.filter(({ zone }) => (zone.attrs.align || 'left') === 'left'),
      center: zonePairs.filter(({ zone }) => zone.attrs.align === 'center'),
      right: zonePairs.filter(({ zone }) => zone.attrs.align === 'right'),
    };
    return `${variantWarning}<header class="loga-toolbar loga-toolbar--stacked" data-toolbar-variant="stacked"><div class="loga-toolbar__group loga-toolbar__group--left">${toolbarContext}${grouped.left.map(({ zone, html }) => renderToolbarZoneShell(zone, html)).join('')}</div><div class="loga-toolbar__group loga-toolbar__group--center">${grouped.center.map(({ zone, html }) => renderToolbarZoneShell(zone, html)).join('')}</div><div class="loga-toolbar__group loga-toolbar__group--right">${grouped.right.map(({ zone, html }) => renderToolbarZoneShell(zone, html)).join('')}</div></header>`;
  }

  function renderPrimitiveBlock(block, name, lines, attrs) {
    const records = parseRecords(lines);
    const keyValues = parseKeyValues(lines);
    const value = (key) => keyValues[key] || attrs[key] || '';
    if (block === 'toolbar_zone') return collectChildBlocks(lines).map((child) => renderBlock(child.name, child.lines, child.attrs)).join('');
    if (block === 'grid') {
      const columns = Number.parseInt(attrs.columns || value('columns') || '2', 10);
      const safeColumns = Number.isFinite(columns) ? Math.min(Math.max(columns, 1), 6) : 2;
      const gap = normalizeGap(attrs.gap || value('gap'));
      return `<section class="loga-grid" style="--loga-grid-columns: ${safeColumns}; --loga-grid-gap: ${gap}">${collectChildBlocks(lines).map((child) => renderBlock(child.name, child.lines, child.attrs)).join('')}</section>`;
    }
    if (block === 'split') {
      const [left = '2', right = '1'] = String(attrs.ratio || value('ratio') || '2:1').split(':');
      return `<section class="loga-split" style="--loga-split-left: ${escapeHtml(left)}fr; --loga-split-right: ${escapeHtml(right)}fr">${splitIntoPanes(lines).slice(0, 2).map((pane) => `<div class="loga-split__pane">${renderFlowLines(pane)}</div>`).join('')}</section>`;
    }
    if (block === 'stack') {
      const gap = normalizeGap(attrs.gap || value('gap'));
      return `<section class="loga-stack" style="--loga-stack-gap: ${gap}">${collectChildBlocks(lines).map((child) => renderBlock(child.name, child.lines, child.attrs)).join('')}</section>`;
    }
    if (block === 'rail') {
      const side = attrs.side || value('side') || 'right';
      return `<aside class="loga-rail loga-rail--${escapeHtml(side)}" data-side="${escapeHtml(side)}">${collectChildBlocks(lines).map((child) => renderBlock(child.name, child.lines, child.attrs)).join('')}</aside>`;
    }
    if (block === 'focus_strip') {
      return renderRegisteredBlock(block, lines, attrs, records, keyValues, value);
    }
    if (activeElementRegistry?.[block]) return renderRegisteredBlock(block, lines, attrs, records, keyValues, value);
    if (block === 'decision_panel') {
      return `<section class="loga-decision-panel"><p class="eyebrow">Decision Required</p><h3>${inline(value('question') || 'What should happen next?')}</h3><div class="loga-action-group">${parseOptions(lines).map((option) => `<button class="loga-action" type="button">${escapeHtml(option)}</button>`).join('')}</div>${value('confidence') ? `<p class="loga-confidence">Confidence: <strong>${escapeHtml(value('confidence'))}</strong></p>` : ''}</section>`;
    }
    if (block === 'tree') return `<nav class="loga-tree" aria-label="Workspace tree">${renderTree(lines)}</nav>`;
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

  function renderRegisteredBlock(block, lines, attrs, records, keyValues, value) {
    if (!activeElementRegistry) throw new Error('Element registry has not loaded');
    if (!activeElementRegistry[block]) throw new Error(`No renderer contract for directive "${block}"`);
    return renderRegisteredElement(
      activeElementRegistry[block],
      createRegistryModel({ block, lines, attrs, records, keyValues, value }),
    );
  }

  function createRegistryModel({ block, lines, attrs, records, keyValues, value }) {
    if (block === 'action_rail') {
      return { items: lines.map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => ({ label: line.slice(2) })) };
    }
    if (block === 'status_badge') {
      return { fields: { label: value('label') || value('status') || lines.join(' ').trim() } };
    }
    if (block === 'focus_strip') return parseFocusStrip(lines);
    if (block === 'panel') {
      const variant = attrs.variant || value('variant') || 'default';
      const childBlocks = collectChildBlocks(lines);
      const childHtml = variant === 'comparison'
        ? renderComparisonContent(lines)
        : childBlocks.map((child) => renderBlock(child.name, child.lines, child.attrs)).join('');
      return {
        variant,
        fields: { title: value('title'), status: value('status'), summary: value('summary') },
        listItems: variant === 'comparison' ? [] : lines.map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => line.slice(2)),
        childrenHtml: childHtml,
      };
    }
    return { items: records, fields: keyValues };
  }

  function renderRegisteredElement(definition, model = {}) {
    const normalized = Array.isArray(model) ? { items: model } : model;
    const attrs = renderRegistryAttributes(definition, normalized);
    const content = definition.slots
      ? definition.slots.map((slot) => renderSlot(slot, normalized)).join('')
      : [
        renderRegistryFields(definition.fields, normalized.fields || {}),
        renderRegistryList(definition.list, normalized.listItems || []),
        renderRegistryItems(definition, normalized[definition.itemSource || 'items'] || normalized.items || []),
        definition.contentField ? renderContentField(definition, normalized) : '',
        definition.children ? normalized.childrenHtml || '' : '',
      ].filter(Boolean).join('');
    return `<${definition.element}${attrs}>${content}</${definition.element}>`;
  }

  function renderRegistryAttributes(definition, model) {
    const classes = [definition.className];
    if (definition.variantPrefix && model.variant) classes.push(`${definition.variantPrefix}${model.variant}`);
    return classes.filter(Boolean).length ? ` class="${escapeHtml(classes.filter(Boolean).join(' '))}"` : '';
  }

  function renderRegistryFields(fields = {}, values = {}) {
    return Object.entries(fields).map(([name, field]) => {
      const value = field.literal || readValue({ fields: values }, field.source || name) || readValue({ fields: values }, field.alias);
      if (field.required && !value) return renderMissingFieldWarning(field.source || name);
      if (!value) return '';
      const attrs = field.className ? ` class="${escapeHtml(field.className)}"` : '';
      return `<${field.element}${attrs}>${escapeHtml(value)}</${field.element}>`;
    }).join('');
  }

  function renderRegistryList(list, items) {
    if (!list || !items.length) return '';
    const attrs = list.className ? ` class="${escapeHtml(list.className)}"` : '';
    return `<${list.element}${attrs}>${items.map((item) => `<${list.itemElement}>${escapeHtml(item)}</${list.itemElement}>`).join('')}</${list.element}>`;
  }

  function renderRegistryItems(definition, records) {
    const item = definition.repeatedItem || definition.item;
    if (!item) return '';
    if (!records.length && definition.requiredItems) {
      return renderWarning({
        title: 'Missing required items',
        detail: `Block "${definition.className || definition.element}" requires at least one list item.`,
      });
    }
    if (!records.length) return '';
    return records.map((record) => renderRegistryItem(item, record)).join('');
  }

  function renderRegistryItem(item, record) {
    const attrs = [];
    if (item.className) attrs.push(`class="${escapeHtml(item.className)}"`);
    if (item.type) attrs.push(`type="${escapeHtml(item.type)}"`);
    Object.entries(item.data || {}).forEach(([name, config]) => {
      if (config.required && !record[config.field]) return renderMissingFieldWarning(config.field);
      attrs.push(`data-${escapeHtml(name)}="${escapeHtml(record[config.field] || '')}"`);
    });
    const content = item.fields
      ? renderRegistryFields(item.fields, record)
      : renderItemField(item, record);
    return `<${item.element}${attrs.length ? ` ${attrs.join(' ')}` : ''}>${content}</${item.element}>`;
  }

  function renderSlot(slot, model) {
    const content = [
      renderRegistryFields(slot.fields, model.fields || {}),
      slot.itemSource ? renderRegistryItems(slot, model[slot.itemSource] || []) : '',
      slot.field ? renderContentField(slot, model) : '',
    ].filter(Boolean).join('');
    if (!content) return '';
    const attrs = slot.className ? ` class="${escapeHtml(slot.className)}"` : '';
    return `<${slot.element}${attrs}>${content}</${slot.element}>`;
  }

  function renderContentField(definition, model) {
    const fieldName = definition.contentField || definition.field;
    const value = readValue(model, fieldName);
    if (definition.required && !value) return renderMissingFieldWarning(fieldName);
    return value ? escapeHtml(value) : '';
  }

  function renderItemField(item, record) {
    const value = record[item.field];
    if (item.required && !value) return renderMissingFieldWarning(item.field);
    return value ? escapeHtml(value) : '';
  }

  function renderMissingFieldWarning(fieldName) {
    return renderWarning({
      title: 'Missing required field',
      detail: `Required field "${fieldName}" was not provided by the markdown contract.`,
    });
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

  function renderDl(values) {
    const entries = Object.entries(values || {});
    if (!entries.length) return '';
    return `<dl>${entries.map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl>`;
  }

  function renderWarning({ title, detail, code }) {
    return `<section class="loga-render-warning"><h3>${escapeHtml(title)}</h3>${detail ? `<p>${escapeHtml(detail)}</p>` : ''}${code ? `<pre><code>${escapeHtml(code)}</code></pre>` : ''}</section>`;
  }

  function readValue(model, path) {
    if (!path) return '';
    const fields = model.fields || model;
    if (Object.prototype.hasOwnProperty.call(fields, path)) return fields[path];
    return String(path).split('.').reduce((value, key) => {
      if (value && typeof value === 'object') return value[key];
      return undefined;
    }, fields) || '';
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
