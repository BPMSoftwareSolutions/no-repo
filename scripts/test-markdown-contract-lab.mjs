import assert from 'node:assert/strict';
import fs from 'node:fs';

import { validateContract } from '../docs/loga-project-projections/markdown-contract-lab/contract.js';
import { parseMarkdown } from '../docs/loga-project-projections/markdown-contract-lab/parser.js';
import { renderMarkdown, renderQuestionFirst } from '../docs/loga-project-projections/markdown-contract-lab/renderer.js';

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
assert.doesNotMatch(linearResult.html, /<section class="loga-toolbar__zone/, 'linear toolbar zones must not render as section/card wrappers');
assert.match(linearResult.html, /<div class="loga-toolbar__zone loga-toolbar__zone--left"[^>]*data-align="left"/, 'linear left zones must render as fixed flex item divs');
assert.match(linearResult.html, /<div class="loga-toolbar__zone loga-toolbar__zone--center"[^>]*data-align="center"/, 'linear center zones must expose center alignment for flexible search');
assert.match(linearResult.html, /<div class="loga-toolbar__zone loga-toolbar__zone--right"[^>]*data-align="right"/, 'linear right zones must render as fixed flex item divs');
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

const browserRuntime = fs.readFileSync('./docs/loga-project-projections/markdown-contract-lab/browser.js', 'utf8');
const labHtml = fs.readFileSync('./docs/loga-project-projections/markdown-contract-lab.html', 'utf8');

assert.match(labHtml, /\.loga-toolbar--linear\s*{[\s\S]*?flex-wrap:\s*nowrap;/, 'linear toolbar CSS must prevent wrapping');
assert.match(labHtml, /\.loga-toolbar--linear\s*{[\s\S]*?overflow-x:\s*auto;/, 'linear toolbar CSS must scroll horizontally when needed');
assert.match(labHtml, /\.loga-toolbar--linear \.loga-toolbar__zone\[data-align="center"\]\s*{[\s\S]*?flex:\s*1 1 240px;/, 'linear center zone must be the flexible toolbar segment');
assert.match(labHtml, /\.loga-toolbar--linear \.loga-toolbar__zone\[data-align="left"\],[\s\S]*?\.loga-toolbar--linear \.loga-toolbar__zone\[data-align="right"\]\s*{[\s\S]*?flex:\s*0 0 auto;/, 'linear left and right zones must stay fixed');
assert.match(labHtml, /\.loga-toolbar--linear \.loga-control--search\s*{[\s\S]*?width:\s*100%;/, 'linear search control must fill the flexible center zone');

const elements = {};
const documentStub = {
  getElementById(id) {
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
const windowStub = {};
new Function('document', 'window', browserRuntime)(documentStub, windowStub);

assert.ok(windowStub.MarkdownContractLab, 'browser runtime must expose the lab API for diagnostics');
assert.match(elements['rendered-output'].innerHTML, /loga-toolbar--linear/, 'browser runtime must render the initial sample');
assert.match(elements['markdown-input'].value, /variant="linear"/, 'browser runtime must load the sample into the editor');

elements['markdown-input'].value = '';
elements['clear-input'].handlers.click();
assert.equal(elements['markdown-input'].value, '', 'clear button must empty the editor');

elements['load-sample'].handlers.click();
assert.match(elements['markdown-input'].value, /Projection Graph/, 'load sample button must restore sample markdown');
assert.match(elements['rendered-output'].innerHTML, /Projection Graph/, 'load sample button must render sample output');

console.log('Markdown contract lab regression tests passed.');
