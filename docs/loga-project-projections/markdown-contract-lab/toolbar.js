import { collectChildBlocks, parseKeyValues } from './parser.js';
import { escapeHtml } from './html.js';

export function renderToolbar({ lines, attrs, renderBlock, renderContractErrors }) {
  const zones = collectToolbarZones(lines);
  if (!zones.length) {
    return renderContractErrors([{
      title: 'Toolbar has no renderable zones',
      detail: 'The toolbar rendered no experience because it had no toolbar zones.',
      repair: 'Add explicit zone blocks for context, navigation, search, filters, or actions.',
      example: [
        '::toolbar variant="linear"',
        '  ::toolbar_zone name="context" align="left"',
        '  title: "Projection Graph"',
        '  status: "Agent active - Turn 3"',
        '  ::',
        '::',
      ].join('\n'),
    }]);
  }

  const toolbarValues = parseDirectToolbarKeyValues(lines);
  const variant = normalizeToolbarVariant(attrs.variant || toolbarValues.variant);
  const toolbarContext = renderToolbarContext(toolbarValues);
  const zoneHtml = zones.map((zone) => renderToolbarZone(zone, renderBlock));

  if (variant === 'linear') {
    return `
      <header class="loga-toolbar loga-toolbar--linear" data-toolbar-variant="linear">
        ${toolbarContext ? `<div class="loga-toolbar__zone loga-toolbar__zone--context loga-toolbar__zone--left">${toolbarContext}</div>` : ''}
        ${zones.map((zone, index) => renderToolbarZoneShell(zone, zoneHtml[index], 'div')).join('')}
      </header>
    `;
  }

  const grouped = {
    left: zones.map((zone, index) => ({ zone, html: zoneHtml[index] })).filter(({ zone }) => (zone.attrs.align || 'left') === 'left'),
    center: zones.map((zone, index) => ({ zone, html: zoneHtml[index] })).filter(({ zone }) => zone.attrs.align === 'center'),
    right: zones.map((zone, index) => ({ zone, html: zoneHtml[index] })).filter(({ zone }) => zone.attrs.align === 'right'),
  };

  return `
    <header class="loga-toolbar loga-toolbar--stacked" data-toolbar-variant="stacked">
      <div class="loga-toolbar__group loga-toolbar__group--left">${toolbarContext}${grouped.left.map(({ zone, html }) => renderToolbarZoneShell(zone, html, 'div')).join('')}</div>
      <div class="loga-toolbar__group loga-toolbar__group--center">${grouped.center.map(({ zone, html }) => renderToolbarZoneShell(zone, html, 'div')).join('')}</div>
      <div class="loga-toolbar__group loga-toolbar__group--right">${grouped.right.map(({ zone, html }) => renderToolbarZoneShell(zone, html, 'div')).join('')}</div>
    </header>
  `;
}

export function collectToolbarZones(lines) {
  const blockZones = collectChildBlocks(lines)
    .filter((child) => child.name.toLowerCase() === 'toolbar_zone');
  return [
    ...blockZones,
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
      current = {
        name: 'toolbar_zone',
        attrs: { name: zoneMatch[1], align: zoneMatch[1] },
        lines: [],
      };
      return;
    }

    if (current) current.lines.push(line);
  });

  finishCurrent();
  return zones;
}

function renderToolbarZone(zone, renderBlock) {
  const values = parseKeyValues(zone.lines);
  const children = collectChildBlocks(zone.lines);
  const context = [];
  if (values.eyebrow || values.title || values.status) {
    context.push(renderToolbarContext(values));
  }

  return [
    ...context,
    ...children.map((child) => renderBlock(child.name, child.lines, child.attrs)),
  ].join('');
}

function renderToolbarZoneShell(zone, html, tagName) {
  const align = zone.attrs.align || 'left';
  const name = inferZoneName(zone, html);
  return `<${tagName} class="loga-toolbar__zone loga-toolbar__zone--${escapeHtml(align)}" data-zone-name="${escapeHtml(name)}" data-name="${escapeHtml(name)}" data-align="${escapeHtml(align)}">${html}</${tagName}>`;
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
  if (!values.eyebrow && !values.title && !values.status) return '';
  return `
    <div class="loga-toolbar__context">
      ${values.eyebrow ? `<span class="eyebrow">${escapeHtml(values.eyebrow)}</span>` : ''}
      ${values.title ? `<strong>${escapeHtml(values.title)}</strong>` : ''}
      ${values.status ? `<span class="loga-toolbar__status">${escapeHtml(values.status)}</span>` : ''}
    </div>
  `;
}

function parseDirectToolbarKeyValues(lines) {
  const values = {};
  lines.forEach((raw) => {
    const match = raw.match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?$/);
    if (match && !['type', 'zones'].includes(match[1])) values[match[1]] = match[2];
  });
  return values;
}

function normalizeToolbarVariant(variant) {
  return variant === 'linear' ? 'linear' : 'stacked';
}
