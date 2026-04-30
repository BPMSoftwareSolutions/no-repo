import assert from 'node:assert/strict';
import fs from 'node:fs';

const labPath = './docs/loga-project-projections/markdown-contract-lab.html';
const html = fs.readFileSync(labPath, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

assert.ok(scriptMatch, 'markdown contract lab must include an inline script');

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

new Function('document', scriptMatch[1])(documentStub);

const input = elements['markdown-input'];
const renderButton = elements['render-now'];
const diagnostics = elements.diagnostics;
const output = elements['rendered-output'];

assert.equal(typeof renderButton.handlers.click, 'function', 'render button must register a click handler');

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

input.value = yamlZonesToolbar;
renderButton.handlers.click();

assert.doesNotMatch(
  output.innerHTML,
  /contract-error/,
  'YAML zones toolbar must not render a contract error',
);
assert.match(
  output.innerHTML,
  /<header class="loga-toolbar">/,
  'YAML zones toolbar must render the toolbar',
);
assert.match(output.innerHTML, /Roadmap/, 'YAML zones toolbar must render nav labels');
assert.match(output.innerHTML, /Search projects, tasks, evidence/, 'YAML zones toolbar must render search');
assert.match(output.innerHTML, /Needs Attention/, 'YAML zones toolbar must render filters');
assert.match(output.innerHTML, /Expand Focus/, 'YAML zones toolbar must render actions');

const supportedBlockNestedToolbar = `::toolbar
  ::toolbar_zone name="navigation" align="left"
  ::nav variant="pills"
  - label: "Roadmap"
  - label: "Promotions"
  ::
  ::
::`;

input.value = supportedBlockNestedToolbar;
renderButton.handlers.click();

assert.doesNotMatch(
  output.innerHTML,
  /contract-error/,
  'supported toolbar_zone grammar must not render a contract error',
);
assert.match(
  output.innerHTML,
  /<header class="loga-toolbar">/,
  'supported toolbar_zone grammar must render the toolbar',
);
assert.match(output.innerHTML, /Roadmap/, 'supported toolbar must render nav labels');

console.log('Markdown contract lab regression tests passed.');
