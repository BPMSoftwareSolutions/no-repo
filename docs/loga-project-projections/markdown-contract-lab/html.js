export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function inline(value) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${escapeHtml(href)}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

export function renderDl(values) {
  const entries = Object.entries(values).filter(([, value]) => value);
  if (!entries.length) return '';
  return `<dl>${entries.map(([key, value]) => `<dt>${escapeHtml(key.replaceAll('_', ' '))}</dt><dd>${inline(value)}</dd>`).join('')}</dl>`;
}

export function renderWarning({ title, detail, code }) {
  return `
    <section class="loga-render-warning">
      <h3>${escapeHtml(title)}</h3>
      ${detail ? `<p>${escapeHtml(detail)}</p>` : ''}
      ${code ? `<pre><code>${escapeHtml(code)}</code></pre>` : ''}
    </section>
  `;
}
