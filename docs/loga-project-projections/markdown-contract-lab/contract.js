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

  return { fatal };
}

export function renderDiagnostics(markdown, parsed, validation = { fatal: [] }) {
  const hasToolbar = parsed.blocks.includes('toolbar');
  const hasYamlZones = usesYamlNestedZones(markdown);
  const hasToolbarZones = markdown.includes('::toolbar_zone');
  const hasAnyToolbarZones = hasToolbarZones || hasYamlZones;
  const hasActions = parsed.blocks.includes('next_actions')
    || markdown.includes('::action_group')
    || markdown.includes('::actions');
  const isPartialToolbarContract = hasToolbar;
  const checks = [
    ['contract', Boolean(parsed.frontmatter.loga_contract) || isPartialToolbarContract, isPartialToolbarContract ? 'partial toolbar contract' : 'Missing loga_contract'],
    ['ux contract', Boolean(parsed.frontmatter.ux_contract) || isPartialToolbarContract, isPartialToolbarContract ? 'partial toolbar contract' : 'Missing ux_contract'],
    ['source truth', parsed.frontmatter.source_truth === 'sql' || isPartialToolbarContract, isPartialToolbarContract ? 'source truth omitted for toolbar-only preview' : 'source_truth is not sql'],
    ['toolbar', hasToolbar, 'Missing ::toolbar'],
    ['zones', hasAnyToolbarZones, 'Missing toolbar zones'],
    ['zone grammar', true, hasYamlZones ? 'YAML zones normalized into toolbar zones' : 'toolbar zone grammar'],
    ['actions', hasActions, 'Missing actions block'],
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
