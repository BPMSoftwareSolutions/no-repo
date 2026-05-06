import { parseMarkdown } from './parser.js';
import { validateContract, renderDiagnostics } from './contract.js';
import { renderContractErrors, renderMarkdown, renderMeta, renderQuestionFirst } from './renderer.js';
import { escapeHtml } from './html.js';
import { SAMPLE } from './sample.js';

export function createMarkdownContractLab(documentRef = document) {
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

  return {
    render,
    elements: { input, output, meta, diagnostics, inputCount, blockCount, autoRender },
  };
}

if (typeof document !== 'undefined') {
  createMarkdownContractLab();
}
