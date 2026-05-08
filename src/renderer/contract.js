import { escapeHtml } from './html.js';

export function validateContract(markdown, parsed) {
  const fatal = [];
  if (!markdown.trim()) return { fatal };

  const hasToolbar = parsed.blocks.includes('toolbar');
  const hasToolbarZones = markdown.includes('::toolbar_zone');
  const hasYamlZones = usesYamlNestedZones(markdown);

  if (hasToolbar && !hasToolbarZones && !hasYamlZones) {
    fatal.push({
      title: 'Toolbar has no renderable zones',
      detail: 'The toolbar block exists, but there are no zones for the interpreter to place in the experience.',
      repair: 'Add at least one ::toolbar_zone block or a zones.left|center|right block inside ::toolbar.',
      example: [
        '::toolbar variant="linear"',
        '  ::toolbar_zone name="context" align="left"',
        '  eyebrow: "Inspection Workspace"',
        '  status: "Agent active - Turn 3"',
        '  ::',
        '::',
      ].join('\n'),
    });
  }

  applyTelemetryDoctrineValidation(markdown, parsed, fatal);

  return { fatal };
}

export function renderDiagnostics(markdown, parsed, validation = { fatal: [] }) {
  const hasToolbar = parsed.blocks.includes('toolbar');
  const hasGrid = parsed.blocks.includes('grid');
  const hasSplit = parsed.blocks.includes('split');
  const hasLayoutBlock = hasToolbar || hasGrid || hasSplit;
  const hasComponentBlock = parsed.blocks.some((block) => SUPPORTED_EXPERIMENT_BLOCKS.has(block));
  const hasYamlZones = usesYamlNestedZones(markdown);
  const hasToolbarZones = markdown.includes('::toolbar_zone');
  const hasAnyToolbarZones = hasToolbarZones || hasYamlZones;
  const hasActions = parsed.blocks.includes('next_actions')
    || markdown.includes('::action_group')
    || markdown.includes('::actions');
  const isExperimentalContract = hasLayoutBlock || hasComponentBlock;
  const checks = [
    ['contract', Boolean(parsed.frontmatter.loga_contract) || isExperimentalContract, isExperimentalContract ? 'experimental contract' : 'Missing loga_contract'],
    ['ux contract', Boolean(parsed.frontmatter.ux_contract) || isExperimentalContract, isExperimentalContract ? 'experimental contract' : 'Missing ux_contract'],
    ['source truth', parsed.frontmatter.source_truth === 'sql' || isExperimentalContract, isExperimentalContract ? 'source truth omitted for experiment' : 'source_truth is not sql'],
    ['toolbar', hasToolbar || hasGrid || hasSplit || hasComponentBlock, hasLayoutBlock || hasComponentBlock ? 'toolbar not required for experiment' : 'Missing ::toolbar'],
    ['zones', hasAnyToolbarZones || hasGrid || hasSplit || hasComponentBlock, hasLayoutBlock ? 'layout block owns flow' : hasComponentBlock ? 'component owns flow' : 'Missing toolbar zones'],
    ['zone grammar', true, hasYamlZones ? 'YAML zones normalized into toolbar zones' : 'toolbar zone grammar'],
    ['actions', hasActions || hasComponentBlock, hasComponentBlock ? 'actions optional for component experiment' : 'Missing actions block'],
    ['raw leak', !/::[a-zA-Z0-9_]+[^\n]*\n[\s\S]*?\n(?!:{2,3})$/.test(markdown), 'Possible unclosed primitive'],
  ];

  const renderedChecks = checks.map(([label, pass, fail]) => {
    const cls = pass ? 'pass' : 'warn';
    return `<li class="${cls}">${escapeHtml(pass ? label : fail)}</li>`;
  });

  return [
    ...validation.fatal.map((error) => `<li class="fail">${escapeHtml(error.title)}</li>`),
    ...renderedChecks,
  ];
}

export function usesYamlNestedZones(markdown) {
  return /::toolbar[^\n]*\n[\s\S]*?\nzones:\s*\n/.test(markdown);
}

const SUPPORTED_EXPERIMENT_BLOCKS = new Set([
  'action_rail',
  'decision_panel',
  'focus_strip',
  'metric_row',
  'panel',
  'timeline',
  'tree',
]);

function applyTelemetryDoctrineValidation(markdown, parsed, fatal) {
  const projectionType = String(parsed.frontmatter?.projection_type || '');
  if (!projectionType.startsWith('operator.execution_')) return;

  if (!String(parsed.frontmatter?.primary_question || '').trim()) {
    fatal.push({
      title: 'Telemetry doctrine violation',
      detail: 'Telemetry projections must declare a primary_question in frontmatter.',
      repair: 'Add primary_question to frontmatter to anchor summary-first rendering intent.',
    });
  }

  const body = String(parsed.body || markdown || '').replace(/\r\n/g, '\n');
  const hasFocusBlock = /(^|\n)::focus(?:\s+[^\n]*)?\n/i.test(body);
  if (!hasFocusBlock) {
    fatal.push({
      title: 'Telemetry doctrine violation',
      detail: 'Telemetry projections must include a ::focus block.',
      repair: 'Add a ::focus block that answers the primary operator question.',
    });
  }

  const directiveIndex = (name) => body.search(new RegExp(`(^|\\n)::${name}(?:\\s+[^\\n]*)?\\n`, 'i'));
  const focusIndex = directiveIndex('focus');
  const diagnosticIndexes = ['event_stream', 'table', 'selected_event_detail', 'panel', 'code']
    .map((name) => directiveIndex(name))
    .filter((index) => index >= 0);
  const firstDiagnosticIndex = diagnosticIndexes.length ? Math.min(...diagnosticIndexes) : -1;

  if (focusIndex >= 0 && firstDiagnosticIndex >= 0 && focusIndex > firstDiagnosticIndex) {
    fatal.push({
      title: 'Telemetry doctrine violation',
      detail: 'Telemetry projections must surface ::focus before diagnostics or payload blocks (summary first).',
      repair: 'Move ::focus earlier in the document before event stream or detail/payload sections.',
    });
  }

  const hasRawPayloadBinding = /rawMetadataJson|rawMetadata|output_text|error_text/.test(markdown);
  const rawPayloadInDetails = /<details>[\s\S]*?(rawMetadataJson|rawMetadata|output_text|error_text)[\s\S]*?<\/details>/i.test(markdown);
  if (hasRawPayloadBinding && !rawPayloadInDetails) {
    fatal.push({
      title: 'Telemetry doctrine violation',
      detail: 'Raw payload bindings must be behind a <details> disclosure block (payload third).',
      repair: 'Move raw payload bindings into a collapsed <details> section.',
    });
  }
}
