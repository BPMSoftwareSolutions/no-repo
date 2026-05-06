import { collectBlock, parseAttrs } from './parser.js';
import { escapeHtml, inline } from './html.js';
import { renderToolbar } from './toolbar.js';
import { renderPrimitiveBlock } from './primitives.js';

export function renderMeta(frontmatter) {
  const entries = [
    ['contract', frontmatter.loga_contract],
    ['truth', frontmatter.source_truth],
  ].filter(([, value]) => value);

  return entries.map(([key, value]) => `<span>${escapeHtml(key)}: ${escapeHtml(value)}</span>`).join('');
}

export function renderQuestionFirst(parsed) {
  const question = parsed.frontmatter.primary_question || 'What should I care about right now?';
  const answer = findContractAnswer(parsed.body) || findToolbarStatus(parsed.body) || '';
  return `
    <section class="question-first">
      <p class="label">Primary question</p>
      <h2>${inline(question)}</h2>
      ${answer ? `<p class="answer">${inline(answer)}</p>` : ''}
    </section>
  `;
}

export function renderContractErrors(errors) {
  return `
    <section class="contract-errors" aria-label="Contract errors">
      ${errors.map((error) => `
        <article class="contract-error">
          <h3>${escapeHtml(error.title)}</h3>
          <p>${escapeHtml(error.detail)}</p>
          ${error.repair ? `<p><strong>Repair:</strong> ${escapeHtml(error.repair)}</p>` : ''}
          ${error.example ? `<p class="repair-label">Supported shape</p><pre><code>${escapeHtml(error.example)}</code></pre>` : ''}
        </article>
      `).join('')}
    </section>
  `;
}

export function renderMarkdown(markdown, dataContext = {}) {
  const lines = markdown.split(/\r?\n/);
  const html = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const directive = line.trim().match(/^:{2,3}([a-zA-Z0-9_]+)(?:\s+(.*))?$/);
    if (directive) {
      const collected = collectBlock(lines, index);
      html.push(renderBlock(directive[1], collected.lines, parseAttrs(directive[2]), dataContext));
      index = collected.endIndex;
      continue;
    }

    if (/^:{2,3}$/.test(line.trim())) continue;
    if (/^###\s+/.test(line)) html.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`);
    else if (/^##\s+/.test(line)) html.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`);
    else if (/^#\s+/.test(line)) html.push(`<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`);
    else if (/^>\s+/.test(line)) html.push(`<blockquote>${inline(line.replace(/^>\s+/, ''))}</blockquote>`);
    else if (!line.trim()) html.push('');
    else html.push(`<p>${inline(line)}</p>`);
  }

  return html.join('');
}

function renderBlock(name, lines, attrs, dataContext = {}) {
  const block = name.toLowerCase();
  const boundRenderBlock = (n, l, a) => renderBlock(n, l, a, dataContext);

  if (block === 'toolbar') {
    return renderToolbar({
      lines,
      attrs,
      renderBlock: boundRenderBlock,
      renderContractErrors,
    });
  }

  return renderPrimitiveBlock({
    block,
    name,
    lines,
    attrs,
    renderBlock: boundRenderBlock,
    dataContext,
  });
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
