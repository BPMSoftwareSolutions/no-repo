import assert from 'node:assert/strict';
import fs from 'node:fs';

import { ELEMENT_REGISTRY, MARKDOWN_UI_REGISTRY } from '../src/renderer/element-registry.js';
import { renderDiagnostics, validateContract } from '../src/renderer/contract.js';
import { parseMarkdown } from '../src/renderer/parser.js';
import { renderMarkdown, renderQuestionFirst } from '../src/renderer/renderer.js';

function renderContract(markdown) {
  const parsed = parseMarkdown(markdown);
  const validation = validateContract(markdown, parsed);
  return {
    diagnostics: validation,
    html: renderQuestionFirst(parsed) + (validation.fatal.length ? '' : renderMarkdown(parsed.body)),
  };
}

const yamlZonesToolbar = `::toolbar
type: "projection"

eyebrow: "Inspection Workspace"
status: "Agent active · Turn 3"

zones:
  left:
    ::nav variant="pills"
    - label: "Roadmap"
    - label: "Promotions"
    - label: "Workflows"
    - label: "CI/CD"
    - label: "Memory"
    - label: "Evidence"
    ::

  center:
    ::search
    placeholder: "Search projects, tasks, evidence..."
    ::

  right:
    ::filters variant="chips"
    - label: "Needs Attention"
    - label: "Blocked Only"
    - label: "High Priority"
    ::

    ::actions
    - label: "Expand Focus"
    - label: "Collapse All"
    - label: "Refresh"
    ::
::`;

const yamlResult = renderContract(yamlZonesToolbar);

assert.equal(yamlResult.diagnostics.fatal.length, 0, 'YAML zones toolbar must not produce fatal validation errors');
assert.doesNotMatch(yamlResult.html, /contract-error/, 'YAML zones toolbar must not render a contract error');
assert.match(yamlResult.html, /<header class="loga-toolbar loga-toolbar--stacked"/, 'YAML zones toolbar defaults to stacked layout');
assert.match(yamlResult.html, /loga-toolbar__group loga-toolbar__group--left/, 'stacked toolbar may group zones by alignment');
assert.match(yamlResult.html, /<div class="loga-toolbar__zone loga-toolbar__zone--left"/, 'stacked toolbar zones still render as flex item divs');
assert.match(yamlResult.html, /Roadmap/, 'YAML zones toolbar must render nav labels');
assert.match(yamlResult.html, /Search projects, tasks, evidence/, 'YAML zones toolbar must render search');
assert.match(yamlResult.html, /Needs Attention/, 'YAML zones toolbar must render filters');
assert.match(yamlResult.html, /Expand Focus/, 'YAML zones toolbar must render actions');

const linearToolbar = `::toolbar variant="linear"
eyebrow: "Inspection Workspace"
title: "Projection Graph"
status: "Agent active · Turn 3"

zones:
  left:
    ::nav variant="pills"
    - label: "Roadmap"
    - label: "Promotions"
    ::

  center:
    ::search
    placeholder: "Search projects, tasks, evidence..."
    ::

  right:
    ::actions
    - label: "Refresh"
    ::
::`;

const linearResult = renderContract(linearToolbar);

assert.equal(linearResult.diagnostics.fatal.length, 0, 'linear toolbar must not produce fatal validation errors');
assert.match(linearResult.html, /data-toolbar-variant="linear"/, 'linear toolbar must declare its layout mode');
assert.match(linearResult.html, /<header class="loga-toolbar loga-toolbar--linear"/, 'linear toolbar must render inline toolbar shell');
assert.doesNotMatch(linearResult.html, /<strong>Projection Graph<\/strong>/, 'toolbar context must not render page or document title');
assert.doesNotMatch(linearResult.html, /<section class="loga-toolbar__zone/, 'linear toolbar zones must not render as section/card wrappers');
assert.match(linearResult.html, /<div class="loga-toolbar__zone loga-toolbar__zone--left"[^>]*data-name="navigation"[^>]*data-align="left"/, 'linear navigation zone must be named for compact sizing');
assert.match(linearResult.html, /<div class="loga-toolbar__zone loga-toolbar__zone--center"[^>]*data-name="search"[^>]*data-align="center"/, 'linear search zone must be named for flexible sizing');
assert.match(linearResult.html, /<div class="loga-toolbar__zone loga-toolbar__zone--right"[^>]*data-name="actions"[^>]*data-align="right"/, 'linear actions zone must be named for fixed sizing');
assert.match(linearResult.html, /class="loga-pill"/, 'nav items must render as pills for responsive collapse');
assert.match(linearResult.html, /class="loga-action"/, 'action buttons must render with action class for responsive collapse');
assert.match(linearResult.html, /Roadmap/, 'linear toolbar must render nav content');
assert.match(linearResult.html, /Refresh/, 'linear toolbar must render action content');

const supportedBlockNestedToolbar = `::toolbar
  ::toolbar_zone name="navigation" align="left"
  ::nav variant="pills"
  - label: "Roadmap"
  - label: "Promotions"
  ::
  ::
::`;

const blockResult = renderContract(supportedBlockNestedToolbar);

assert.equal(blockResult.diagnostics.fatal.length, 0, 'supported toolbar_zone grammar must not produce fatal validation errors');
assert.match(blockResult.html, /<header class="loga-toolbar loga-toolbar--stacked"/, 'supported toolbar_zone grammar must render the toolbar');
assert.match(blockResult.html, /Roadmap/, 'supported toolbar must render nav labels');

const commandCenterGrid = `# Command Center

::grid columns="3"

  ::panel variant="focus"
  title: "Current Focus"
  status: "in progress"
  content:
  - Establish Generic Wrapper Runtime
  - 2 / 4 tasks complete
  ::

  ::panel variant="alerts"
  title: "Needs Attention"
  - Blocked: SDK Refactor Surfaces
  - Drift: SQL access violations
  ::

  ::panel variant="actions"
  title: "Quick Actions"
  ::action_group
  - Resume Work
  - Open Roadmap
  - Review Evidence
  ::
  ::

::`;

const gridParsed = parseMarkdown(commandCenterGrid);
const gridValidation = validateContract(commandCenterGrid, gridParsed);
const gridDiagnostics = renderDiagnostics(commandCenterGrid, gridParsed, gridValidation).join('');
const gridHtml = renderMarkdown(gridParsed.body);

assert.equal(gridValidation.fatal.length, 0, 'grid-only layout experiment must not produce fatal validation errors');
assert.doesNotMatch(gridDiagnostics, /Missing loga_contract|Missing ux_contract|source_truth is not sql|Missing ::toolbar|Missing toolbar zones/, 'grid-only experiments must not show full projection or toolbar diagnostics');
assert.match(gridHtml, /<section class="loga-grid" style="--loga-grid-columns: 3; --loga-grid-gap: 16px">/, 'grid contract must render a grid layout with spec variables');
assert.match(gridHtml, /Current Focus/, 'grid panels must render titles');
assert.match(gridHtml, /Establish Generic Wrapper Runtime/, 'grid panels must render list content');
assert.match(gridHtml, /Resume Work/, 'grid panels must render nested action groups');

const operatorLanguageFixture = `::focus_strip

primary:
  question: "What should I care about right now?"
  answer: "Wrapper runtime is mid-execution and unblocked"

secondary:
  - "Next step: validate ownership mapping"
  - "No blockers present"

status: "in progress"

::

::metric_row
- label: "Tasks Complete"
  value: "2 / 4"
- label: "Blockers"
  value: "0"
- label: "Confidence"
  value: "High"
::

::split ratio="2:1"

  ## Current Work

  ::roadmap
  - Establish Generic Wrapper Runtime
  - Promote Refactor SDK Surfaces
  ::

  ## Why this matters

  ::evidence_drawer
  - Wrapper execution logs
  - Ownership validation
  - Gate decisions
  ::

::

::timeline
- step: "Plan Approved"
  status: "complete"
- step: "Wrapper Execution"
  status: "in progress"
- step: "Verification"
  status: "pending"
::

::decision_panel
question: "Is this refactor ready to promote?"
options:
  - Approve
  - Revise
  - Reject
confidence: "High"
::

::panel variant="comparison"
left:
  title: "Before"
  - God file
  - Mixed responsibilities
right:
  title: "After"
  - Modular services
  - Clear ownership
::

::tree
- AI Engine
  - Roadmap
  - Workflows
  - Evidence
- LOGA
  - UI Contracts
  - Renderer
::

::stack gap="lg"
  ::metric_row
  - label: "Tasks"
    value: "2 / 4"
  - label: "Blockers"
    value: "0"
  ::
::

::rail side="right"
  ::action_group
  - Open Current Item
  - Review Evidence
  - Refresh
  ::
::

::action_rail
- Open Current Item
- Review Candidate
- Approve Contract
::`;

const operatorHtml = renderMarkdown(parseMarkdown(operatorLanguageFixture).body);
const elementRegistryJson = JSON.parse(fs.readFileSync('./src/renderer/markdown-ui-elements.json', 'utf8'));

['panel', 'metric_row', 'timeline', 'action_rail', 'status_badge'].forEach((blockName) => {
  assert.deepEqual(ELEMENT_REGISTRY[blockName], elementRegistryJson.elements[blockName], `${blockName} module registry must match JSON element mapping`);
});

assert.match(operatorHtml, /loga-focus-strip/, 'focus_strip must render a focus strip');
assert.match(operatorHtml, /Wrapper runtime is mid-execution and unblocked/, 'focus_strip must render primary answer');
assert.match(operatorHtml, /loga-metric-row/, 'metric_row must render metric row');
assert.match(operatorHtml, /<section class="loga-metric-row"><article class="loga-metric"><div class="loga-metric__label">Tasks Complete<\/div><div class="loga-metric__value">2 \/ 4<\/div><\/article>/, 'metric_row must render through registry-defined section/article/div mapping');
assert.match(operatorHtml, /Tasks Complete/, 'metric_row must render metrics');
assert.match(operatorHtml, /loga-split/, 'split must render split layout');
assert.match(operatorHtml, /--loga-split-left: 2fr; --loga-split-right: 1fr/, 'split must use layout spec CSS variables');
assert.match(operatorHtml, /Current Work/, 'split must preserve pane headings');
assert.match(operatorHtml, /Wrapper execution logs/, 'split must render evidence content');
assert.match(operatorHtml, /loga-timeline/, 'timeline must render timeline');
assert.match(operatorHtml, /<ol class="loga-timeline"><li data-status="complete"><strong>Plan Approved<\/strong><span>complete<\/span><\/li>/, 'timeline must render through registry-defined ordered-list mapping');
assert.match(operatorHtml, /data-status="in progress"/, 'timeline must expose status');
assert.match(operatorHtml, /loga-decision-panel/, 'decision_panel must render decision surface');
assert.match(operatorHtml, /Approve/, 'decision_panel must render options');
assert.match(operatorHtml, /loga-panel--comparison/, 'comparison panel must render comparison variant');
assert.match(operatorHtml, /Modular services/, 'comparison panel must render right-side items');
assert.match(operatorHtml, /loga-tree/, 'tree must render workspace tree');
assert.match(operatorHtml, /UI Contracts/, 'tree must render nested nodes');
assert.match(operatorHtml, /<section class="loga-stack" style="--loga-stack-gap: 24px">/, 'stack must render vertical layout with gap token');
assert.match(operatorHtml, /<aside class="loga-rail loga-rail--right" data-side="right">/, 'rail must render sticky side layout');
assert.match(operatorHtml, /loga-action-rail/, 'action_rail must render floating action rail');
assert.match(operatorHtml, /<aside class="loga-action-rail"><button class="loga-action" type="button">Open Current Item<\/button>/, 'action_rail must render through registry-defined aside/button mapping');
assert.match(operatorHtml, /Approve Contract/, 'action_rail must render actions');

const registryDrivenFixture = `::panel variant="focus"
title: "Current Focus"
status: "in progress"
summary: "Wrapper runtime is active."
- Establish Generic Wrapper Runtime
::

::status_badge
label: "Healthy"
::`;

const registryDrivenHtml = renderMarkdown(parseMarkdown(registryDrivenFixture).body);

assert.match(registryDrivenHtml, /<section class="loga-panel loga-panel--focus">/, 'panel must render through the registry shell');
assert.match(registryDrivenHtml, /<h3 class="loga-panel__title">Current Focus<\/h3>/, 'panel title must render through registry fields');
assert.match(registryDrivenHtml, /<span class="loga-panel__status">in progress<\/span>/, 'panel status must render through registry fields');
assert.match(registryDrivenHtml, /<ul class="loga-panel__content"><li>Establish Generic Wrapper Runtime<\/li><\/ul>/, 'panel list content must render through registry list mapping');
assert.match(registryDrivenHtml, /<span class="loga-status-badge">Healthy<\/span>/, 'status_badge must render through registry content mapping');
const unsupportedBlockHtml = renderMarkdown(parseMarkdown('::experimental_widget level="idea"\npayload: "visible warning"\n::').body);
assert.match(unsupportedBlockHtml, /loga-render-warning/, 'unknown blocks must render visible warnings');
assert.match(unsupportedBlockHtml, /Unsupported block/, 'unknown block warning must identify unsupported blocks');

const missingRequiredHtml = renderMarkdown(parseMarkdown('::metric_row\n- label: "Tasks"\n::').body);
assert.match(missingRequiredHtml, /Missing required field/, 'missing required fields must render visible validation warnings');

const missingItemsHtml = renderMarkdown(parseMarkdown('::metric_row\nregistry says section.loga-metric-row\n::').body);
assert.match(missingItemsHtml, /Missing required items/, 'repeated components with no records must render visible validation warnings');

const invalidToolbarHtml = renderContract(`::toolbar variant="floating"
  ::toolbar_zone name="actions" align="right"
  ::action_group
  - Refresh
  ::
  ::
::`).html;
assert.match(invalidToolbarHtml, /Invalid toolbar variant/, 'invalid layout variants must render warnings');
assert.match(invalidToolbarHtml, /loga-toolbar--stacked/, 'invalid toolbar variant still renders explicit stacked warning surface');

const standaloneFocusStrip = `::focus_strip

primary:
  question: "What should I care about right now?"
  answer: "Wrapper runtime is mid-execution and unblocked"

secondary:
  - "Next step: validate ownership mapping"
  - "No blockers present"

status: "in progress"

::`;

const focusParsed = parseMarkdown(standaloneFocusStrip);
const focusValidation = validateContract(standaloneFocusStrip, focusParsed);
const focusDiagnostics = renderDiagnostics(standaloneFocusStrip, focusParsed, focusValidation).join('');

assert.equal(focusValidation.fatal.length, 0, 'standalone focus_strip experiment must not produce fatal validation errors');
assert.doesNotMatch(focusDiagnostics, /Missing loga_contract|Missing ux_contract|source_truth is not sql|Missing ::toolbar|Missing toolbar zones|Missing actions block/, 'standalone focus_strip must not show full projection, toolbar, zone, or action diagnostics');
assert.match(focusDiagnostics, /<li class="pass">contract<\/li>/, 'standalone focus_strip must pass contract diagnostics as an experiment');
assert.match(focusDiagnostics, /<li class="pass">zones<\/li>/, 'standalone focus_strip must pass flow diagnostics as a component-owned experiment');

const browserRuntime = fs.readFileSync('./src/renderer/browser.js', 'utf8');
const labHtml = fs.readFileSync('./src/html/lab.html', 'utf8');
const labShellCss = fs.readFileSync('./src/renderer/lab-shell.css', 'utf8');

assert.doesNotMatch(labHtml, /<style>/, 'lab HTML must not own inline CSS');
assert.match(labHtml, /lab-shell\.css/, 'lab HTML must link host-shell CSS');
assert.doesNotMatch(labHtml, /markdown-ui-contract\.css/, 'lab HTML must not link rendered LOGA contract CSS');
assert.doesNotMatch(labHtml, /load-sample/, 'lab HTML must not expose the legacy sample flow');
assert.match(labHtml, /telemetry-scenario-select/, 'lab HTML must expose the modular telemetry scenario picker');
assert.match(labHtml, /telemetry-contract-loader\.js/, 'lab HTML must load the modular telemetry scenario loader');
assert.doesNotMatch(labShellCss, /\.loga-toolbar|\.loga-grid|\.loga-focus-strip/, 'lab-shell CSS must not own rendered LOGA surface styles');
assert.deepEqual(MARKDOWN_UI_REGISTRY.elements, elementRegistryJson.elements, 'JSON registry must expose element mappings');
assert.deepEqual(MARKDOWN_UI_REGISTRY.styles, elementRegistryJson.styles, 'JSON registry must expose style mappings');
assert.equal(elementRegistryJson.styles['.loga-toolbar--linear'].flexWrap, 'nowrap', 'linear toolbar style contract must prevent wrapping');
assert.equal(elementRegistryJson.styles['.loga-toolbar--linear'].alignItems, 'flex-end', 'linear toolbar style contract must bottom-align zones');
assert.equal(elementRegistryJson.styles['.loga-toolbar--linear'].overflowX, 'auto', 'linear toolbar style contract must scroll horizontally instead of overlapping');
assert.equal(elementRegistryJson.styles['.loga-toolbar--linear'].overflowY, 'hidden', 'linear toolbar style contract must prevent vertical overflow');
assert.equal(elementRegistryJson.styles['.loga-toolbar__group, .loga-toolbar__zone'].alignItems, 'flex-end', 'toolbar zones must bottom-align children by default');
assert.equal(elementRegistryJson.styles['.loga-toolbar--linear .loga-toolbar__zone[data-name="context"], .loga-toolbar--linear .loga-toolbar__zone[data-name="search"]'].flexDirection, 'column', 'label-bearing linear zones must stack vertically');
assert.equal(elementRegistryJson.styles['.loga-toolbar--linear .loga-toolbar__zone[data-name="navigation"], .loga-toolbar--linear .loga-toolbar__zone[data-name="filters"], .loga-toolbar--linear .loga-toolbar__zone[data-name="actions"]'].alignSelf, 'flex-end', 'control-only linear zones must sit on the bottom edge');
assert.equal(elementRegistryJson.styles['.loga-toolbar--linear .loga-toolbar__zone[data-name="search"], .loga-toolbar--linear .loga-toolbar__zone[data-align="center"]'].flex, '0 0 320px', 'linear search zone must have stable debug width');
assert.equal(elementRegistryJson.styles['.loga-toolbar--linear .loga-control--search'].width, '100%', 'linear search control must fill the flexible center zone');
assert.ok(elementRegistryJson.styles['.loga-focus-strip'], 'style registry must support focus strips');
assert.ok(elementRegistryJson.styles['.loga-metric-row'], 'style registry must support metric rows');
assert.ok(elementRegistryJson.styles['.loga-timeline'], 'style registry must support timelines');
assert.ok(elementRegistryJson.styles['.loga-decision-panel'], 'style registry must support decision panels');
assert.ok(elementRegistryJson.styles['.loga-comparison'], 'style registry must support comparison panels');
assert.ok(elementRegistryJson.styles['.loga-tree ul'], 'style registry must support navigation trees');
assert.ok(elementRegistryJson.styles['.loga-action-rail'], 'style registry must support action rails');

const elements = {};
const fetchCalls = [];
const appendedStyles = [];
const documentStub = {
  currentScript: null,
  head: {
    appendChild(node) {
      appendedStyles.push(node);
    },
  },
  createElement(tagName) {
    return {
      tagName,
      id: '',
      textContent: '',
      remove() {},
    };
  },
  getElementById(id) {
    if (id === 'markdown-ui-registry-styles') return null;
    if (!elements[id]) {
      elements[id] = {
        checked: true,
        handlers: {},
        id,
        innerHTML: '',
        textContent: '',
        value: '',
        addEventListener(event, handler) {
          this.handlers[event] = handler;
        },
        focus() {},
      };
    }
    return elements[id];
  },
};
const windowStub = {
  location: {
    protocol: 'http:',
  },
  TelemetryContractLoader: {
    async listTelemetryScenarios() {
      return [
        { scenarioKey: 'ET-001', label: 'Execution Substrate Cockpit' },
        { scenarioKey: 'ET-002', label: 'Execution Event Stream' },
      ];
    },
    async loadTelemetryScenario(scenarioKey) {
      if (scenarioKey === 'ET-002') {
        return {
          scenarioKey,
          markdown: fs.readFileSync('./fixtures/templates/telemetry/et-002.execution-event-stream.md.tmpl', 'utf8'),
          uiContract: JSON.parse(fs.readFileSync('./src/renderer/contracts/telemetry/et-002.execution-event-stream.ui.contract.json', 'utf8')),
        };
      }
      return {
        scenarioKey: 'ET-001',
        markdown: fs.readFileSync('./fixtures/templates/telemetry/et-001.execution-substrate-cockpit.md.tmpl', 'utf8'),
        uiContract: JSON.parse(fs.readFileSync('./src/renderer/contracts/telemetry/et-001.execution-substrate-cockpit.ui.contract.json', 'utf8')),
      };
    },
  },
  fetch: async (url) => {
    fetchCalls.push(url);
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      async json() {
        return elementRegistryJson;
      },
    };
  },
};
new Function('document', 'window', browserRuntime)(documentStub, windowStub);
await new Promise((resolve) => setTimeout(resolve, 0));

assert.ok(windowStub.MarkdownContractLab, 'browser runtime must expose the lab API for diagnostics');
assert.deepEqual(fetchCalls, ['./markdown-ui-elements.json'], 'browser runtime must load the JSON contract registry');
assert.doesNotMatch(browserRuntime, /const ELEMENT_REGISTRY\s*=/, 'browser runtime must not embed a substitute element registry');
assert.doesNotMatch(browserRuntime, /Load Sample/, 'browser runtime must not retain the legacy sample flow');
assert.equal(appendedStyles.length, 1, 'browser runtime must inject styles generated from the registry');
assert.match(appendedStyles[0].textContent, /\.loga-toolbar--linear\{/, 'injected registry CSS must include toolbar styles');
assert.match(appendedStyles[0].textContent, /flex-wrap:nowrap;/, 'injected registry CSS must convert camelCase to CSS declarations');
assert.match(elements['telemetry-scenario-select'].innerHTML, /ET-001/, 'browser runtime must populate modular scenarios');
assert.match(elements['markdown-input'].value, /Execution Substrate Cockpit/, 'browser runtime must load the modular telemetry scenario into the editor');
assert.match(elements['rendered-output'].innerHTML, /Execution Substrate Cockpit/, 'browser runtime must render the loaded telemetry scenario');
assert.match(elements['projection-meta'].innerHTML, /scenario: ET-001/, 'browser runtime must display the active modular scenario key');
assert.match(elements['projection-meta'].innerHTML, /ui: ai-engine-ui\/v1/, 'browser runtime must display the active UI contract schema');
assert.match(elements['telemetry-scenario-status'].textContent, /Loaded ET-001/, 'browser runtime must expose modular scenario load status');

const modularTelemetryArtifacts = [
  {
    scenario: 'ET-001',
    markdownPath: './fixtures/templates/telemetry/et-001.execution-substrate-cockpit.md.tmpl',
    contractPath: './src/renderer/contracts/telemetry/et-001.execution-substrate-cockpit.ui.contract.json',
    projectionType: 'operator.execution_substrate_cockpit',
  },
  {
    scenario: 'ET-002',
    markdownPath: './fixtures/templates/telemetry/et-002.execution-event-stream.md.tmpl',
    contractPath: './src/renderer/contracts/telemetry/et-002.execution-event-stream.ui.contract.json',
    projectionType: 'operator.execution_telemetry_event_stream',
  },
];

const scenarioManifest = JSON.parse(fs.readFileSync('./src/renderer/contracts/telemetry/scenario-manifest.json', 'utf8'));
assert.equal(scenarioManifest.version, 1, 'scenario manifest must declare a version');
assert.ok(scenarioManifest.scenarios['ET-001'], 'scenario manifest must include ET-001');
assert.ok(scenarioManifest.scenarios['ET-002'], 'scenario manifest must include ET-002');

modularTelemetryArtifacts.forEach(({ scenario, markdownPath, contractPath, projectionType }) => {
  assert.ok(fs.existsSync(markdownPath), `${scenario} markdown contract must exist`);
  assert.ok(fs.existsSync(contractPath), `${scenario} UI contract JSON must exist`);

  const parsed = parseMarkdown(fs.readFileSync(markdownPath, 'utf8'));
  const markdown = fs.readFileSync(markdownPath, 'utf8');
  const doctrineValidation = validateContract(markdown, parsed);
  assert.equal(parsed.frontmatter.projection_type, projectionType, `${scenario} markdown contract must declare the expected projection type`);
  assert.ok(parsed.blocks.includes('focus'), `${scenario} markdown contract must include the focus block`);
  assert.equal((parsed.body.match(/::([a-zA-Z0-9_]+)/) || [])[1], 'focus', `${scenario} markdown contract must start with a focus block (summary first)`);
  assert.equal(doctrineValidation.fatal.length, 0, `${scenario} markdown contract must pass telemetry doctrine validation`);

  if (/rawMetadataJson|rawMetadata|output_text|error_text/.test(markdown)) {
    assert.match(markdown, /<details>[\s\S]*?(rawMetadataJson|rawMetadata|output_text|error_text)[\s\S]*?<\/details>/i, `${scenario} raw payload bindings must stay inside details disclosure (payload third)`);
  }

  let contract;
  assert.doesNotThrow(() => { contract = JSON.parse(fs.readFileSync(contractPath, 'utf8')); }, `${scenario} UI contract JSON must be valid JSON`);
  assert.equal(contract.schema, 'ai-engine-ui/v1', `${scenario} UI contract JSON must declare schema "ai-engine-ui/v1"`);
  assert.equal(contract.scenario_key, scenario, `${scenario} UI contract JSON must declare scenario_key matching the scenario identifier`);
  assert.equal(contract.projection_type, projectionType, `${scenario} UI contract JSON must declare projection_type matching the markdown template`);
  assert.equal(contract.version, 1, `${scenario} UI contract JSON must declare a version`);
  assert.ok('elements' in contract, `${scenario} UI contract JSON must include an elements object`);
  assert.ok('styles' in contract, `${scenario} UI contract JSON must include a styles object`);
});

const telemetryDoctrineViolation = `---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.execution_telemetry_event_stream"
source_truth: "sdk"
primary_question: "What happened?"
---

::table
columns: "time_et,title"
rows_source: "eventRows"
::

::focus
question: "What happened?"
answer: "summary"
status: "ok"
::

::code
content: "{{rawMetadataJson}}"
::`;
const doctrineViolationParsed = parseMarkdown(telemetryDoctrineViolation);
const doctrineViolationValidation = validateContract(telemetryDoctrineViolation, doctrineViolationParsed);
assert.ok(doctrineViolationValidation.fatal.some((item) => item.title === 'Telemetry doctrine violation'), 'telemetry contracts that violate summary-first or payload-third must fail fast');

const metricRowWithItemsKey = `::metric_row
items:
- label: "Status"
  value: "running"
- label: "Friction"
  value: "0"
::`;
const metricRowResult = renderContract(metricRowWithItemsKey);
assert.doesNotMatch(metricRowResult.html, /contract-warning|Missing required field|loga-field-warning/, 'metric_row with items: container key must not produce required-field warnings');
assert.match(metricRowResult.html, /Status/, 'metric_row with items: container key must render the first label');
assert.match(metricRowResult.html, /Friction/, 'metric_row with items: container key must render the second label');
assert.equal((metricRowResult.html.match(/<article class="loga-metric">/g) || []).length, 2, 'metric_row with items: container key must render exactly two metric articles, not a third spurious one from the container key');

elements['markdown-input'].value = '';
elements['clear-input'].handlers.click();
assert.equal(elements['markdown-input'].value, '', 'clear button must empty the editor');

elements['telemetry-scenario-select'].value = 'ET-002';
elements['telemetry-scenario-load'].handlers.click();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.match(elements['markdown-input'].value, /Execution Event Stream/, 'scenario load button must load the selected modular scenario');
assert.match(elements['rendered-output'].innerHTML, /Execution Event Stream/, 'scenario load button must render the selected modular scenario');

const fileProtocolElements = {};
const fileProtocolDocumentStub = {
  getElementById(id) {
    if (!fileProtocolElements[id]) {
      fileProtocolElements[id] = {
        checked: true,
        handlers: {},
        id,
        innerHTML: '',
        textContent: '',
        value: '',
        addEventListener(event, handler) {
          this.handlers[event] = handler;
        },
        focus() {},
      };
    }
    return fileProtocolElements[id];
  },
};
new Function('document', 'window', browserRuntime)(fileProtocolDocumentStub, {
  location: {
    protocol: 'file:',
  },
  fetch: async () => {
    throw new Error('fetch should not be called for file protocol');
  },
});
await new Promise((resolve) => setTimeout(resolve, 0));

assert.match(fileProtocolElements.diagnostics.innerHTML, /Renderer blocked: markdown-ui-elements\.json could not be loaded/, 'registry load failure must block rendering');
assert.match(fileProtocolElements['rendered-output'].innerHTML, /fetch should not be called for file protocol/, 'registry load failure must expose the underlying loader error');

console.log('Markdown contract lab regression tests passed.');
