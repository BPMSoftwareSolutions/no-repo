const url = new URL('../renderer/markdown-ui-elements.json', import.meta.url);

fetch(url)
  .then(r => r.json())
  .then(inject)
  .catch(err => console.warn('registry-styles: could not load markdown-ui-elements.json', err));

function inject(registry) {
  if (document.getElementById('markdown-ui-registry-styles')) return;
  const style = document.createElement('style');
  style.id = 'markdown-ui-registry-styles';
  style.textContent = buildCss(registry.styles, registry.media);
  document.head.appendChild(style);
}

function buildCss(styles = {}, media = {}) {
  return [
    ...Object.entries(styles).map(([sel, props]) =>
      `${sel}{${Object.entries(props).map(([k, v]) => `${toProp(k)}:${v}`).join(';')}}`
    ),
    ...Object.entries(media).map(([query, rules]) =>
      `${query}{${Object.entries(rules).map(([sel, props]) =>
        `${sel}{${Object.entries(props).map(([k, v]) => `${toProp(k)}:${v}`).join(';')}}`
      ).join('')}}`
    ),
  ].join('\n');
}

function toProp(k) {
  return k.startsWith('--') ? k : k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
}
