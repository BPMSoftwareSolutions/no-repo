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
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="#">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

export function renderDl(values) {
  const entries = Object.entries(values).filter(([, value]) => value);
  if (!entries.length) return '';
  return `<dl>${entries.map(([key, value]) => `<dt>${escapeHtml(key.replaceAll('_', ' '))}</dt><dd>${inline(value)}</dd>`).join('')}</dl>`;
}
