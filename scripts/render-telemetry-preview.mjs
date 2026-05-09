import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = process.cwd();
const previewPath = `${root}/docs/design/prototypes/ai-engine-execution-telemetry-preview.html`;
const renderedPath = `${root}/docs/design/prototypes/ai-engine-execution-telemetry-preview.rendered.html`;
const browserRuntimePath = `${root}/src/renderer/browser.js`;
const registryPath = `${root}/src/renderer/markdown-ui-elements.json`;
const et001MarkdownPath = `${root}/fixtures/templates/telemetry/et-001.execution-substrate-cockpit.md.tmpl`;
const et001ContractPath = `${root}/docs/design/prototypes/ai-engine-execution-telemetry-preview.markdown-ui-contract.json`;

const browserRuntime = fs.readFileSync(browserRuntimePath, 'utf8');
const registryJson = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const previewHtml = fs.readFileSync(previewPath, 'utf8');

const elements = {};
const fetchCalls = [];

function makeElement(id) {
  return elements[id] || (elements[id] = {
    id,
    checked: true,
    handlers: {},
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    addEventListener(event, handler) {
      this.handlers[event] = handler;
    },
    focus() {},
    setAttribute() {},
    removeAttribute() {},
    click() {
      this.handlers.click?.({ target: this, preventDefault() {}, stopPropagation() {} });
    },
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
  });
}

const documentStub = {
  currentScript: null,
  head: { appendChild() {} },
  body: { appendChild() {} },
  createElement(tagName) {
    return { tagName, id: '', textContent: '', remove() {}, dataset: {} };
  },
  getElementById(id) {
    if (id === 'markdown-ui-registry-styles') return null;
    return makeElement(id);
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
};

const windowStub = {
  location: { protocol: 'http:' },
  __LOAD_TELEMETRY_PREVIEW_HTML__: true,
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
          markdown: fs.readFileSync(`${root}/fixtures/templates/telemetry/et-002.execution-event-stream.md.tmpl`, 'utf8'),
          uiContract: JSON.parse(fs.readFileSync(`${root}/src/renderer/contracts/telemetry/et-002.execution-event-stream.ui.contract.json`, 'utf8')),
        };
      }
      return {
        scenarioKey: 'ET-001',
        markdown: fs.readFileSync(et001MarkdownPath, 'utf8'),
        uiContract: JSON.parse(fs.readFileSync(et001ContractPath, 'utf8')),
      };
    },
  },
  fetch: async (url) => {
    const s = String(url);
    fetchCalls.push(s);
    if (s.includes('markdown-ui-elements.json')) {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        async json() {
          return registryJson;
        },
      };
    }
    if (s.includes('ai-engine-execution-telemetry-preview.html')) {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        async text() {
          return previewHtml;
        },
      };
    }
    throw new Error(`unexpected fetch ${s}`);
  },
  addEventListener() {},
};

new Function('document', 'window', browserRuntime)(documentStub, windowStub);
await new Promise((resolve) => setTimeout(resolve, 0));

const rendered = elements['rendered-output']?.innerHTML || '';
const bodyMatch = previewHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
const previewBody = bodyMatch ? bodyMatch[1].trim() : previewHtml;

assert.equal(rendered, previewBody, 'rendered ET-001 preview markup must match the preview body exactly');

fs.writeFileSync(renderedPath, previewHtml);

console.log(`Rendered preview saved to ${renderedPath}`);
console.log(`Fetch calls: ${fetchCalls.join(', ')}`);
